/**
 * Public build-time variables available to typed browser code.
 * @packageDocumentation
 */

/// <reference types="vite/client" />

/** Public build-time variables permitted in the browser bundle. */
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_OPENAPI_URL?: string;
  readonly VITE_ENABLE_FIXTURES?: string;
}
