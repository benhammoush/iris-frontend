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

export interface ApiGetOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface ApiResult {
  // Endpoint normalizers must narrow provider-backed JSON before consuming it.
  data: unknown;
  meta: WireMeta & Record<string, unknown>;
  error?: ApiError;
}

interface ApiErrorOptions {
  code?: string;
  status?: number;
  requestId?: string;
}

function errorFields(body: unknown): Record<string, unknown> {
  return isRecord(body) && isRecord(body.error) ? body.error : {};
}

function errorCode(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number | undefined;
  readonly requestId: string | undefined;

  constructor(
    message: string,
    { code = 'REQUEST_FAILED', status, requestId }: ApiErrorOptions = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

function requestId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `iris-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseEnvelope(
  body: unknown,
  id: string,
): { data: unknown; meta: Record<string, unknown> } {
  if (isRecord(body) && body.error) {
    const fields = errorFields(body);
    throw new ApiError(String(fields.message || 'Worker request failed'), {
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

export async function apiGet(
  path: string,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: ApiGetOptions = {},
): Promise<ApiResult> {
  if (apiConfigurationError) {
    throw new ApiError(apiConfigurationError, { code: 'CONFIGURATION_ERROR' });
  }
  const id = requestId();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
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
        String(fields.message || `Worker request failed (${response.status})`),
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
    throw new ApiError(String(message || 'Unable to reach Worker'), {
      code: 'NETWORK_ERROR',
      requestId: id,
    });
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener('abort', abort);
  }
}
