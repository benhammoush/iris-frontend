/**
 * Deletion transport and identity-lifecycle regression tests, without real accounts.
 * @packageDocumentation
 */
import { afterEach, expect, test, vi } from 'vitest';
import { alice, fakeDriver } from './testSupport';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
/** Create an isolated account owner pointing only at the intercepted Worker.
 * @param verified - Whether the synthetic password account has verified email.
 * @returns Session and controlled Firebase driver.
 */
async function setup(verified = false) {
  vi.stubEnv('VITE_API_BASE', 'https://iris.test');
  const { AccountSession } = await import('../../../src/auth/session');
  const session = new AccountSession(true);
  const fake = fakeDriver({ ...alice, verified });
  session.connect(fake.driver);
  return { session, ...fake };
}
/** Return a controlled private envelope.
 * @param data - Operation result to test at the runtime boundary.
 * @returns Fresh mock response.
 */
function response(data: unknown) {
  return Response.json({ data, meta: { requestId: 'test' } });
}
const accepted = {
  status: 'deleting',
  receipt: 'signed-status-receipt',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
};

test('unverified users can reauthenticate/delete, clear private state, and check status without Firebase', async () => {
  const { session, driver } = await setup();
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(response(accepted))
    .mockResolvedValueOnce(response({ status: 'deleted' }));
  vi.stubGlobal('fetch', fetchMock);
  await session.deleteAccount('password', 'never-to-worker');
  expect(driver.reauthenticate).toHaveBeenCalledWith(
    'password',
    'never-to-worker',
  );
  expect(driver.signOut).toHaveBeenCalledOnce();
  expect(session.snapshot()).toMatchObject({ user: null, deletion: accepted });
  const init = fetchMock.mock.calls[0][1];
  expect(new Headers(init?.headers).get('authorization')).toBe(
    'Bearer firebase-id-token',
  );
  expect(driver.token).toHaveBeenCalledWith('alice');
  expect(new Headers(init?.headers).get('X-Iris-Confirm-Deletion')).toBe(
    'permanent',
  );
  expect(init?.body).toBeUndefined();
  expect(JSON.stringify(init)).not.toContain('never-to-worker');
  await session.checkDeletion();
  expect(session.snapshot().deletion?.status).toBe('deleted');
  expect(
    new Headers(fetchMock.mock.calls[1][1]?.headers).get('authorization'),
  ).toBe('Deletion signed-status-receipt');
  expect(driver.token).toHaveBeenCalledOnce();
  expect(localStorage.getItem('signed-status-receipt')).toBeNull();
});
test('failed reauthentication and a UID change during reauthentication cannot submit deletion', async () => {
  const { session, driver, emit } = await setup();
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  driver.reauthenticate.mockRejectedValueOnce(new Error('wrong password'));
  await expect(session.deleteAccount('password', 'wrong')).rejects.toThrow(
    'wrong password',
  );
  driver.reauthenticate.mockImplementationOnce(() => {
    emit({ ...alice, uid: 'bob' });
    return Promise.resolve();
  });
  await expect(
    session.deleteAccount('password', 'right'),
  ).rejects.toMatchObject({ code: 'REQUEST_CANCELLED' });
  expect(fetchMock).not.toHaveBeenCalled();
  expect(session.snapshot().deletion).toBeUndefined();
});
test('Worker 401 never deadlocks sign-out and failed SDK cleanup retains the status receipt', async () => {
  const { session, driver, emit } = await setup();
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response('', { status: 401 }))
    .mockResolvedValueOnce(response(accepted));
  vi.stubGlobal('fetch', fetchMock);
  await expect(
    session.deleteAccount('password', 'password'),
  ).rejects.toMatchObject({ code: 'AUTH_INVALID' });
  await session.signIn('alice@example.test', 'password');
  driver.signOut.mockRejectedValueOnce(new Error('failed persistence cleanup'));
  await expect(
    session.deleteAccount('password', 'password'),
  ).rejects.toMatchObject({ code: 'SIGN_OUT_FAILED' });
  expect(session.snapshot()).toMatchObject({
    user: null,
    signOutFailed: true,
    deletion: accepted,
  });
  await session.signOut();
  expect(session.snapshot().signOutFailed).toBe(false);
  driver.signIn.mockImplementationOnce(() => {
    emit({ ...alice, uid: 'bob', email: 'bob@example.test' });
    return Promise.resolve();
  });
  await session.signIn('bob@example.test', 'password');
  expect(session.snapshot().user?.uid).toBe('bob');
  expect(session.snapshot().deletion).toBeUndefined();
});
test('malformed deletion/status payloads never claim completion and mutations are not retried', async () => {
  const { session } = await setup();
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(response({ status: 'deleted' }));
  vi.stubGlobal('fetch', fetchMock);
  await expect(
    session.deleteAccount('password', 'password'),
  ).rejects.toMatchObject({ code: 'CONTRACT_ERROR' });
  expect(session.snapshot().deletion).toBeUndefined();
  expect(fetchMock).toHaveBeenCalledOnce();
});
