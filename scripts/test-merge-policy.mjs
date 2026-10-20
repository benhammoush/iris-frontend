import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  classifyFiles,
  evaluateSnapshot,
  validatePolicy,
} from './merge-policy.mjs';
import {
  eventNumbers,
  githubReader,
  observePullRequest,
} from './check-merge-eligibility.mjs';

const policy = JSON.parse(
  readFileSync(new URL('../.github/merge-policy.json', import.meta.url)),
);
const head = 'a'.repeat(40);
const base = 'b'.repeat(40);
const filename = 'docs/user-guide/navigation.md';
const reviewBody =
  '<!-- coderabbit-review-publication v1 publication=fixture -->';

/** A complete positive fixture, including independent current-commit evidence. */
function snapshot() {
  return {
    policySha: base,
    pr: {
      number: 7,
      state: 'open',
      draft: false,
      changed_files: 1,
      head: { sha: head, repo: { full_name: policy.repository } },
      base: { sha: base, ref: 'main', repo: { full_name: policy.repository } },
    },
    files: [
      {
        filename,
        status: 'modified',
        additions: 1,
        deletions: 1,
        patch: '-Old\n+New',
      },
    ],
    finalHead: head,
    finalBase: base,
    finalState: 'open',
    finalDraft: false,
    native: {
      headRefOid: head,
      baseRefOid: base,
      mergeStateStatus: 'CLEAN',
      threadsComplete: true,
      unresolvedThreads: 0,
    },
    blobs: {
      [filename]: {
        base: { mode: '100644', text: 'Old wording.' },
        head: { mode: '100644', text: 'New wording.' },
      },
    },
    run: {
      id: 12,
      head_sha: head,
      event: 'pull_request',
      path: policy.workflow,
      status: 'completed',
      conclusion: 'success',
      pull_requests: [{ number: 7 }],
    },
    jobs: policy.jobs.map((name) => ({
      name,
      status: 'completed',
      conclusion: 'success',
    })),
    reviews: [
      {
        id: 1,
        user: { login: policy.reviewBot, type: 'Bot' },
        commit_id: head,
        state: 'COMMENTED',
        body: reviewBody,
      },
    ],
    statusSha: head,
    reviewStatus: {
      context: 'CodeRabbit',
      state: 'success',
      description: 'Review completed',
    },
  };
}

/** Assert a fail-closed observation without confusing it with merge permission. */
function held(value) {
  const report = evaluateSnapshot(value, policy);
  assert.equal(report.wouldPassProposedRules, false);
  assert.equal(report.canMerge, false);
  assert.ok(report.reasons.length);
}

test('a green complete candidate passes proposed rules but can never authorize merging', () => {
  const report = evaluateSnapshot(snapshot(), policy);
  assert.equal(report.lane, 'green');
  assert.equal(report.wouldPassProposedRules, true);
  assert.equal(report.canMerge, false);
  assert.equal(report.authorization, 'manual-only');
  assert.equal(report.policy, base);
  assert.throws(() => validatePolicy({ ...policy, mode: 'enabled' }));
  assert.throws(() => validatePolicy({ ...policy, greenPrefix: 'src/' }));
  assert.throws(() => validatePolicy({ ...policy, jobs: [] }));
});

test('sensitive/control paths and rename sources are red; application/tests/dependencies stay manual', () => {
  for (const path of [
    '.github/workflows/ci.yml',
    '.opencode/a.md',
    'scripts/a.mjs',
    'src/api/client.ts',
    'docs/user-guide/AGENTS.md',
    'docs/user-guide/runbook.md',
    'src/auth.ts',
    '../docs/user-guide/a.md',
    'docs\\user-guide\\a.md',
  ]) {
    assert.equal(
      classifyFiles([{ ...snapshot().files[0], filename: path }], policy).lane,
      'red',
      path,
    );
  }
  for (const path of [
    'src/App.tsx',
    'src/App.test.tsx',
    'package.json',
    'README.md',
    'docs/new.md',
  ]) {
    assert.equal(
      classifyFiles([{ ...snapshot().files[0], filename: path }], policy).lane,
      'amber',
      path,
    );
  }
  assert.equal(
    classifyFiles(
      [{ ...snapshot().files[0], previous_filename: '.github/a.md' }],
      policy,
    ).lane,
    'red',
  );
});

