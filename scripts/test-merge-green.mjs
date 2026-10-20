import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { mergeGreen, requireProtection } from './merge-green.mjs';

const policy = {
  jobs: ['test-and-build', 'vertical'],
  reviewContext: 'CodeRabbit',
};
const protection = {
  enforce_admins: { enabled: true },
  allow_force_pushes: { enabled: false },
  allow_deletions: { enabled: false },
  required_conversation_resolution: { enabled: true },
  required_status_checks: {
    strict: true,
    checks: [...policy.jobs, policy.reviewContext].map((context) => ({
      context,
      app_id: 1,
    })),
  },
  required_pull_request_reviews: {
    required_approving_review_count: 1,
    dismiss_stale_reviews: true,
    require_last_push_approval: true,
  },
};

test('default off means no reads, credentials or merge calls', async () => {
  assert.deepEqual(await mergeGreen({}), { state: 'disabled' });
});

test('workflow scopes merge credentials to an environment and stops after a confirmed merge', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/merge-green.yml', import.meta.url),
    'utf8',
  );
  assert.match(workflow, /environment: iris-green-merge/);
  assert.match(workflow, /if ! out=/);
  assert.match(workflow, /break ;; esac/);
  assert.match(workflow, /exit "\$status"/);
});

test('merge tokens are ephemeral, repository-scoped and cannot administer or approve', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/merge-green.yml', import.meta.url),
    'utf8',
  );
  assert.match(workflow, /actions\/create-github-app-token@[0-9a-f]{40}/);
  assert.match(
    workflow,
    /client-id: \$\{\{ vars\.IRIS_MERGE_APP_CLIENT_ID \}\}/,
  );
  assert.match(
    workflow,
    /private-key: \$\{\{ secrets\.IRIS_MERGE_APP_PRIVATE_KEY \}\}/,
  );
  assert.match(workflow, /repositories: iris-frontend/);
  assert.match(workflow, /permission-contents: write/);
  assert.match(workflow, /permission-pull-requests: read/);
  assert.match(workflow, /permission-administration: read/);
  assert.match(
    workflow,
    /IRIS_MERGE_TOKEN: \$\{\{ steps\.merge-token\.outputs\.token \}\}/,
  );
  assert.doesNotMatch(
    workflow,
    /secrets\.IRIS_MERGE_TOKEN|skip-token-revoke|permission-(?:administration|pull-requests|workflows|secrets): write/,
  );
});

test('native protections cannot be bypassed or substituted by green reports', () => {
  requireProtection(protection, policy);
  for (const key of [
    'enforce_admins',
    'required_status_checks',
    'required_pull_request_reviews',
    'required_conversation_resolution',
  ]) {
    assert.throws(() =>
      requireProtection({ ...protection, [key]: undefined }, policy),
    );
  }
  assert.throws(() =>
    requireProtection(
      {
        ...protection,
        required_pull_request_reviews: {
          ...protection.required_pull_request_reviews,
          bypass_pull_request_allowances: { apps: [{}] },
        },
      },
      policy,
    ),
  );
});

test('zero, missing or malformed approvals and disabled last-push approval always hold', () => {
  for (const count of [0, -1, undefined, null, '1', 1.5]) {
    assert.throws(() =>
      requireProtection(
        {
          ...protection,
          required_pull_request_reviews: {
            ...protection.required_pull_request_reviews,
            required_approving_review_count: count,
          },
        },
        policy,
      ),
    );
  }
  for (const lastPush of [false, undefined, null, 'true']) {
    assert.throws(() =>
      requireProtection(
        {
          ...protection,
          required_pull_request_reviews: {
            ...protection.required_pull_request_reviews,
            require_last_push_approval: lastPush,
          },
        },
        policy,
      ),
    );
  }
  requireProtection(
    {
      ...protection,
      required_pull_request_reviews: {
        ...protection.required_pull_request_reviews,
        required_approving_review_count: 2,
      },
    },
    policy,
  );
});

test('invalid candidates and unavailable protection never reach a writer', async () => {
  let writes = 0;
  const writer = async () => {
    writes++;
  };
  await assert.rejects(mergeGreen({ enabled: 'true', number: 0, writer }));
  await assert.rejects(
    mergeGreen({
      enabled: 'true',
      number: 1,
      policy: { ...policy, repository: 'example/repo' },
      client: { get: async () => ({}) },
      writer,
    }),
  );
  assert.equal(writes, 0);
});

