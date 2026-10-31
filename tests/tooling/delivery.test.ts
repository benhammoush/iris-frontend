/**
 * Regression coverage and controlled fixtures for delivery.
 * @packageDocumentation
 */

// @vitest-environment node
/** Consumer contracts; executable release-rejection tests live with the pinned shared guards. */
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import config from '../../.github/ci-cd.json';
import packageJson from '../../package.json';

const workflow = readFileSync(
  new URL('../../.github/workflows/verify-and-deploy-dev.yml', import.meta.url),
  'utf8',
);
const production = readFileSync(
  new URL(
    '../../.github/workflows/verify-and-deploy-prod.yml',
    import.meta.url,
  ),
  'utf8',
);
const { scripts } = packageJson;
const pr = readFileSync(
  new URL('../../.github/workflows/verify-pr.yml', import.meta.url),
  'utf8',
);
const browsers = readFileSync(
  new URL('../../playwright.config.ts', import.meta.url),
  'utf8',
);

describe('versioned delivery consumer', () => {
  it('enables accounts with matching public Firebase configuration only in dev', () => {
    const { dev, production } = config.buildEnvironment;
    expect(dev.VITE_ENABLE_ACCOUNTS).toBe('true');
    expect(dev.VITE_FIREBASE_PROJECT_ID).toBe('iris-watchlists-dev-v2');
    expect(dev.VITE_FIREBASE_AUTH_DOMAIN).toBe(
      `${dev.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    );
    expect(dev.VITE_FIREBASE_APP_ID).toBe(
      '1:568005945790:web:436ac652377731e44cf1ef',
    );
    // Intentionally public Firebase browser identification key, not an admin secret.
    // Never substitute a service-account credential; API/auth restrictions still apply.
    expect(dev.VITE_FIREBASE_API_KEY).toMatch(/^AIza[\w-]{35}$/);
    expect(production).not.toHaveProperty('VITE_ENABLE_ACCOUNTS');
    expect(
      Object.keys(production).filter((key) => key.startsWith('VITE_FIREBASE_')),
    ).toEqual([]);
    const publicInputs = new Set([
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_APP_ID',
    ]);
    for (const values of Object.values(config.buildEnvironment)) {
      expect(values.VITE_ENABLE_FIXTURES).toBe('false');
      for (const key of Object.keys(values)) {
        if (key.includes('FIREBASE')) expect(publicInputs.has(key)).toBe(true);
        expect(key).not.toMatch(/PRIVATE_KEY|CLIENT_EMAIL|RECEIPT|PASSWORD/);
      }
    }
  });
  it.each(['dev', 'production'] as const)(
    'uses the checked-in OpenAPI URL for %s delivery even with a missing or stale GitHub variable',
    (target) => {
      expect(config.deploymentVariables).not.toContain('VITE_OPENAPI_URL');
      const root = mkdtempSync(join(tmpdir(), 'iris-delivery-test-'));
      try {
        mkdirSync(join(root, 'scripts'));
        writeFileSync(
          join(root, 'scripts/providers.mjs'),
          'export async function publishWeb(env, settings) { console.log(JSON.stringify(settings.buildEnvironment)); }',
        );
        for (const value of [
          undefined,
          'https://example.test/old/openapi.yaml',
        ]) {
          const env: NodeJS.ProcessEnv = {
            ...process.env,
            CI_CONTROL_ROOT: fileURLToPath(new URL('../../', import.meta.url)),
            CI_AUTOMATION_ROOT: root,
            CI_ENVIRONMENT: target,
            VITE_API_BASE: config.buildEnvironment[target].VITE_API_BASE,
          };
          delete env.VITE_OPENAPI_URL;
          if (value !== undefined) env.VITE_OPENAPI_URL = value;
          const result = spawnSync(
            process.execPath,
            [
              fileURLToPath(
                new URL('../../scripts/ci-deploy.mjs', import.meta.url),
              ),
            ],
            { env, encoding: 'utf8' },
          );
          expect(result.stderr).toBe('');
          expect(result.status).toBe(0);
          expect(JSON.parse(result.stdout)).toEqual(
            config.buildEnvironment[target],
          );
          env.VITE_API_BASE = 'https://wrong-environment.test';
          const drifted = spawnSync(
            process.execPath,
            [
              fileURLToPath(
                new URL('../../scripts/ci-deploy.mjs', import.meta.url),
              ),
            ],
            { env, encoding: 'utf8' },
          );
          expect(drifted.status).not.toBe(0);
          expect(drifted.stderr).toContain(
            'Target build/contract configuration drifted',
          );
          expect(drifted.stdout).toBe('');
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
  it('uses one immutable shared version for verification and deployment in both entry points', () => {
    expect(config.automationSha).toMatch(/^[a-f0-9]{40}$/);
    for (const file of [workflow, production]) {
      expect(file).toContain(`verify-web.yml@${config.automationSha}`);
      expect(file).toContain(`deploy-web.yml@${config.automationSha}`);
      expect(file).not.toContain('secrets: inherit');
    }
  });
  it('keeps automatic dev main-only and production separate, manual and dependent on release verification', () => {
    expect(config.deploymentVariables).not.toContain('DEPLOY_ENABLED');
    expect(pr).toContain('pull_request:');
    expect(pr).not.toContain('secrets.');
    expect(workflow).not.toContain('pull_request:');
    expect(workflow).toMatch(/branches:\s+- main/);
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain('needs: verify');
    expect(workflow).toContain('environment: dev');
    expect(production).toContain('workflow_dispatch:');
    expect(production).not.toMatch(/^ {2}(push|pull_request):/m);
    expect(production).toContain('source_sha: ${{ inputs.sha }}');
    expect(production).toContain('needs: verify_release');
    expect(production).toContain('environment: production');
  });
  it('retains fixture, vertical, browser and production-build checks without rebuilding at deployment', () => {
    expect(config.integration).toBe(true);
    expect(scripts['ci:integration']).toMatch(/^npm run test:contracts && /);
    expect(scripts['test:contracts']).toBe(
      'node --test tests/integration/contracts.test.mjs',
    );
    expect(scripts['ci:integration']).toContain('npm run test:e2e');
    expect(scripts['ci:integration']).toContain('npm run test:vertical');
    expect(scripts['ci:quality']).toBe('npm run check');
    expect(scripts.check).toContain('npm run build');
    expect(scripts['ci:browser']).toContain('playwright.release.config.ts');
    for (const engine of ['chromium', 'firefox', 'webkit'])
      expect(browsers).toContain(`name: '${engine}'`);
    expect(browsers).toContain('retries: 0');
    expect(browsers).toContain('actionTimeout: 5_000');
    expect(browsers).toContain('trace:');
    const adapter = readFileSync(
      new URL('../../scripts/ci-deploy.mjs', import.meta.url),
      'utf8',
    );
    expect(adapter).not.toContain('vercel deploy');
    expect(adapter).toContain('publishWeb');
    expect(adapter).toContain('access-control-allow-origin');
  });
  it('uses the canonical Verify gate with the approved Worker/OpenAPI compatibility pins', () => {
    expect(config.legacyChecks).toEqual([]);
    expect(pr).toMatch(
      /verify_result:\s+(?:#[^\n]*\s+)?name: Verify\s+needs: verify\s+if: always\(\)/,
    );
    expect(pr).toContain('test "$VERIFY_RESULT" = success');
    expect(pr).toContain('VERIFY_RESULT: ${{ needs.verify.result }}');
    expect(workflow).not.toMatch(/legacy_\d+:/);
    expect(config.workerRepository).toBe('benhammoush/iris-backend');
    expect(config.workerSha).toBe('e30bc7de1e770f4fca92ba996ecbb437436812e2');
    for (const target of ['dev', 'production'] as const) {
      const values = config.buildEnvironment[target];
      expect(values.VITE_API_BASE).toBe(
        `https://iris-backend-${target}.benhxm.workers.dev`,
      );
      expect(values.VITE_OPENAPI_URL).toContain(
        `/${config.workerSha}/openapi.yaml`,
      );
      expect(values.VITE_ENABLE_FIXTURES).toBe('false');
    }
  });
});
