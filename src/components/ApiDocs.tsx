/**
 * Published Worker API reference embedded in the application shell.
 * @packageDocumentation
 */

import type { ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import { API_BASE, apiConfigurationError } from '../api/client';
import './ApiDocs.css';

const DEFAULT_OPENAPI_URL =
  'https://raw.githubusercontent.com/benhammoush/iris-backend/main/openapi.yaml';
export const openApiUrl =
  import.meta.env.VITE_OPENAPI_URL || DEFAULT_OPENAPI_URL;

export const apiDocsConfiguration = {
  url: openApiUrl,
  servers: [{ url: API_BASE }],
  persistAuth: false,
  telemetry: false,
  agent: { disabled: true },
  withDefaultFonts: false,
  proxyUrl: '',
  forceDarkModeState: 'light',
  hideDarkModeToggle: true,
  showDeveloperTools: 'never',
} satisfies NonNullable<
  ComponentProps<typeof ApiReferenceReact>['configuration']
>;

/** Render the published API reference inside the application shell.
 * @returns The configured API reference view.
 */
function ApiDocs() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto mb-6 flex max-w-[1460px] items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
            IRIS API
          </p>
          <h1 className="text-2xl font-semibold">
            Interactive API documentation
          </h1>
        </div>
        <Link
          className="rounded-sm border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
          to="/"
        >
          Back to Iris
        </Link>
      </div>
      <div className="mx-auto max-w-[1460px] rounded-sm bg-white p-3 shadow-xs sm:p-6">
        {apiConfigurationError ? (
          <p role="alert">
            Interactive API documentation is unavailable:{' '}
            {apiConfigurationError}
          </p>
        ) : (
          <ApiReferenceReact configuration={apiDocsConfiguration} />
        )}
      </div>
    </main>
  );
}

export default ApiDocs;
