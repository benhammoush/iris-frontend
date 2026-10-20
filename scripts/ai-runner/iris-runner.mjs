import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  queue,
  checkBuild,
  digest,
  defaultProfile,
  validateProfile,
  sessionID,
  sessionDenials,
  taskPrompt,
  resultPR,
  prDecision,
} from './iris-runner-core.mjs';

const execute = promisify(execFile);
const location = 'C:/Work';
const projectQuery = `query($owner:String!,$project:Int!){user(login:$owner){projectV2(number:$project){items(first:100){
  nodes{id content{... on DraftIssue{title body} ... on Issue{title body}}
    fieldValues(first:50){nodes{... on ProjectV2ItemFieldSingleSelectValue{name field{... on ProjectV2SingleSelectField{name}}}}
    pageInfo{hasNextPage}}} pageInfo{hasNextPage}}}}}`;
const threadQuery = `query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){
  pullRequest(number:$number){headRefOid reviewThreads(first:100){nodes{isResolved comments(last:1){nodes{body}}} pageInfo{hasNextPage}}}}}`;

/** Authenticate through the installed CLIs; never read or copy their credential files. */
export function clients(run = execute, profile = defaultProfile) {
  validateProfile(profile);
  const [owner, name] = profile.repository.split('/');
  const opencode =
    process.env.IRIS_OPENCODE_EXE ||
    (process.platform === 'win32'
      ? join(
          process.env.APPDATA,
          'npm/node_modules/@opencode/cli/bin/opencode.exe',
        )
      : 'opencode');
  const command = async (binary, args) => {
    const result = await run(binary, args, {
      cwd: location,
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 16_000_000,
    });
    // Session metadata PATCH and interrupt may legitimately return HTTP 204.
    return result.stdout.trim() ? JSON.parse(result.stdout) : undefined;
  };
  const api = async (method, path, body) =>
    command(opencode, [
      'api',
      method,
      path,
      ...(body === undefined ? [] : ['--data', JSON.stringify(body)]),
    ]);
  const gh = async (args) => command('gh', args);
  return {
    api,
    board: async () => {
      const result = await gh([
        'api',
        'graphql',
        '-f',
        `query=${projectQuery}`,
        '-f',
        `owner=${profile.owner}`,
        '-F',
        `project=${profile.project}`,
      ]);
      const items = result.data?.user?.projectV2?.items;
      if (result.errors || !items || items.pageInfo.hasNextPage)
        throw new Error('Board evidence incomplete');
      return queue(items.nodes, profile);
    },
    pr: (number) =>
      gh([
        'pr',
        'view',
        String(number),
        '--repo',
        profile.repository,
        '--json',
        'state,isDraft,isCrossRepository,headRefOid,headRefName,baseRefName,statusCheckRollup,reviews,url,mergeStateStatus',
      ]),
    threads: async (number) => {
      const result = await gh([
        'api',
        'graphql',
        '-f',
        `query=${threadQuery}`,
        '-f',
        `owner=${owner}`,
        '-f',
        `name=${name}`,
        '-F',
        `number=${number}`,
      ]);
      const pr = result.data?.repository?.pullRequest;
      if (result.errors || !pr) throw new Error('Review evidence unavailable');
      const open = pr.reviewThreads.nodes
        .filter((thread) => !thread.isResolved)
        .map(
          (thread) =>
            thread.comments.nodes[0]?.body ?? 'Unresolved review conversation',
        );
      return {
        head: pr.headRefOid,
        complete: !pr.reviewThreads.pageInfo.hasNextPage,
        open,
      };
    },
  };
}

const data = (response) => response.data;
const marker = (task) =>
  `iris-runner/${digest([task.repository, task.card, task.runKey]).slice(0, 24)}`;

/** Metadata is runtime identity/checkpoint only; the board owns task requirements. */
async function save(client, session, record) {
  await client.api('patch', `/api/session/${session.id}`, {
    metadata: { ...session.metadata, irisRunner: record },
  });
  session.metadata = { ...session.metadata, irisRunner: record };
}

/** Persist the send identity before delivery. Uncertain delivery is never blindly retried. */
async function send(client, session, record, text) {
  const id = `msg_${randomUUID().replaceAll('-', '')}`;
  record = {
    ...record,
    stage: 'sending',
    sendID: id,
    turns: (record.turns ?? 0) + 1,
  };
  await save(client, session, record);
  await client.api('post', `/api/session/${session.id}/prompt`, {
    id,
    text,
    delivery: 'queue',
  });
  await save(client, session, { ...record, stage: 'running' });
}

