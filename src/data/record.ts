/**
 * Runtime narrowing for untrusted JSON boundary values.
 * @packageDocumentation
 */

/** Reject null and arrays when narrowing unknown JSON to an object record. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