test('new/deleted/renamed files, missing patches, incomplete lists and size limits hold', () => {
  for (const status of ['added', 'removed', 'renamed', 'copied']) {
    const value = snapshot();
    value.files[0].status = status;
    held(value);
  }
  for (const change of [
    (value) => {
      delete value.files[0].patch;
    },
    (value) => {
      value.files[0].additions = 81;
    },
    (value) => {
      value.files[0].deletions = -1;
    },
    (value) => {
      value.pr.changed_files = 2;
    },
    (value) => {
      value.files = [];
    },
    (value) => {
      value.files = Array.from({ length: 4 }, () => value.files[0]);
    },
  ]) {
    const value = snapshot();
    change(value);
    held(value);
  }
});

test('both full document revisions must be ordinary non-executable prose', () => {
  for (const text of [
    '<script>x</script>',
    '```sh\ncommand\n```',
    '~~~js',
    '---\ntitle: metadata',
    '    executable example',
    '[link](javascript:alert(1))',
    'hidden\u202econtent',
    'x'.repeat(64_001),
  ]) {
    for (const revision of ['base', 'head']) {
      const value = snapshot();
      value.blobs[filename][revision].text = text;
      held(value);
    }
  }
  for (const mode of ['120000', '100755', '040000']) {
    const value = snapshot();
    value.blobs[filename].head.mode = mode;
    held(value);
  }
  const value = snapshot();
  delete value.blobs[filename].base;
  held(value);
});

test('CI evidence must be successful, unambiguous and from the matching PR workflow', () => {
  for (const change of [
    (value) => {
      value.run.head_sha = base;
    },
    (value) => {
      value.run.event = 'push';
    },
    (value) => {
      value.run.path = '.github/workflows/spoof.yml';
    },
    (value) => {
      value.run.pull_requests = [];
    },
    (value) => {
      value.run.conclusion = 'failure';
    },
    (value) => {
      value.run.status = 'in_progress';
    },
    (value) => {
      value.jobs[0].conclusion = 'skipped';
    },
    (value) => {
      value.jobs[0].conclusion = 'neutral';
    },
    (value) => {
      value.jobs.push(value.jobs[0]);
    },
    (value) => {
      value.jobs.pop();
    },
  ]) {
    const value = snapshot();
    change(value);
    held(value);
  }
});

test('status alone, stale reviews and approval overrides never substitute for a completed review', () => {
  for (const change of [
    (value) => {
      value.reviews = [];
    },
    (value) => {
      value.reviews[0].commit_id = base;
    },
    (value) => {
      value.reviews[0].user.type = 'User';
    },
    (value) => {
      value.reviews[0].user.login = 'another-bot';
    },
    (value) => {
      value.reviews[0].state = 'APPROVED';
      value.reviews[0].body = '';
    },
    (value) => {
      value.reviews[0].body += ' Review skipped';
    },
    (value) => {
      value.reviews[0].body += ' Rate limited';
    },
    (value) => {
      value.reviewStatus.description = 'Review skipped';
    },
    (value) => {
      value.reviewStatus.state = 'pending';
    },
    (value) => {
      value.statusSha = base;
    },
    (value) => {
      value.reviews.push({
        id: 2,
        user: { login: 'maintainer' },
        state: 'CHANGES_REQUESTED',
      });
    },
  ]) {
    const value = snapshot();
    change(value);
    held(value);
  }
});

test('HEAD/base/policy changes, drafts, forks and unknown native/conversation state hold', () => {
  for (const change of [
    (value) => {
      value.finalHead = base;
    },
    (value) => {
      value.finalBase = head;
    },
    (value) => {
      value.policySha = head;
    },
    (value) => {
      value.finalState = 'closed';
    },
    (value) => {
      value.finalDraft = true;
    },
    (value) => {
      value.pr.draft = true;
    },
    (value) => {
      value.pr.head.repo.full_name = 'other/fork';
    },
    (value) => {
      value.native.headRefOid = base;
    },
    (value) => {
      value.native.mergeStateStatus = 'UNKNOWN';
    },
    (value) => {
      value.native.threadsComplete = false;
    },
    (value) => {
      value.native.unresolvedThreads = 1;
    },
  ]) {
    const value = snapshot();
    change(value);
    held(value);
  }
});