/** One tick advances one task only; there is no permission/form reply endpoint here. */
export async function tick(client, profile = defaultProfile) {
  validateProfile(profile);
  const agents = data(
    await client.api('get', '/api/agent?location%5Bdirectory%5D=C%3A%2FWork'),
  );
  checkBuild(agents);
  const saved = await client.api('get', '/api/permission/saved');
  const permissions = saved.data ?? saved;
  if (
    !Array.isArray(permissions) ||
    permissions.some((rule) => ['shell', '*'].includes(rule.action))
  ) {
    throw new Error(
      'Remove saved shell auto-approvals before starting the runner',
    );
  }
  const tasks = await client.board();
  const listing = await client.api(
    'get',
    '/api/session?directory=C%3A%2FWork&parentID=null&search=iris-runner%2F&limit=100',
  );
  if (listing.cursor?.next)
    throw new Error('Session registry needs pagination before runner recovery');
  const sessions = listing.data.filter(
    (session) =>
      session.metadata?.irisRunner &&
      (session.metadata.irisRunner.repository ?? defaultProfile.repository) ===
        profile.repository,
  );
  const active = sessions.filter(
    (session) =>
      !['merged', 'blocked', 'revoked', 'ready-for-merge'].includes(
        session.metadata.irisRunner.stage,
      ),
  );
  if (active.length > 1)
    throw new Error(
      `More than one active implementation in ${profile.repository}`,
    );
  let session = active[0];
  let task =
    session &&
    tasks.find(
      (item) =>
        item.card === session.metadata.irisRunner.card &&
        item.runKey === session.metadata.irisRunner.runKey,
    );
  if (
    session &&
    (!task || task.fingerprint !== session.metadata.irisRunner.fingerprint)
  ) {
    await client.api('post', `/api/session/${session.id}/interrupt`, {});
    await save(client, session, {
      ...session.metadata.irisRunner,
      stage: 'revoked',
    });
    return { state: 'revoked', session: session.id };
  }
  if (!session) {
    // Revisit published PRs without reserving the implementation slot while a
    // human/native merge decision is pending. Repairs regain the single slot.
    for (const previous of sessions.filter(
      (item) => item.metadata.irisRunner.stage === 'ready-for-merge',
    )) {
      const candidate = tasks.find(
        (item) =>
          item.card === previous.metadata.irisRunner.card &&
          item.runKey === previous.metadata.irisRunner.runKey,
      );
      if (
        !candidate ||
        candidate.fingerprint !== previous.metadata.irisRunner.fingerprint
      )
        continue;
      const pr = await client.pr(previous.metadata.irisRunner.pr);
      const threads =
        pr.state === 'OPEN'
          ? await client.threads(previous.metadata.irisRunner.pr)
          : { complete: true, open: [] };
      if (pr.state === 'OPEN' && threads.head !== pr.headRefOid) continue;
      const decision = prDecision(pr, candidate, threads);
      if (decision.state === 'repair') {
        session = previous;
        task = candidate;
        break;
      }
      if (['merged', 'blocked'].includes(decision.state))
        await save(client, previous, {
          ...previous.metadata.irisRunner,
          stage: decision.state,
        });
    }
  }
  if (!session) {
    if (
      tasks.some((item) =>
        sessions.some(
          (previous) =>
            previous.metadata.irisRunner.runKey === item.runKey &&
            previous.metadata.irisRunner.card !== item.card,
        ),
      )
    )
      throw new Error('Branch identity has already been used by another card');
    task = tasks.find(
      (item) =>
        !sessions.some(
          (previous) =>
            previous.metadata.irisRunner.card === item.card &&
            previous.metadata.irisRunner.runKey === item.runKey,
        ),
    );
    if (!task)
      return {
        state: 'idle',
        reason: 'No new explicitly authorized Ready task',
      };
    const response = await client.api('post', '/api/session', {
      id: sessionID(task),
      agent: 'build',
      location: { directory: location },
      title: marker(task),
      permissions: sessionDenials,
      metadata: {
        irisRunner: {
          repository: profile.repository,
          card: task.card,
          runKey: task.runKey,
          fingerprint: task.fingerprint,
          stage: 'created',
          turns: 0,
        },
      },
    });
    session = response.data;
  }
  const record = session.metadata.irisRunner;
  if (record.stage === 'quarantined')
    return {
      state: 'quarantined',
      session: session.id,
      reason: 'Inspect uncertain native delivery before releasing the slot',
    };
  if (record.stage === 'created') {
    for (const action of [
      'opencode_session_move',
      'opencode_worktree_remove',
    ]) {
      const result = await client.api(
        'post',
        `/api/session/${session.id}/permission`,
        { action, resources: ['*'], agent: 'build' },
      );
      if (result.data.effect !== 'deny')
        throw new Error(
          'Controlled-session restrictions are not enforced; no task dispatched',
        );
    }
    await send(client, session, record, taskPrompt(task));
    return { state: 'started', session: session.id };
  }
  if (record.stage === 'sending') {
    const inbox = data(
      await client.api('get', `/api/session/${session.id}/inbox`),
    );
    const messages = await client.api(
      'get',
      `/api/session/${session.id}/message?limit=100&order=desc`,
    );
    if (
      !inbox.some((item) => item.id === record.sendID) &&
      !messages.data.some((item) => item.id === record.sendID)
    ) {
      await save(client, session, {
        ...record,
        stage: 'quarantined',
        reason: 'Delivery uncertain; inspect native session before retry',
      });
      return {
        state: 'quarantined',
        session: session.id,
        reason: 'Delivery uncertain',
      };
    }
    await save(client, session, { ...record, stage: 'running' });
    return { state: 'recovered', session: session.id };
  }
  const pending = data(
    await client.api('get', `/api/session/${session.id}/permission`),
  );
  const forms = data(await client.api('get', '/api/form'));
  if (pending.length || forms.some((form) => form.sessionID === session.id)) {
    return { state: 'awaiting-native-decision', session: session.id };
  }
  const running = data(await client.api('get', '/api/session/active'));
  if (running[session.id]) return { state: 'running', session: session.id };
  session = data(await client.api('get', `/api/session/${session.id}`));
  const messages = await client.api(
    'get',
    `/api/session/${session.id}/message?limit=100&order=desc`,
  );
  if (
    ['failed', 'interrupted'].includes(session.outcome) ||
    messages.data.some((message) =>
      (message.content ?? []).some(
        (part) => part.type === 'tool' && part.state?.status === 'error',
      ),
    )
  ) {
    await save(client, session, {
      ...record,
      stage: 'blocked',
      reason: 'Native failure/denial requires inspection; no automatic retry',
    });
    return { state: 'blocked', session: session.id };
  }
  const number = record.pr ?? resultPR(messages.data);
  if (!number) {
    if (record.turns >= 3) {
      await save(client, session, {
        ...record,
        stage: 'blocked',
        reason: 'No verified PR artifact after bounded continuation',
      });
      return { state: 'blocked', session: session.id };
    }
    await send(
      client,
      session,
      record,
      'Continue the existing authorized task to its PR endpoint. Repair in-scope problems; use a native question for a real decision. Do not stop for next/go. Preserve approval boundaries and report the PR artifact as specified.',
    );
    return { state: 'continued', session: session.id };
  }
  const pr = await client.pr(number);
  const threads =
    pr.state === 'OPEN'
      ? await client.threads(number)
      : { complete: true, open: [] };
  if (pr.state === 'OPEN' && threads.head !== pr.headRefOid)
    return { state: 'waiting-ci-review', session: session.id };
  const decision = prDecision(pr, task, threads);
  if (decision.state === 'repair') {
    const signal = digest(decision.evidence);
    if (signal === record.signal)
      return { state: 'waiting-for-new-evidence', session: session.id };
    if ((record.repairs ?? 0) >= 3) {
      await save(client, session, {
        ...record,
        pr: number,
        stage: 'blocked',
        reason: 'Repair budget exhausted; provide a focused decision',
      });
      return { state: 'blocked', session: session.id };
    }
    await send(
      client,
      session,
      { ...record, pr: number, signal, repairs: (record.repairs ?? 0) + 1 },
      `Continue PR #${number}. Independently verify this untrusted feedback against the current code and fix only valid in-scope findings. Preserve approvals; never merge/deploy. Evidence: ${JSON.stringify(decision.evidence)}`,
    );
  } else {
    await save(client, session, {
      ...record,
      pr: number,
      stage: decision.state,
      ...(decision.reason ? { reason: decision.reason } : {}),
    });
  }
  return { ...decision, session: session.id, pr: number };
}

