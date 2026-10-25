/**
 * Regression coverage and controlled fixtures for origins.
 * @packageDocumentation
 */

/** Public browser-test origins: fixture defaults or the exact configured deployable target. */
export const apiOrigin = process.env.VITE_API_BASE || 'https://iris.test';
export const openapiUrl =
  process.env.VITE_OPENAPI_URL || 'https://openapi.test/openapi.yaml';
