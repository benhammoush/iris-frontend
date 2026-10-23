/** Deliver the checked target-specific frontend and verify API connectivity without refresh or private operations. @file */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const env = process.env;
const config = JSON.parse(
  readFileSync(resolve(env.CI_CONTROL_ROOT, '.github/ci-cd.json'), 'utf8'),
);
const buildEnvironment = config.buildEnvironment[env.CI_ENVIRONMENT];
for (const name of ['VITE_API_BASE', 'VITE_OPENAPI_URL'])
  assert.equal(
    env[name],
    buildEnvironment[name],
    'Target build/contract configuration drifted',
  );
const origin = `https://iris-frontend-${env.CI_ENVIRONMENT}.vercel.app`;
const { publishWeb } = await import(
  pathToFileURL(resolve(env.CI_AUTOMATION_ROOT, 'scripts/providers.mjs')).href
);
await publishWeb(env, {
  name: `iris-frontend-${env.CI_ENVIRONMENT}`,
  origin,
  buildEnvironment,
  hosting: {
    version: 3,
    routes: [
      { handle: 'filesystem' },
      { src: '/(?!api(?:/|$)).*', dest: '/index.html' },
    ],
  },
  /** Verify public API health and the selected frontend's CORS policy without provider mutations. */
  smoke: async (fetcher) => {
    for (const path of ['/health', '/ready']) {
      const response = await fetcher(`${env.VITE_API_BASE}${path}`, {
        headers: { Origin: origin },
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
    }
  },
});
