import { isRecord } from './record';

export function nextCursorFrom(data: unknown): string | null {
  if (!isRecord(data)) return null;
  const pageInfo = isRecord(data.pageInfo) ? data.pageInfo : {};
  const cursor = data.nextCursor ?? pageInfo.nextCursor;
  return typeof cursor === 'string' ? cursor : null;
}
