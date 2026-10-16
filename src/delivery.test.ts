// @vitest-environment node
/**
 * Checks manual workflow input rejection without building or deploying a target.
 * Structural assertions describe CI controls, not native approval enforcement.
 * @packageDocumentation
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  new URL('../.github/workflows/ci.yml', import.meta.url),
  'utf8',
).replace(/\r/g, '');
const bash =
  process.platform === 'win32'
    ? (process.env.IRIS_TEST_BASH ??
      join(process.env.ProgramFiles ?? 'C:/Program Files', 'Git/bin/bash.exe'))
    : 'bash';

/**
 * Executes the workflow's pre-checkout Bash guard with public fixture inputs.
 * Ancestry and native approvals are separate controls, not mocked acceptance.
 * @param target - Requested hosted deployment target.
 * @param sha - Candidate source identity; no checkout is performed.
 * @param ref - Workflow branch, which must be main for a manual release.
 * @param attempt - Explicit run attempt, independent of the host test environment.
 * @returns The guard exit status; a missing interpreter fails verification.
 */
function validateRelease(
  target: string,
  sha: string,
  ref: string,
  attempt = '1',
) {
  const script = workflow.match(
    /- name: Validate manual release[\s\S]*?run: \|\n((?: {10}[^\n]*\n)+)/,
  )?.[1];
  if (!script) throw new Error('Missing manual validation step');
  const result = spawnSync(bash, ['-e', '-c', script.replace(/^ {10}/gm, '')], {
    env: {
      ...process.env,
      TARGET: target,
      SOURCE_SHA: sha,
      GITHUB_REF: ref,
      GITHUB_RUN_ATTEMPT: attempt,
    },
    encoding: 'utf8',
    timeout: 10_000,
  });
  if (result.error) throw result.error;
  if (result.status === null)
    throw new Error('Manual validation was interrupted');
  return result.status;
}

/**
 * Execute only the actual predeployment production guard, never a provider command.
 * @param target - Selected hosted environment.
 * @param event - Workflow trigger, which must be dispatch for production.
 * @param attempt - Explicit run attempt to exercise deployment-only reruns.
 * @returns The guard exit status; interpreter failures fail verification.
 */
function validateDeploymentAttempt(
  target: string,
  event: string,
  attempt: string,
) {
  const deployment = workflow.slice(
    workflow.indexOf('- name: Validate configuration and deploy'),
  );
  const script = deployment.match(
    / {10}if \[ "\$TARGET" = production \]; then\n(?: {12}[^\n]*\n)+ {10}fi/,
  )?.[0];
  if (!script) throw new Error('Missing predeployment production guard');
  const result = spawnSync(bash, ['-e', '-c', script.replace(/^ {10}/gm, '')], {
    env: {
      ...process.env,
      TARGET: target,
      GITHUB_EVENT_NAME: event,
      GITHUB_RUN_ATTEMPT: attempt,
    },
    encoding: 'utf8',
    timeout: 10_000,
  });
  if (result.error) throw result.error;
  if (result.status === null)
    throw new Error('Deployment guard was interrupted');
  return result.status;
}

describe('delivery workflow', () => {
  it('requires a new production dispatch even when only the deployment job is rerun', () => {
    for (const attempt of ['2', '', '0', '01', 'invalid']) {
      expect(
        validateRelease(
          'production',
          'a'.repeat(40),
          'refs/heads/main',
          attempt,
        ),
      ).not.toBe(0);
    }
    expect(validateRelease('dev', 'a'.repeat(40), 'refs/heads/main', '2')).toBe(
      0,
    );
    expect(
      validateDeploymentAttempt('production', 'workflow_dispatch', '1'),
    ).toBe(0);
    for (const [event, attempt] of [
      ['workflow_dispatch', '2'],
      ['workflow_dispatch', ''],
      ['workflow_dispatch', '0'],
      ['workflow_dispatch', '01'],
      ['workflow_dispatch', 'invalid'],
      ['push', '1'],
      ['', '1'],
    ]) {
      expect(validateDeploymentAttempt('production', event, attempt)).not.toBe(
        0,
      );
    }
    expect(validateDeploymentAttempt('dev', 'push', '2')).toBe(0);
  });
  it('accepts only dev/production exact-source manual releases from main', () => {
    for (const target of ['dev', 'production']) {
      expect(validateRelease(target, 'a'.repeat(40), 'refs/heads/main')).toBe(
        0,
      );
    }
    for (const target of [
      'staging',
      'local',
      '',
      'Production',
      'dev; exit 0',
    ]) {
      expect(
        validateRelease(target, 'a'.repeat(40), 'refs/heads/main'),
      ).not.toBe(0);
    }
    for (const sha of [
      '',
      'main',
      'a'.repeat(39),
      'a'.repeat(41),
      'G'.repeat(40),
    ]) {
      expect(validateRelease('dev', sha, 'refs/heads/main')).not.toBe(0);
    }
    expect(
      validateRelease('production', 'a'.repeat(40), 'refs/heads/feature'),
    ).not.toBe(0);
  });

  it('retains compatible-source, main, environment, quality and stale-dev guards', () => {
    const deployment = workflow.slice(workflow.indexOf('\n  deploy:'));
    expect(deployment).toContain("TARGET: ${{ inputs.target || 'dev' }}");
    expect(workflow).toMatch(/options: \[dev, production\]/);
    expect(workflow).toMatch(/TARGET: \$\{\{ inputs\.target \|\| 'dev' \}\}/);
    expect(workflow).toContain('git merge-base --is-ancestor HEAD origin/main');
    expect(workflow.match(/ref: \$\{\{ env\.SOURCE_SHA \}\}/g)).toHaveLength(3);
    expect(workflow).toContain('ref: ${{ env.WORKER_SHA }}');
    expect(workflow).toContain('repository: benhammoush/iris-backend');
    expect(workflow).toContain('WORKER_SHA: ${{ vars.IRIS_WORKER_SHA }}');
    expect(workflow).toContain('needs: [test-and-build, vertical]');
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).toContain("environment: ${{ inputs.target || 'dev' }}");
    expect(workflow).toContain(
      "group: iris-frontend-${{ inputs.target || 'dev' }}",
    );
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('test "$DEPLOY_ENABLED" = true');
    expect(workflow).toMatch(
      /if \[ "\$GITHUB_EVENT_NAME" = push \]; then\n\s+git fetch origin main\n\s+test "\$\(git rev-parse origin\/main\)" = "\$SOURCE_SHA"/,
    );
    expect(workflow).toContain('--build-env "VITE_ENABLE_FIXTURES=false"');
  });
});
