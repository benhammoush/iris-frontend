import { appendFile, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  classifyFiles,
  evaluateSnapshot,
  validatePolicy,
} from './merge-policy.mjs';

/** Read-only GitHub adapter. Fixed host, no redirects, writes or retry loops. */
export function githubReader(token, fetcher = fetch) {
  if (!token) throw new Error('GITHUB_TOKEN is required');
  const request = async (path, query) => {
    const response = await fetcher(`https://api.github.com${path}`, {
      method: query ? 'POST' : 'GET',
      redirect: 'error',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(query ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(query ? { body: JSON.stringify(query) } : {}),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok)
      throw new Error(`GitHub evidence unavailable (${response.status})`);
    const value = await response.json();
    if (value.errors) throw new Error('GraphQL evidence incomplete');
    return value;
  };
  return {
    get: (path) => {
      if (!path.startsWith('/repos/'))
        throw new Error('Unsupported read endpoint');
      return request(path);
    },
    threads: async (repository, number) => {
      const [owner, name] = repository.split('/');
      const value = await request('/graphql', {
        query: `query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){
          pullRequest(number:$number){headRefOid baseRefOid mergeStateStatus
            comments(first:100){nodes{body author{login __typename} editor{login __typename} lastEditedAt} pageInfo{hasNextPage}}
            reviewThreads(first:100){nodes{isResolved} pageInfo{hasNextPage}}}}}`,
        variables: { owner, name, number },
      });
      const pr = value.data?.repository?.pullRequest;
      return {
        headRefOid: pr?.headRefOid,
        baseRefOid: pr?.baseRefOid,
        mergeStateStatus: pr?.mergeStateStatus,
        threadsComplete: pr?.reviewThreads?.pageInfo?.hasNextPage === false,
        unresolvedThreads: pr?.reviewThreads?.nodes?.filter(
          (thread) => !thread.isResolved,
        ).length,
        walkthroughs:
          pr?.comments?.pageInfo?.hasNextPage === false
            ? pr.comments.nodes
            : [],
      };
    },
  };
}

/** Paginate bounded evidence; never interpret truncation as a successful gate. */
async function list(client, path, key) {
  const result = [];
  for (let page = 1; page <= 30; page++) {
    const data = await client.get(
      `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
    );
    const items = key ? data[key] : data;
    if (!Array.isArray(items)) throw new Error('Invalid paginated evidence');
    result.push(...items);
    if (items.length < 100) return result;
  }
  throw new Error('Evidence pagination limit exceeded');
}

/** Read regular blobs by immutable commit/tree/blob identities, never checkout PR code. */
async function readBlobs(client, root, sha, files) {
  const commit = await client.get(`${root}/git/commits/${sha}`);
  const tree = await client.get(
    `${root}/git/trees/${commit.tree.sha}?recursive=1`,
  );
  if (tree.truncated || !Array.isArray(tree.tree))
    throw new Error('Incomplete tree evidence');
  const result = {};
  for (const file of files) {
    const entry = tree.tree.find((item) => item.path === file.filename);
    if (
      entry?.mode !== '100644' ||
      entry.type !== 'blob' ||
      entry.size > 64_000
    )
      continue;
    const blob = await client.get(`${root}/git/blobs/${entry.sha}`);
    if (blob.encoding !== 'base64' || blob.size > 64_000) continue;
    result[file.filename] = {
      mode: entry.mode,
      text: new TextDecoder('utf-8', { fatal: true }).decode(
        Buffer.from(blob.content, 'base64'),
      ),
    };
  }
  return result;
}

/** Sample all mutable gates together, including the exact CI run attempt. */
async function mutableEvidence(client, root, pr, policy) {
  const [runs, reviews, statuses, native] = await Promise.all([
    list(
      client,
      `${root}/actions/workflows/ci.yml/runs?event=pull_request&head_sha=${pr.head.sha}`,
      'workflow_runs',
    ),
    list(client, `${root}/pulls/${pr.number}/reviews`),
    list(client, `${root}/commits/${pr.head.sha}/statuses`),
    client.threads(policy.repository, pr.number),
  ]);
  const run = runs
    .filter(
      (run) =>
        run.head_sha === pr.head.sha &&
        run.pull_requests?.some((item) => item.number === pr.number),
    )
    .sort((a, b) => b.id - a.id)[0];
  const jobs = run
    ? await list(
        client,
        `${root}/actions/runs/${run.id}/jobs?filter=latest`,
        'jobs',
      )
    : [];
  return {
    run,
    jobs,
    reviews,
    walkthroughs: native?.walkthroughs ?? [],
    native,
    statusSha: pr.head.sha,
    reviewStatus: statuses.find(
      (status) => status.context === policy.reviewContext,
    ),
  };
}

/** Collect relevant immutable blobs; require stable mutable evidence and candidate identities. */
export async function observePullRequest(client, number, policy, policySha) {
  validatePolicy(policy);
  if (!Number.isSafeInteger(number) || number < 1)
    throw new Error('Invalid PR number');
  const root = `/repos/${policy.repository}`;
  const pr = await client.get(`${root}/pulls/${number}`);
  const files = await list(client, `${root}/pulls/${number}/files`);
  const snapshot = { pr, files, policySha, errors: [] };
  if (classifyFiles(files, policy).lane === 'green') {
    try {
      const [first, baseBlobs, headBlobs] = await Promise.all([
        mutableEvidence(client, root, pr, policy),
        readBlobs(client, root, pr.base.sha, files),
        readBlobs(client, root, pr.head.sha, files),
      ]);
      const second = await mutableEvidence(client, root, pr, policy);
      Object.assign(snapshot, second);
      if (JSON.stringify(first) !== JSON.stringify(second))
        snapshot.errors.push('CI or review evidence changed during collection');
      snapshot.blobs = Object.fromEntries(
        files.map((file) => [
          file.filename,
          {
            base: baseBlobs[file.filename],
            head: headBlobs[file.filename],
          },
        ]),
      );
    } catch (error) {
      snapshot.errors.push(error.message);
    }
  }
  const current = await client.get(`${root}/pulls/${number}`);
  snapshot.finalHead = current.head?.sha;
  snapshot.finalBase = current.base?.sha;
  snapshot.finalState = current.state;
  snapshot.finalDraft = current.draft;
  snapshot.finalBaseRef = current.base?.ref;
  snapshot.finalHeadRepository = current.head?.repo?.full_name;
  snapshot.finalBaseRepository = current.base?.repo?.full_name;
  return evaluateSnapshot(snapshot, policy);
}

/** Resolve event numbers from trusted workflow metadata, not PR titles/bodies/labels. */
export async function eventNumbers(event, client, policy) {
  if (event.pull_request) return [event.pull_request.number];
  if (event.inputs?.pr) {
    if (!/^[1-9]\d*$/.test(event.inputs.pr))
      throw new Error('Invalid dispatch PR number');
    return [Number(event.inputs.pr)];
  }
  if (event.workflow_run?.pull_requests?.length)
    return event.workflow_run.pull_requests.map((pr) => pr.number);
  const sha =
    event.sha ?? event.check_run?.head_sha ?? event.workflow_run?.head_sha;
  if (!/^[0-9a-f]{40}$/.test(sha ?? ''))
    throw new Error('No supported event candidate');
  const open = await list(
    client,
    `/repos/${policy.repository}/pulls?state=open`,
  );
  return open.filter((pr) => pr.head?.sha === sha).map((pr) => pr.number);
}

/** Emit only generated JSON in the summary; PR text never becomes shell/Markdown. */
async function main() {
  const policy = JSON.parse(
    await readFile(
      new URL('../.github/merge-policy.json', import.meta.url),
      'utf8',
    ),
  );
  validatePolicy(policy);
  if (
    process.env.GITHUB_REPOSITORY !== policy.repository ||
    process.env.GITHUB_REF !== 'refs/heads/main'
  ) {
    throw new Error('Run only from the trusted repository main branch');
  }
  const event = JSON.parse(
    await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'),
  );
  const client = githubReader(process.env.GITHUB_TOKEN);
  const numbers = [...new Set(await eventNumbers(event, client, policy))];
  const reports = [];
  for (const number of numbers) {
    reports.push(
      await observePullRequest(client, number, policy, process.env.GITHUB_SHA),
    );
  }
  const text = JSON.stringify(
    { observedAt: new Date().toISOString(), reports },
    null,
    2,
  );
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `## Merge eligibility — dry run only\n\nNo merge authorization or action. Snapshot evidence; rerun for current state.\n\n\`\`\`json\n${text}\n\`\`\`\n`,
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(() => {
    console.error(
      'Merge eligibility observation failed; no eligibility or authorization established.',
    );
    process.exitCode = 1;
  });
}
