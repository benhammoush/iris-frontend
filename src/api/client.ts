/**
 * Bounded browser API transport and validated response envelopes.
 * @packageDocumentation
 */

import { isRecord } from '../data/record';
import type { WireMeta } from './contracts';

const configuredApiBase = import.meta.env.VITE_API_BASE;
export const apiConfigurationError =
  import.meta.env.PROD && !configuredApiBase
    ? 'VITE_API_BASE must be set to the public Worker origin before deploying.'
    : null;
export const API_BASE = (
  configuredApiBase || (import.meta.env.PROD ? '' : 'http://localhost:8787')
).replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 10000;

/** Cancellation and deadline controls supplied by a browser resource caller. */
export interface ApiGetOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Validated resource payload paired with response metadata. */
export interface ApiResult {
  // Endpoint normalizers must narrow provider-backed JSON before consuming it.
  data: unknown;
  meta: WireMeta & Record<string, unknown>;
  error?: ApiError;
}

/** Public failure fields retained by the browser API error boundary. */
interface ApiErrorOptions {
  code?: string;
  status?: number;
  requestId?: string;
}

/** Read supported public error fields from an untrusted response body.
 * @param body - Unknown response JSON.
 * @returns The error record, or an empty record for unsupported shapes.
 */
function errorFields(body: unknown): Record<string, unknown> {
  return isRecord(body) && isRecord(body.error) ? body.error : {};
}

/** Normalize the public error code without relying on provider-specific payloads.
 * @param value - Unknown error-code field.
 * @returns The string code, or undefined for unsupported types.
 */
function errorCode(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Keep public message text without stringifying untrusted objects.
 * @param value - Unknown message field from a response or transport failure.
 * @param fallback - Controlled explanation used when no nonempty string is available.
 * @returns Displayable text without invoking object coercion.
 */
function errorMessage(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback;
}

/** Public API failure retaining supported error code, status and request correlation. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number | undefined;
  readonly requestId: string | undefined;

  /** Retain public error classification and request correlation.
   * @param message - Displayable error explanation.
   * @param options - Optional public code, HTTP status and request identifier.
   */
  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    const { code = 'REQUEST_FAILED', status, requestId } = options;
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

/** Create or normalize a request identifier for response and diagnostic correlation.
 * @returns A correlation identifier; it is not an authentication token.
 */
function requestId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `iris-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Validate the response envelope and preserve request correlation for failures.
 * @param body - Unknown response JSON.
 * @param id - Current request correlation identifier.
 * @returns Unknown resource data and object metadata for endpoint-specific normalization.
 */
function parseEnvelope(
  body: unknown,
  id: string,
): { data: unknown; meta: Record<string, unknown> } {
  if (isRecord(body) && body.error) {
    const fields = errorFields(body);
    throw new ApiError(errorMessage(fields.message, 'Worker request failed'), {
      code: errorCode(fields.code),
      requestId: id,
    });
  }
  if (isRecord(body) && 'data' in body) {
    return { data: body.data, meta: isRecord(body.meta) ? body.meta : {} };
  }
  throw new ApiError(
    'Worker response did not match the expected { data, meta } contract',
    {
      code: 'CONTRACT_ERROR',
      requestId: id,
    },
  );
}

/** Fetch and validate a Worker response with cancellation, timeout and public error semantics.
 * @param path - Resource path beneath the configured Worker origin.
 * @param options - Caller cancellation signal and deadline in milliseconds.
 * @returns A validated envelope whose resource data still needs endpoint normalization.
 */
export async function apiGet(
  path: string,
  options: ApiGetOptions = {},
): Promise<ApiResult> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  if (apiConfigurationError) {
    throw new ApiError(apiConfigurationError, { code: 'CONFIGURATION_ERROR' });
  }
  const id = requestId();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  /** Cancel the request owned by this operation without cancelling unrelated work. */
  const abort = () => {
    controller.abort();
  };
  if (signal) signal.addEventListener('abort', abort, { once: true });

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: 'application/json', 'X-Request-Id': id },
      signal: controller.signal,
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const fields = errorFields(body);
      throw new ApiError(
        errorMessage(
          fields.message,
          `Worker request failed (${response.status})`,
        ),
        {
          code:
            errorCode(fields.code) ||
            (response.status === 404 ? 'NOT_FOUND' : 'HTTP_ERROR'),
          status: response.status,
          requestId: id,
        },
      );
    }
    const parsed = parseEnvelope(body, id);
    return {
      ...parsed,
      meta: {
        ...parsed.meta,
        requestId: id,
        source: parsed.meta.source || 'live',
      },
    };
  } catch (cause: unknown) {
    if (isRecord(cause) && cause.name === 'AbortError') {
      throw new ApiError('Worker request timed out', {
        code: 'TIMEOUT',
        requestId: id,
      });
    }
    if (cause instanceof ApiError) throw cause;
    const message = isRecord(cause) ? cause.message : undefined;
    throw new ApiError(errorMessage(message, 'Unable to reach Worker'), {
      code: 'NETWORK_ERROR',
      requestId: id,
    });
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener('abort', abort);
  }
}
