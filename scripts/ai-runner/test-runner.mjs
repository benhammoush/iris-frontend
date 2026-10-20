import assert from 'node:assert/strict';
import test from 'node:test';
import {
  queue,
  checkBuild,
  sessionID,
  sessionDenials,
  taskPrompt,
  resultPR,
  prDecision,
  defaultProfile,
  validateProfile,
} from './iris-runner-core.mjs';
import { tick, clients } from './iris-runner.mjs';

const sha = 'a'.repeat(40);
const contract = {
  repository: 'benhammoush/iris-frontend',
  runKey: 'fixture-1',
  order: 1,
  endpoint: 'pull-request',
  scope: ['src/example.ts'],
  acceptance: ['Regression passes'],
};
function card(overrides = {}) {
  return {
    id: 'card-1',
    content: {
      title: 'Fixture',
      body: '```ai-task\n' + JSON.stringify(contract) + '\n```',
    },
    fieldValues: {
      nodes: Object.entries({
        'AI execution': 'Authorized',
        Status: 'Ready',
        Kind: 'Delivery',
        ...overrides,
      }).map(([name, value]) => ({ name: value, field: { name } })),
      pageInfo: { hasNextPage: false },
    },
  };
}
const task = queue([card()])[0];
const agent = {
  id: 'build',
  system: 'C:/Work/memory/CONTEXT.md',
  permissions: [
    { action: '*', resource: '*', effect: 'allow' },
    { action: 'shell', resource: '*', effect: 'ask' },
    { action: 'shell', resource: 'git merge *', effect: 'deny' },
    { action: 'shell', resource: 'gh pr merge *', effect: 'deny' },
    { action: 'shell', resource: 'git reset*', effect: 'deny' },
    { action: 'read', resource: '.env.local', effect: 'ask' },
  ],
};

test('Ready/Accepted alone never authorizes execution; contracts and order are explicit', () => {
  assert.equal(
    queue([card({ 'AI execution': undefined, Approval: 'Accepted' })]).length,
    0,
  );
  assert.equal(queue([card({ Status: 'Inbox' })]).length, 0);
  assert.equal(queue([card({ Kind: 'Outcome' })]).length, 0);
  assert.equal(queue([card()]).length, 1);
  const bad = card();
  bad.content.body = 'No contract';
  assert.throws(() => queue([bad]));
  assert.throws(() => queue([card(), card()]));
  assert.equal(sessionID(task), sessionID(task));
  assert.ok(taskPrompt(task).includes('Never merge/deploy'));
  assert.ok(sessionDenials.every((rule) => rule.effect === 'deny'));
});

test('unsafe native profiles fail rather than silently gaining autonomy', () => {
  checkBuild([agent]);
  assert.throws(() =>
    checkBuild([
      {
        ...agent,
        permissions: [{ action: '*', resource: '*', effect: 'allow' }],
      },
    ]),
  );
  assert.throws(() => checkBuild([]));
});

test('project profiles isolate repositories and respect each board readiness field', () => {
  const profile = {
    ...defaultProfile,
    repository: 'owner/other-repo',
    checkout: 'C:/Work/other-repo',
    project: 6,
    readyField: 'Delivery',
    jobs: ['quality'],
  };
  const item = card({ Status: 'Todo', Delivery: 'Ready' });
  item.content.body =
    '```ai-task\n' +
    JSON.stringify({ ...contract, repository: profile.repository }) +
    '\n```';
  assert.equal(queue([item]).length, 0);
  const [selected] = queue([item], profile);
  assert.equal(selected.repository, profile.repository);
  assert.ok(
    taskPrompt(selected).includes('canonical checkout: C:/Work/other-repo'),
  );
  assert.ok(
    !taskPrompt(selected).includes('canonical checkout: C:/Work/iris-frontend'),
  );
  assert.equal(queue([card()], profile).length, 0);
  assert.throws(() => validateProfile({ ...profile, jobs: [] }));
  assert.throws(() =>
    validateProfile({ ...profile, checkout: 'C:/Work/../elsewhere' }),
  );
});

function fixture(options = {}) {
  const calls = [];
  let session = options.session;
  const client = {
    board: async () => options.tasks ?? [task],
    api: async (method, path, body) => {
      calls.push({ method, path, body });
      if (path.startsWith('/api/agent?')) return { data: [agent] };
      if (path === '/api/permission/saved')
        return { data: options.saved ?? [] };
      if (path.startsWith('/api/session?'))
        return { data: session ? [session] : [], cursor: {} };
      if (path === '/api/session' && method === 'post') {
        session = { ...body };
        return { data: session };
      }
      if (method === 'patch') {
        session.metadata = body.metadata;
        return { data: session };
      }
      if (path.endsWith('/permission') && method === 'post')
        return { data: { effect: 'deny' } };
      if (path.endsWith('/permission')) return { data: options.pending ?? [] };
      if (path === '/api/form') return { data: options.forms ?? [] };
      if (path === '/api/session/active')
        return {
          data: options.running ? { [session.id]: { type: 'running' } } : {},
        };
      if (path.includes('/message?')) return { data: options.messages ?? [] };
      if (path.endsWith('/inbox')) return { data: options.inbox ?? [] };
      if (path.endsWith('/prompt')) {
        if (options.failSend) throw new Error('delivery timeout');
        return { data: { id: body.id } };
      }
      if (path.endsWith('/interrupt')) return {};
      return { data: session };
    },
    pr: async () => options.pr,
    threads: async () => options.threads,
  };
  return { client, calls, current: () => session };
}

