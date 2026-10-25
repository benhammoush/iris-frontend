/**
 * Runtime narrowing for untrusted JSON boundary values.
 * @packageDocumentation
 */

/** Reject null and arrays when narrowing unknown JSON to an object record.
 * @param value - Unknown boundary value.
 * @returns Whether the value is a non-null, non-array object record.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