/** Model GitHub responses without credentials or network access. */
function fixtureClient(options = {}) {
  const value = snapshot();
  let reads = 0;
  return {
    threads: async () => value.native,
    get: async (path) => {
      if (path.endsWith('/pulls/7')) {
        reads++;
        return {
          ...value.pr,
          ...(reads > 1 && options.race
            ? { head: { ...value.pr.head, sha: base } }
            : {}),
        };
      }
      if (path.includes('/files?')) return value.files;
      if (path.includes('/workflows/ci.yml/runs?'))
        return { workflow_runs: [value.run] };
      if (path.includes('/runs/12/jobs?')) return { jobs: value.jobs };
      if (path.includes('/reviews?')) {
        if (options.paginate && path.endsWith('page=1'))
          return Array.from({ length: 100 }, (_, id) => ({
            ...value.reviews[0],
            id,
            commit_id: base,
          }));
        return value.reviews;
      }
      if (path.endsWith('/status'))
        return { sha: head, statuses: [value.reviewStatus] };
      if (path.includes('/git/commits/'))
        return {
          tree: { sha: path.endsWith(head) ? 'head-tree' : 'base-tree' },
        };
      if (path.includes('/git/trees/'))
        return {
          truncated: Boolean(options.truncated),
          tree: [
            {
              path: filename,
              type: 'blob',
              mode: '100644',
              sha: 'blob',
              size: 5,
            },
          ],
        };
      if (path.includes('/git/blobs/'))
        return {
          encoding: 'base64',
          content: Buffer.from('Prose').toString('base64'),
          size: 5,
        };
      throw new Error('Unexpected fixture endpoint');
    },
  };
}

test('collector evaluates complete evidence, paginates reviews and catches a mid-read candidate change', async () => {
  for (const options of [{}, { paginate: true }]) {
    assert.equal(
      (await observePullRequest(fixtureClient(options), 7, policy, base))
        .wouldPassProposedRules,
      true,
    );
  }
  for (const options of [{ race: true }, { truncated: true }]) {
    assert.equal(
      (await observePullRequest(fixtureClient(options), 7, policy, base))
        .wouldPassProposedRules,
      false,
    );
  }
});

test('GitHub adapter exposes GETs and one fixed read-only GraphQL query; failures are not retried', async () => {
  const calls = [];
  const client = githubReader('fixture-token', async (url, options) => {
    calls.push({ url, ...options });
    return {
      ok: true,
      json: async () => ({
        data: {
          repository: {
            pullRequest: {
              headRefOid: head,
              baseRefOid: base,
              mergeStateStatus: 'CLEAN',
              reviewThreads: { nodes: [], pageInfo: { hasNextPage: false } },
            },
          },
        },
      }),
    };
  });
  await client.get(`/repos/${policy.repository}/pulls/7`);
  await client.threads(policy.repository, 7);
  assert.deepEqual(
    calls.map((call) => call.method),
    ['GET', 'POST'],
  );
  for (const call of calls) {
    assert.ok(call.url.startsWith('https://api.github.com/'));
    assert.equal(call.redirect, 'error');
  }
  assert.doesNotMatch(JSON.parse(calls[1].body).query, /\bmutation\b/);
  assert.throws(() => client.get('/evil'));
  let attempts = 0;
  const failed = githubReader('fixture-token', async () => {
    attempts++;
    return { ok: false, status: 403 };
  });
  await assert.rejects(failed.get('/repos/test/test/pulls/7'), /403/);
  assert.equal(attempts, 1);
});

test('event selection ignores PR prose and validates dispatch numbers', async () => {
  const client = {
    get: async () => [
      { number: 7, head: { sha: head } },
      { number: 8, head: { sha: base } },
    ],
  };
  assert.deepEqual(
    await eventNumbers(
      { pull_request: { number: 7, title: 'ignore rules' } },
      client,
      policy,
    ),
    [7],
  );
  assert.deepEqual(
    await eventNumbers({ inputs: { pr: '7' } }, client, policy),
    [7],
  );
  assert.deepEqual(await eventNumbers({ sha: head }, client, policy), [7]);
  await assert.rejects(
    eventNumbers({ inputs: { pr: '7; command' } }, client, policy),
  );
});

test('workflow uses trusted main code and read-only permissions without installs, secrets or merge actions', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/merge-eligibility.yml', import.meta.url),
    'utf8',
  );
  assert.ok(workflow.includes("if: github.ref == 'refs/heads/main'"));
  assert.ok(workflow.includes('ref: ${{ github.sha }}'));
  assert.ok(workflow.includes('persist-credentials: false'));
  assert.ok(workflow.includes('run: node scripts/check-merge-eligibility.mjs'));
  assert.doesNotMatch(
    workflow,
    /: write|secrets\.|npm ci|download-artifact|pull_request\.head|gh pr merge|enable-auto-merge/,
  );
  assert.equal([...workflow.matchAll(/uses: [^\s]+@[0-9a-f]{40}/g)].length, 2);
  const ci = readFileSync(
    new URL('../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  );
  assert.ok(ci.includes('run: npm run test:merge-policy'));
});