test('start once, persist before delivery, and retain native denial rules', async () => {
  const f = fixture();
  assert.equal((await tick(f.client)).state, 'started');
  const start = f.calls.find(
    (call) => call.path === '/api/session' && call.method === 'post',
  );
  assert.deepEqual(start.body.permissions, sessionDenials);
  assert.equal(start.body.agent, 'build');
  assert.ok(
    f.calls.findIndex((call) => call.method === 'patch') <
      f.calls.findIndex((call) => call.path.endsWith('/prompt')),
  );
  assert.equal(f.current().metadata.irisRunner.stage, 'running');
});

test('uncertain delivery is not replayed after restart', async () => {
  const first = fixture({ failSend: true });
  await assert.rejects(tick(first.client), /timeout/);
  const resumed = fixture({ session: first.current() });
  assert.equal((await tick(resumed.client)).state, 'quarantined');
  assert.equal((await tick(resumed.client)).state, 'quarantined');
  assert.ok(!resumed.calls.some((call) => call.path.endsWith('/prompt')));
});

test('pending decisions pause without answering them; revoked authorization interrupts', async () => {
  const first = fixture();
  await tick(first.client);
  const waiting = fixture({ session: first.current(), pending: [{}] });
  assert.equal((await tick(waiting.client)).state, 'awaiting-native-decision');
  assert.ok(!waiting.calls.some((call) => /reply|prompt$/.test(call.path)));
  const revoked = fixture({ session: first.current(), tasks: [] });
  assert.equal((await tick(revoked.client)).state, 'revoked');
  assert.ok(revoked.calls.some((call) => call.path.endsWith('/interrupt')));
});

test('saved shell approvals stop startup; empty queue starts no model', async () => {
  await assert.rejects(
    tick(fixture({ saved: [{ action: 'shell', resource: '*' }] }).client),
  );
  const f = fixture({ tasks: [] });
  assert.equal((await tick(f.client)).state, 'idle');
  assert.ok(!f.calls.some((call) => call.method === 'post'));
});

test('artifact hints cannot come from user/tool prose or another PR branch', () => {
  const text = 'AI_RESULT: {"pr":16}';
  assert.equal(resultPR([{ type: 'user', text }]), undefined);
  assert.equal(
    resultPR([{ type: 'assistant', content: [{ type: 'text', text }] }]),
    16,
  );
  assert.throws(() =>
    prDecision({ baseRefName: 'main', headRefName: 'other' }, task, {}),
  );
});

test('CI/review repair and human merge readiness are separate states', () => {
  const pr = {
    baseRefName: 'main',
    headRefName: 'ai/fixture-1',
    isCrossRepository: false,
    isDraft: false,
    state: 'OPEN',
    headRefOid: sha,
    mergeStateStatus: 'CLEAN',
    reviews: [
      {
        author: { login: 'coderabbitai' },
        commit: { oid: sha },
        state: 'COMMENTED',
        body: '<!-- coderabbit-review-publication v1 fixture -->',
      },
    ],
    statusCheckRollup: ['test-and-build', 'vertical'].map((name) => ({
      name,
      status: 'COMPLETED',
      conclusion: 'SUCCESS',
    })),
  };
  pr.statusCheckRollup.push({ context: 'CodeRabbit', state: 'SUCCESS' });
  assert.equal(
    prDecision(pr, task, { complete: true, open: [] }).state,
    'ready-for-merge',
  );
  assert.equal(
    prDecision(pr, task, { complete: true, open: ['Fix regression'] }).state,
    'repair',
  );
  assert.equal(
    prDecision({ ...pr, reviews: [] }, task, { complete: true, open: [] })
      .state,
    'waiting-ci-review',
  );
  assert.equal(
    prDecision({ ...pr, state: 'MERGED' }, task, {}).state,
    'merged',
  );
});

test('CLI adapters use argument arrays without a shell or permission reply routes', async () => {
  const calls = [];
  const client = clients(async (binary, args, options) => {
    calls.push({ binary, args, options });
    return { stdout: '{"data":[]}' };
  });
  await client.api('post', '/api/session/example/prompt', {
    text: 'untrusted "quotes"; command',
  });
  assert.equal(calls[0].options.shell, undefined);
  assert.equal(
    JSON.parse(calls[0].args.at(-1)).text,
    'untrusted "quotes"; command',
  );
});

test('native HTTP 204 metadata/interrupt responses are successful, not JSON failures', async () => {
  const client = clients(async () => ({ stdout: '' }));
  assert.equal(
    await client.api('patch', '/api/session/example', { metadata: {} }),
    undefined,
  );
});