/** End-to-end collector fixture: no injected eligibility result. */
function greenClient(options = {}) {
  const rules = JSON.parse(
    readFileSync(new URL('../.github/merge-policy.json', import.meta.url)),
  );
  const head = 'a'.repeat(40),
    base = 'b'.repeat(40);
  const filename = options.sensitive
    ? 'scripts/control.mjs'
    : 'docs/user-guide/navigation.md';
  const pr = {
    number: 7,
    state: 'open',
    draft: false,
    changed_files: 1,
    head: { sha: head, repo: { full_name: rules.repository } },
    base: { sha: base, ref: 'main', repo: { full_name: rules.repository } },
  };
  let reads = 0;
  let protectionReads = 0;
  const client = {
    threads: async () => ({
      headRefOid: head,
      baseRefOid: base,
      mergeStateStatus: 'CLEAN',
      threadsComplete: true,
      unresolvedThreads: 0,
    }),
    get: async (path) => {
      if (path.endsWith('/protection')) {
        protectionReads++;
        return options.protectionChanged && protectionReads > 1
          ? {
              ...protection,
              required_pull_request_reviews: {
                ...protection.required_pull_request_reviews,
                require_last_push_approval: false,
              },
            }
          : protection;
      }
      if (path.endsWith('/git/ref/heads/main'))
        return { object: { sha: options.baseMoved ? head : base } };
      if (path.endsWith('/pulls/7'))
        return ++reads > 1 && options.headMoved
          ? { ...pr, head: { ...pr.head, sha: base } }
          : pr;
      if (path.includes('/files?'))
        return [
          {
            filename,
            status: 'modified',
            additions: 1,
            deletions: 1,
            patch: '-Old\n+New',
          },
        ];
      if (path.includes('/workflows/ci.yml/runs?'))
        return {
          workflow_runs: [
            {
              id: 12,
              run_attempt: 1,
              head_sha: head,
              event: 'pull_request',
              path: rules.workflow,
              status: 'completed',
              conclusion: 'success',
              pull_requests: [
                { number: 7, head: { sha: head }, base: { sha: base } },
              ],
            },
          ],
        };
      if (path.includes('/runs/12/jobs?'))
        return {
          jobs: rules.jobs.map((name) => ({
            name,
            status: 'completed',
            conclusion: 'success',
          })),
        };
      if (path.includes('/reviews?'))
        return [
          {
            id: 1,
            user: { login: rules.reviewBot, type: 'Bot' },
            commit_id: head,
            state: 'APPROVED',
            body: '<!-- coderabbit-review-publication v1 fixture -->',
          },
        ];
      if (path.includes('/comments?')) return [];
      if (path.endsWith('/status'))
        return {
          sha: head,
          statuses: [
            {
              context: 'CodeRabbit',
              state: 'success',
              description: 'Review completed',
            },
          ],
        };
      if (path.includes('/git/commits/')) return { tree: { sha: 'tree' } };
      if (path.includes('/git/trees/'))
        return {
          tree: [
            {
              path: filename,
              type: 'blob',
              mode: '100644',
              sha: 'blob',
              size: 5,
            },
          ],
          truncated: false,
        };
      if (path.includes('/git/blobs/'))
        return {
          encoding: 'base64',
          size: 5,
          content: Buffer.from('Prose').toString('base64'),
        };
      throw new Error('Unexpected fixture read');
    },
  };
  return { enabled: 'true', number: 7, policy: rules, policySha: base, client };
}

test('only a complete fresh green candidate reaches one SHA-pinned write', async () => {
  const calls = [];
  const writer = async (path, body) => {
    calls.push({ path, body });
    return { merged: true, sha: 'c'.repeat(40) };
  };
  assert.equal(
    (await mergeGreen({ ...greenClient(), writer })).state,
    'merged',
  );
  assert.deepEqual(calls, [
    {
      path: '/repos/benhammoush/iris-frontend/pulls/7/merge',
      body: { sha: 'a'.repeat(40), merge_method: 'squash' },
    },
  ]);
  calls.length = 0;
  for (const options of [{ sensitive: true }, { headMoved: true }]) {
    assert.equal(
      (await mergeGreen({ ...greenClient(options), writer })).state,
      'held',
    );
  }
  await assert.rejects(
    mergeGreen({ ...greenClient({ baseMoved: true }), writer }),
    /moved/,
  );
  assert.equal(calls.length, 0);
});

test('uncertain merge is not automatically retried', async () => {
  let writes = 0;
  await assert.rejects(
    mergeGreen({
      ...greenClient(),
      writer: async () => {
        writes++;
        throw new Error('timeout');
      },
    }),
    /timeout/,
  );
  assert.equal(writes, 1);
});

test('protection relaxed during evidence collection cannot reach a merge request', async () => {
  let writes = 0;
  await assert.rejects(
    mergeGreen({
      ...greenClient({ protectionChanged: true }),
      writer: async () => {
        writes++;
      },
    }),
    /insufficient/,
  );
  assert.equal(writes, 0);
});
