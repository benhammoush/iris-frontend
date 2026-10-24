/**
 * Cursor extraction for bounded historical-resource pagination.
 * @packageDocumentation
 */

import { isRecord } from './record';

/** Read the next cursor from the validated response shape. */
export function nextCursorFrom(data: unknown): string | null {
  if (!isRecord(data)) return null;
  const pageInfo = isRecord(data.pageInfo) ? data.pageInfo : {};
  const cursor = data.nextCursor ?? pageInfo.nextCursor;
  return typeof cursor === 'string' ? cursor : null;
}
