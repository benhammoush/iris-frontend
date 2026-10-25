/**
 * Cursor extraction for bounded historical-resource pagination.
 * @packageDocumentation
 */

import { isRecord } from './record';

/** Read the next cursor from the validated response shape.
 * @param data - Unknown transaction page or pagination envelope.
 * @returns A supported continuation cursor, or null when none is available.
 */
export function nextCursorFrom(data: unknown): string | null {
  if (!isRecord(data)) return null;
  const pageInfo = isRecord(data.pageInfo) ? data.pageInfo : {};
  const cursor = data.nextCursor ?? pageInfo.nextCursor;
  return typeof cursor === 'string' ? cursor : null;
}
