import { afterEach, expect, test, vi } from 'vitest';
import { alice, fakeDriver } from '../auth/testSupport';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
});
async function setup() {
  vi.stubEnv('VITE_API_BASE', 'https://iris.test');
  const { AccountSession } = await import('../../../src/auth/session');
  const { authenticatedRequest } =
    await import('../../../src/api/authenticated');
  const session = new AccountSession(true);
  const fake = fakeDriver(alice);
  session.connect(fake.driver);
  return { ...fake, session, request: authenticatedRequest };
}
const body = () =>
  new Response(
    JSON.stringify({
      data: { assets: [], wallets: [] },
      meta: { requestId: 'test-id' },
    }),
  );

test('private transport sends only an ID token to the configured Worker; public calls stay anonymous', async () => {
  const { session, request } = await setup();
  const fetchMock = vi.fn().mockImplementation(async () => body());
  vi.stubGlobal('fetch', fetchMock);
  await request(session, '/v3/me/watchlist');
  expect(fetchMock).toHaveBeenCalledWith(
    'https://iris.test/v3/me/watchlist',
    expect.objectContaining({
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      headers: expect.objectContaining({
        Authorization: 'Bearer firebase-id-token',
      }),
    }),
  );
  const { apiGet } = await import('../../../src/api/client');
  await apiGet('/v3/assets');
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
});

test('rejects arbitrary paths and unverified/signed-out requests without fetching', async () => {
  const { session, request, emit } = await setup();
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  for (const path of [
    'https://evil.test',
    '//evil.test',
    '/v3/me/watchlist?uid=bob',
    '/internal/refresh',
    '/v3/me/account',
  ])
    await expect(request(session, path)).rejects.toMatchObject({
      code: 'INVALID_PRIVATE_ROUTE',
    });
  emit({ ...alice, verified: false });
  await expect(request(session, '/v3/me/watchlist')).rejects.toMatchObject({
    code: 'EMAIL_VERIFICATION_REQUIRED',
  });
  emit(null);
  await expect(request(session, '/v3/me/watchlist')).rejects.toMatchObject({
    code: 'AUTH_REQUIRED',
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test('account change while a token is pending cancels before sending credentials', async () => {
  const { session, request, driver, emit } = await setup();
  let resolve: ((token: string) => void) | undefined;
  driver.token.mockImplementation(
    () =>
      new Promise<string>((done) => {
        resolve = done;
      }),
  );
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const pending = request(session, '/v3/me/watchlist');
  const rejected = expect(pending).rejects.toMatchObject({
    code: 'REQUEST_CANCELLED',
  });
  emit({ ...alice, uid: 'bob', email: 'bob@example.test' });
  resolve?.('alice-token');
  await rejected;
  expect(fetchMock).not.toHaveBeenCalled();
});

test('late response JSON after account switch never escapes to the caller', async () => {
  const { session, request, emit } = await setup();
  let resolveBody: ((data: unknown) => void) | undefined;
  const json = vi.fn(
    () =>
      new Promise((resolve) => {
        resolveBody = resolve;
      }),
  );
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json }));
  const pending = request(session, '/v3/me/watchlist');
  await vi.waitFor(() => expect(json).toHaveBeenCalled());
  const rejected = expect(pending).rejects.toMatchObject({
    code: 'REQUEST_CANCELLED',
  });
  emit(null);
  resolveBody?.({ data: { secret: 'alice-list' }, meta: { requestId: 'old' } });
  await rejected;
});

test('401 clears private identity without retrying, and sign-out failure stays locked', async () => {
  const { session, request, driver, emit } = await setup();
  driver.signOut.mockRejectedValueOnce(new Error('SDK signout failed'));
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        error: { code: 'AUTH_INVALID', message: 'raw upstream data' },
      }),
      { status: 401 },
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  await expect(request(session, '/v3/me/watchlist')).rejects.toMatchObject({
    code: 'AUTH_INVALID',
    status: 401,
    message: 'Private request could not be completed.',
  });
  expect(session.snapshot()).toMatchObject({ user: null, signOutFailed: true });
  emit(alice);
  expect(session.snapshot().user).toBeNull();
  await expect(
    session.signIn('alice@example.test', 'password'),
  ).rejects.toMatchObject({ code: 'SIGN_OUT_FAILED' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await session.signOut();
  expect(session.snapshot().user).toBeNull();
});

test('pre-aborted requests and token deadlines do not send credentials', async () => {
  const { session, request, driver } = await setup();
  const controller = new AbortController();
  controller.abort();
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  await expect(
    request(session, '/v3/me/watchlist', 'GET', { signal: controller.signal }),
  ).rejects.toMatchObject({ code: 'REQUEST_CANCELLED' });
  vi.useFakeTimers();
  driver.token.mockImplementation(() => new Promise(() => {}));
  const pending = request(session, '/v3/me/watchlist', 'GET', {
    timeoutMs: 50,
  });
  const rejected = expect(pending).rejects.toMatchObject({
    code: 'REQUEST_CANCELLED',
  });
  await vi.advanceTimersByTimeAsync(50);
  await rejected;
  expect(fetchMock).not.toHaveBeenCalled();
});

test('revoked Firebase credentials clear private identity before a Worker request', async () => {
  const { session, request, driver } = await setup();
  driver.token.mockRejectedValueOnce({
    code: 'auth/user-token-expired',
    message: 'raw SDK diagnostic',
  });
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  await expect(request(session, '/v3/me/watchlist')).rejects.toMatchObject({
    code: 'AUTH_INVALID',
    status: 401,
  });
  expect(session.snapshot().user).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('an empty or non-JSON 401 still clears private identity without reading its body', async () => {
  for (const text of ['', '<html>Unauthorized</html>']) {
    const { session, request, driver } = await setup();
    const response = new Response(text, { status: 401 });
    const json = vi.spyOn(response, 'json');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(request(session, '/v3/me/watchlist')).rejects.toMatchObject({
      code: 'AUTH_INVALID',
      status: 401,
    });
    expect(driver.signOut).toHaveBeenCalledTimes(1);
    expect(session.snapshot().user).toBeNull();
    expect(json).not.toHaveBeenCalled();
  }
});
