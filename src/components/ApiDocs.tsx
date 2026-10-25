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
    <main className="iris-api-docs">
      <div className="iris-api-docs-header">
        <div>
          <p className="iris-api-docs-eyebrow">IRIS API</p>
          <h1>Interactive API documentation</h1>
        </div>
        <Link className="iris-api-docs-back" to="/">
          Back to Iris
        </Link>
      </div>
      <div className="iris-api-docs-reference">
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
