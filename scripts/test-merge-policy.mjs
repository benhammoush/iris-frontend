import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  classifyFiles,
  evaluateSnapshot,
  validatePolicy,
  hasReviewedWalkthrough,
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
    finalBaseRef: 'main',
    finalHeadRepository: policy.repository,
    finalBaseRepository: policy.repository,
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
      run_attempt: 1,
      head_sha: head,
      event: 'pull_request',
      path: policy.workflow,
      status: 'completed',
      conclusion: 'success',
      pull_requests: [{ number: 7, head: { sha: head }, base: { sha: base } }],
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
        state: 'APPROVED',
        body: reviewBody,
      },
    ],
    statusSha: head,
    reviewStatus: {
      creator: { login: policy.reviewBot, type: 'Bot' },
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

test('trusted policy revision is independent of PR base metadata', () => {
  const value = snapshot();
  value.policySha = 'c'.repeat(40);
  const report = evaluateSnapshot(value, policy);
  assert.equal(report.wouldPassProposedRules, true);
  assert.equal(report.policy, value.policySha);
  assert.equal(report.base, base);
  assert.equal(report.canMerge, false);
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

test('matching completion text from another creator cannot substitute for CodeRabbit', () => {
  for (const creator of [
    undefined,
    { login: 'maintainer', type: 'User' },
    { login: policy.reviewBot, type: 'User' },
    { login: 'other[bot]', type: 'Bot' },
  ]) {
    const value = snapshot();
    value.reviewStatus.creator = creator;
    held(value);
  }
});

test('a later dismissed bot review holds until a new current-head approval', () => {
  const value = snapshot();
  value.reviews.push({ ...value.reviews[0], id: 2, state: 'DISMISSED' });
  held(value);
  value.reviews.push({ ...value.reviews[0], id: 3 });
  assert.equal(evaluateSnapshot(value, policy).wouldPassProposedRules, true);
});

test('workflow path revision suffix does not replace independent identity checks', () => {
  const value = snapshot();
  value.run.path += '@refs/pull/17/merge';
  assert.equal(evaluateSnapshot(value, policy).wouldPassProposedRules, true);
  for (const path of [undefined, '.github/workflows/spoof.yml@main']) {
    value.run.path = path;
    held(value);
  }
  value.run.path = `${policy.workflow}@main`;
  value.run.head_sha = base;
  held(value);
});

test('CI evidence must be successful, unambiguous and from the matching PR workflow', () => {
  for (const change of [
    (value) => {
      value.run.head_sha = base;
    },
    (value) => {
      value.run.pull_requests[0].base.sha = head;
    },
    (value) => {
      value.run.run_attempt = undefined;
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
      value.reviews[0].state = 'COMMENTED';
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

test('a separate approving review needs a genuine completed publication on the same HEAD', () => {
  const value = snapshot();
  value.reviews[0].state = 'COMMENTED';
  value.reviews.push({
    ...value.reviews[0],
    id: 2,
    state: 'APPROVED',
    body: '',
  });
  assert.equal(evaluateSnapshot(value, policy).wouldPassProposedRules, true);
  value.reviews[1].commit_id = base;
  held(value);
  value.reviews[1].commit_id = head;
  value.reviews[1].state = 'CHANGES_REQUESTED';
  held(value);
});

test('clean automatic approvals require trusted current-head walkthrough coverage, not approval alone', () => {
  const comment = {
    author: { login: 'coderabbitai', __typename: 'Bot' },
    editor: null,
    lastEditedAt: null,
    body:
      '<!-- This is an auto-generated comment: summarize by coderabbit.ai -->\n' +
      '<!-- final_review_risk_start -->\n' +
      `<!-- final_review_risk_coverage:${JSON.stringify({ sourceCommitId: head, coveredCommitId: head, kind: 'reviewed' })} -->\n` +
      '<!-- final_review_risk_end -->',
  };
  assert.equal(hasReviewedWalkthrough([comment], head), true);
  assert.equal(
    hasReviewedWalkthrough(
      [
        {
          ...comment,
          editor: { login: 'coderabbitai', __typename: 'Bot' },
          lastEditedAt: '2026-10-20T00:00:00Z',
        },
      ],
      head,
    ),
    true,
  );
  for (const altered of [
    { ...comment, author: { ...comment.author, __typename: 'User' } },
    { ...comment, author: { login: 'another-bot', __typename: 'Bot' } },
    {
      ...comment,
      editor: { login: 'maintainer', __typename: 'User' },
      lastEditedAt: '2026-10-20T00:00:00Z',
    },
    { ...comment, editor: undefined },
    { ...comment, editor: null, lastEditedAt: '2026-10-20T00:00:00Z' },
    { ...comment, body: comment.body.replaceAll(head, base) },
    {
      ...comment,
      body: comment.body.replace(
        '"kind":"reviewed"',
        '"kind":"carried-forward"',
      ),
    },
    {
      ...comment,
      body: comment.body.replace(
        '<!-- final_review_risk_coverage:',
        '> <!-- final_review_risk_coverage:',
      ),
    },
    {
      ...comment,
      body: comment.body.replace('"sourceCommitId"', 'invalid-json'),
    },
    { ...comment, body: comment.body + '\n<!-- final_review_risk_start -->\n' },
  ])
    assert.equal(hasReviewedWalkthrough([altered], head), false);
  const value = snapshot();
  value.reviews[0].body = '';
  held(value);
  value.walkthroughs = [comment];
  assert.equal(evaluateSnapshot(value, policy).wouldPassProposedRules, true);
  value.reviews[0].state = 'COMMENTED';
  held(value);
  value.reviews[0].state = 'APPROVED';
  value.reviewStatus.state = 'pending';
  held(value);
});

test('HEAD/base/policy changes, drafts, forks and unknown native/conversation state hold', () => {
  for (const change of [
    (value) => {
      value.finalHead = base;
    },
    (value) => {
      value.finalBaseRef = 'production';
    },
    (value) => {
      value.finalHeadRepository = 'other/repo';
    },
    (value) => {
      value.finalBaseRepository = 'other/repo';
    },
    (value) => {
      value.finalBase = head;
    },
    (value) => {
      value.policySha = 'invalid';
    },
    (value) => {
      delete value.policySha;
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
  let statusReads = 0;
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
      if (path.includes('/comments?')) return [];
      if (path.includes('/statuses?')) {
        statusReads++;
        return [
          {
            ...value.reviewStatus,
            ...(options.reviewRace && statusReads > 1
              ? { state: 'pending' }
              : {}),
          },
        ];
      }
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
  for (const options of [
    { race: true },
    { truncated: true },
    { reviewRace: true },
  ]) {
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

test('GraphQL walkthrough collection preserves editor provenance and rejects truncated evidence', async () => {
  const comment = {
    body: 'fixture',
    author: { login: 'coderabbitai', __typename: 'Bot' },
    editor: { login: 'maintainer', __typename: 'User' },
    lastEditedAt: '2026-10-20T00:00:00Z',
  };
  for (const truncated of [false, true]) {
    const client = githubReader('fixture', async () => ({
      ok: true,
      json: async () => ({
        data: {
          repository: {
            pullRequest: {
              comments: {
                nodes: [comment],
                pageInfo: { hasNextPage: truncated },
              },
            },
          },
        },
      }),
    }));
    const native = await client.threads(policy.repository, 7);
    assert.deepEqual(native.walkthroughs, truncated ? [] : [comment]);
  }
});

test('retired merge observer has no workflow entry point', () => {
  assert.throws(
    () =>
      readFileSync(
        new URL('../.github/workflows/merge-eligibility.yml', import.meta.url),
      ),
    { code: 'ENOENT' },
  );
  const ci = readFileSync(
    new URL('../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  );
  assert.match(ci, /^name: CI$/m);
  assert.match(
    ci,
    /ci-cd-workflows\/\.github\/workflows\/verify-web.yml@[a-f0-9]{40}/,
  );
  const packageScripts = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ).scripts;
  assert.ok(packageScripts['ci:quality'].includes('npm run verify:fast'));
  assert.ok(
    packageScripts['verify:fast'].includes('npm run test:merge-policy'),
  );
});