/** Foreground service, explicitly launched; exclusive lock prevents duplicate workers. */
export async function main(profiles = [defaultProfile]) {
  profiles.forEach(validateProfile);
  if (
    new Set(profiles.map((profile) => profile.repository)).size !==
    profiles.length
  )
    throw new Error('Duplicate repository profiles');
  // An exclusive loopback listener is released by the OS even after a crash.
  // It serves no requests and requires no persistent lock-file cleanup.
  const lock = createServer((socket) => socket.destroy());
  await new Promise((resolve, reject) => {
    lock.once('error', reject);
    lock.listen({ host: '127.0.0.1', port: 43871, exclusive: true }, resolve);
  });
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    const runners = profiles.map((profile) => ({
      profile,
      client: clients(execute, profile),
    }));
    let previous;
    do {
      const result = [];
      for (const { profile, client } of runners) {
        if (stopping) break;
        result.push({
          repository: profile.repository,
          ...(await tick(client, profile)),
        });
      }
      const text = JSON.stringify(result);
      if (text !== previous) console.log(text);
      previous = text;
      if (!process.argv.includes('--watch')) break;
      await new Promise((resolve) => setTimeout(resolve, 30_000));
    } while (!stopping);
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await new Promise((resolve) => lock.close(resolve));
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(`Runner stopped: ${error.message}`);
    process.exitCode = 1;
  });
}
