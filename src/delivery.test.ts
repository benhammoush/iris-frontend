// @vitest-environment node
/** Consumer contracts; executable release-rejection tests live with the pinned shared guards. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  new URL('../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);
const production = readFileSync(
  new URL('../.github/workflows/deploy-production.yml', import.meta.url),
  'utf8',
);
const config = JSON.parse(
  readFileSync(new URL('../.github/ci-cd.json', import.meta.url), 'utf8'),
);
const scripts = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).scripts;
const browsers = readFileSync(
  new URL('../playwright.config.ts', import.meta.url),
  'utf8',
);

describe('versioned delivery consumer', () => {
  it('uses one immutable shared version for verification and deployment in both entry points', () => {
    expect(config.automationSha).toMatch(/^[a-f0-9]{40}$/);
    for (const file of [workflow, production]) {
      expect(file).toContain(`verify-web.yml@${config.automationSha}`);
      expect(file).toContain(`deploy-web.yml@${config.automationSha}`);
      expect(file).not.toContain('secrets: inherit');
    }
  });
  it('keeps automatic dev main-only and production separate, manual and dependent on release verification', () => {
    expect(workflow).toContain('pull_request:');
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
    expect(scripts['ci:integration']).toContain('npm run test:e2e');
    expect(scripts['ci:integration']).toContain('npm run test:vertical');
    expect(scripts['ci:quality']).toContain('npm run build');
    expect(scripts['ci:browser']).toContain('playwright.release.config.ts');
    for (const engine of ['chromium', 'firefox', 'webkit'])
      expect(browsers).toContain(`name: '${engine}'`);
    expect(browsers).toContain('retries: 0');
    expect(browsers).toContain('actionTimeout: 5_000');
    expect(browsers).toContain('trace:');
    const adapter = readFileSync(
      new URL('../scripts/ci-deploy.mjs', import.meta.url),
      'utf8',
    );
    expect(adapter).not.toContain('vercel deploy');
    expect(adapter).toContain('publishWeb');
    expect(adapter).toContain('access-control-allow-origin');
  });
  it('preserves current review contexts and deliberately selected Worker/OpenAPI compatibility pins', () => {
    expect(config.legacyChecks).toEqual(['test-and-build', 'vertical']);
    for (const name of config.legacyChecks)
      expect(workflow).toContain(`name: ${name}`);
    expect(config.workerRepository).toBe('benhammoush/iris-backend');
    expect(config.workerSha).toBe('568d38a8acbfa42689c59f7162b975c41cea98b0');
    for (const target of ['dev', 'production']) {
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
