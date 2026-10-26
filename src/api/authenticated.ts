/**
 * Private Worker requests bound to the captured account session.
 * @packageDocumentation
 */

import {
  API_BASE,
  ApiError,
  type ApiGetOptions,
  type ApiResult,
} from './client';
import type { AccountSession } from '../auth/session';
import { isRecord } from '../data/record';

/** This client never accepts arbitrary destinations, cookies or provider tokens.
 * @param session - Account session whose captured identity scopes the whole request.
 * @param path - Allowlisted private watchlist route beneath the configured Worker origin.
 * @param method - Supported private read or mutation method.
 * @param options - Caller cancellation signal and deadline in milliseconds.
 * @returns A private response only while its captured account identity remains current.
 */
export async function authenticatedRequest(
  session: AccountSession,
  path: string,
  method: 'GET' | 'PUT' | 'DELETE' = 'GET',
  options: ApiGetOptions = {},
): Promise<ApiResult> {
  return privateRequest(session, path, method, options);
}

/** Read deletion status without Firebase authentication; never retry a mutation.
 * @param receipt - In-memory status-only capability returned by this Worker.
 * @param options - Cancellation and bounded request deadline.
 * @returns Validated private envelope for the scoped deletion lifecycle.
 */
export async function deletionStatusRequest(
  receipt: string,
  options: ApiGetOptions = {},
) {
  return privateRequest(
    null,
    '/v3/me/account/deletion',
    'GET',
    options,
    receipt,
  );
}

/** Share strict Worker transport rules for identity-bound calls and status-only receipts.
 * @param session - Current identity owner, absent only for receipt status.
 * @param path - Allowlisted private endpoint.
 * @param method - Allowlisted private operation.
 * @param options - Caller cancellation and deadline.
 * @param receipt - Optional status-only capability, never accepted for another route.
 * @returns A current private response envelope.
 */
async function privateRequest(
  session: AccountSession | null,
  path: string,
  method: 'GET' | 'PUT' | 'DELETE',
  options: ApiGetOptions,
  receipt?: string,
): Promise<ApiResult> {
  const { signal, timeoutMs = 10000 } = options;
  const list = path === '/v3/me/watchlist';
  const deleting =
    path === '/v3/me/account' && method === 'DELETE' && !!session;
  const polling =
    path === '/v3/me/account/deletion' &&
    method === 'GET' &&
    !session &&
    !!receipt &&
    receipt.length <= 2048;
  if (!['GET', 'PUT', 'DELETE'].includes(method))
    throw new ApiError('Unsupported private method.', {
      code: 'INVALID_PRIVATE_ROUTE',
    });
  if (
    !deleting &&
    !polling &&
    (!list || method !== 'GET') &&
    !(
      method !== 'GET' &&
      /^\/v3\/me\/watchlist\/(asset|wallet)\/[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(
        path,
      )
    )
  )
    throw new ApiError('Unsupported private request.', {
      code: 'INVALID_PRIVATE_ROUTE',
    });
  let base: URL;
  try {
    base = new URL(API_BASE);
  } catch {
    throw new ApiError('Private API origin is invalid.', {
      code: 'CONFIGURATION_ERROR',
    });
  }
  if (
    (base.protocol !== 'https:' &&
      !(
        import.meta.env.DEV &&
        base.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
      )) ||
    base.username ||
    base.password ||
    base.pathname !== '/' ||
    base.search ||
    base.hash
  )
    throw new ApiError('Private API origin is invalid.', {
      code: 'CONFIGURATION_ERROR',
    });
  const identity = session
    ? session.capture(!deleting)
    : {
        signal: new AbortController().signal,
        /** Receipt status is independent of Firebase sign-out; caller cancellation still applies.
         * @returns True while the caller owns this request.
         */
        isCurrent: () => true,
        /** Supply only the in-memory receipt to the fixed status endpoint.
         * @returns The receipt capability, never a Firebase token.
         */
        token: () => Promise.resolve(receipt ?? ''),
      };
  const controller = new AbortController();
  /** Cancel the request owned by this operation without cancelling unrelated work. */
  const abort = () => {
    controller.abort();
  };
  identity.signal.addEventListener('abort', abort, { once: true });
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted || identity.signal.aborted) controller.abort();
  const timeout = setTimeout(abort, timeoutMs);
  let rejectOnAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    rejectOnAbort = () =>
      reject(
        new ApiError('Private request cancelled.', {
          code: 'REQUEST_CANCELLED',
        }),
      );
    controller.signal.addEventListener('abort', rejectOnAbort, { once: true });
  });
  try {
    if (controller.signal.aborted)
      throw new ApiError('Private request cancelled.', {
        code: 'REQUEST_CANCELLED',
      });
    const token = await Promise.race([identity.token(), aborted]);
    if (!identity.isCurrent() || controller.signal.aborted)
      throw new ApiError('Account changed.', { code: 'REQUEST_CANCELLED' });
    const response = await fetch(`${base.origin}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `${polling ? 'Deletion' : 'Bearer'} ${token}`,
        'X-Request-Id': crypto.randomUUID(),
        ...(deleting ? { 'X-Iris-Confirm-Deletion': 'permanent' } : {}),
      },
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!identity.isCurrent() || controller.signal.aborted)
      throw new ApiError('Account changed.', { code: 'REQUEST_CANCELLED' });
    if (response.status === 401) {
      if (polling)
        throw new ApiError('Deletion receipt is invalid or expired.', {
          code: 'DELETION_RECEIPT_INVALID',
          status: 401,
        });
      // A proxy/edge can return an empty 401; invalidation cannot depend on JSON.
      await session?.signOut().catch(() => {});
      throw new ApiError('Private request could not be completed.', {
        code: 'AUTH_INVALID',
        status: 401,
      });
    }
    const body: unknown = await Promise.race([response.json(), aborted]);
    if (!identity.isCurrent() || controller.signal.aborted)
      throw new ApiError('Account changed.', { code: 'REQUEST_CANCELLED' });
    if (!response.ok) {
      const code =
        isRecord(body) &&
        isRecord(body.error) &&
        typeof body.error.code === 'string'
          ? body.error.code
          : 'PRIVATE_REQUEST_FAILED';
      throw new ApiError('Private request could not be completed.', {
        code,
        status: response.status,
      });
    }
    if (
      !isRecord(body) ||
      !('data' in body) ||
      !isRecord(body.meta) ||
      typeof body.meta.requestId !== 'string'
    )
      throw new ApiError('Invalid private response.', {
        code: 'CONTRACT_ERROR',
      });
    return {
      data: body.data,
      meta: { ...body.meta, requestId: body.meta.requestId },
    };
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    if (
      identity.isCurrent() &&
      isRecord(cause) &&
      [
        'auth/user-token-expired',
        'auth/user-disabled',
        'auth/invalid-user-token',
        'auth/user-not-found',
      ].includes(String(cause.code))
    ) {
      await session?.signOut().catch(() => {});
      throw new ApiError('Sign in again to continue.', {
        code: 'AUTH_INVALID',
        status: 401,
      });
    }
    if (controller.signal.aborted || !identity.isCurrent())
      throw new ApiError('Private request cancelled.', {
        code: 'REQUEST_CANCELLED',
      });
    throw new ApiError('Private request is unavailable.', {
      code: 'PRIVATE_REQUEST_FAILED',
    });
  } finally {
    clearTimeout(timeout);
    identity.signal.removeEventListener('abort', abort);
    signal?.removeEventListener('abort', abort);
    if (rejectOnAbort)
      controller.signal.removeEventListener('abort', rejectOnAbort);
  }
}
