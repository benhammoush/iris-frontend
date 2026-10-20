import assert from 'node:assert/strict';
import { clients } from './iris-runner.mjs';
import { sessionDenials } from './iris-runner-core.mjs';

// Explicit integration probe only: creates an empty native session, submits no
// model prompt, replies to no decisions, and never runs a backlog task.
const client = clients();
const { data: session } = await client.api('post', '/api/session', {
  agent: 'build',
  location: { directory: 'C:/Work' },
  title: 'Iris runner native contract probe',
  permissions: sessionDenials,
  metadata: { irisRunnerProbe: true },
});
for (const action of ['opencode_session_move', 'opencode_worktree_remove']) {
  const { data } = await client.api(
    'post',
    `/api/session/${session.id}/permission`,
    {
      action,
      resources: ['*'],
      agent: 'build',
    },
  );
  assert.equal(data.effect, 'deny');
}
await client.api('patch', `/api/session/${session.id}`, {
  metadata: { irisRunnerProbe: true, verified: true },
});
const { data: recovered } = await client.api(
  'get',
  `/api/session/${session.id}`,
);
assert.equal(recovered.metadata.verified, true);
assert.deepEqual(
  (await client.api('get', `/api/session/${session.id}/inbox`)).data,
  [],
);
assert.deepEqual(
  (
    await client.api(
      'get',
      `/api/session/${session.id}/message?limit=100&order=desc`,
    )
  ).data,
  [],
);
assert.deepEqual(
  (await client.api('get', `/api/session/${session.id}/permission`)).data,
  [],
);
assert.ok(Array.isArray((await client.api('get', '/api/form')).data));
assert.equal(
  typeof (await client.api('get', '/api/session/active')).data,
  'object',
);
console.log(
  JSON.stringify({
    state: 'native-contract-verified',
    session: session.id,
    promptsSubmitted: 0,
  }),
);
