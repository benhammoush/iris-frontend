import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  githubReader,
  observePullRequest,
} from './check-merge-eligibility.mjs';

/** Require native enforcement as well as the advisory evidence policy. */
export function requireProtection(protection, policy) {
  const reviews = protection.required_pull_request_reviews;
  const checks = protection.required_status_checks;
  if (
    protection.enforce_admins?.enabled !== true ||
    protection.allow_force_pushes?.enabled !== false ||
    protection.allow_deletions?.enabled !== false ||
    protection.required_conversation_resolution?.enabled !== true ||
    checks?.strict !== true ||
    !policy.jobs.every((name) =>
      checks.checks?.some(
        (check) => check.context === name && check.app_id > 0,
      ),
    ) ||
    !checks.checks?.some(
      (check) => check.context === policy.reviewContext && check.app_id > 0,
    ) ||
    reviews?.dismiss_stale_reviews !== true ||
    !Number.isSafeInteger(reviews?.required_approving_review_count) ||
    reviews.required_approving_review_count < 1 ||
    reviews.require_last_push_approval !== true ||
    Object.values(reviews.bypass_pull_request_allowances ?? {}).some(
      (actors) => actors.length,
    )
  ) {
    throw new Error(
      'Native branch protection is missing or insufficient; never bypass it',
    );
  }
}

/** Never accept a cached artifact or a caller-supplied positive classification. */
export async function mergeGreen({
  enabled,
  client,
  writer,
  number,
  policy,
  policySha,
}) {
  if (enabled !== 'true') return { state: 'disabled' };
  if (!Number.isSafeInteger(number) || number < 1)
    throw new Error('Invalid PR');
  const root = `/repos/${policy.repository}`;
  const protection = await client.get(`${root}/branches/main/protection`);
  requireProtection(protection, policy);
  const report = await observePullRequest(client, number, policy, policySha);
  if (report.lane !== 'green' || !report.wouldPassProposedRules)
    return { state: 'held', report };
  requireProtection(
    await client.get(`${root}/branches/main/protection`),
    policy,
  );
  const tip = await client.get(`${root}/git/ref/heads/main`);
  if (tip.object?.sha !== policySha || report.base !== policySha)
    throw new Error('Trusted policy/base has moved; rerun from current main');
  // A head change is rejected atomically by GitHub; native protections still apply.
  // This is a one-shot request, never a standing auto-merge grant for future heads.
  const result = await writer(`${root}/pulls/${number}/merge`, {
    sha: report.head,
    merge_method: 'squash',
  });
  if (result.merged !== true || !/^[0-9a-f]{40}$/.test(result.sha ?? ''))
    throw new Error('Merge not confirmed; inspect GitHub before any retry');
  return { state: 'merged', pr: number, head: report.head, commit: result.sha };
}

async function main() {
  if (process.env.IRIS_GREEN_MERGE_ENABLED !== 'true') {
    console.log('{"state":"disabled"}');
    return;
  }
  if (
    process.env.GITHUB_REPOSITORY !== 'benhammoush/iris-frontend' ||
    process.env.GITHUB_REF !== 'refs/heads/main'
  )
    throw new Error('Trusted main only');
  // A dedicated non-bypass installation token is required: GITHUB_TOKEN merges
  // suppress downstream workflow triggers, including this repo's main CI/deploy.
  const token = process.env.IRIS_MERGE_TOKEN;
  if (!token) throw new Error('Dedicated merge token unavailable');
  const policy = JSON.parse(
    await readFile(
      new URL('../.github/merge-policy.json', import.meta.url),
      'utf8',
    ),
  );
  const writer = async (path, body) => {
    const response = await fetch(`https://api.github.com${path}`, {
      method: 'PUT',
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok)
      throw new Error(
        `Merge rejected/uncertain (${response.status}); no retry`,
      );
    return response.json();
  };
  console.log(
    JSON.stringify(
      await mergeGreen({
        enabled: process.env.IRIS_GREEN_MERGE_ENABLED,
        client: githubReader(token),
        writer,
        number: Number(process.env.IRIS_PR),
        policy,
        policySha: process.env.GITHUB_SHA,
      }),
    ),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
