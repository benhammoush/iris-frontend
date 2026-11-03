/**
 * Verify generated contracts against the provisioned compatible Worker checkout.
 * @file
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(
  new URL('../../scripts/generate-contracts.mjs', import.meta.url),
);
const destination = new URL('../../src/api/generated.ts', import.meta.url);

test('checks reproducibly without modifying the generated file', () => {
  const before = readFileSync(destination, 'utf8');
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = spawnSync(process.execPath, [script, '--check'], {
      encoding: 'utf8',
      timeout: 30_000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Generated contract types match/);
  }
  assert.equal(readFileSync(destination, 'utf8'), before);
});

test('uses the GitHub worker checkout when the integration override is absent', () => {
  const directory = mkdtempSync(join(tmpdir(), 'iris-contract-workspace-'));
  const before = readFileSync(destination, 'utf8');
  const source = resolve(
    process.env.IRIS_WORKER_ROOT ||
      (process.env.GITHUB_WORKSPACE
        ? resolve(process.env.GITHUB_WORKSPACE, 'worker')
        : '../iris-backend'),
    'openapi.yaml',
  );
  try {
    mkdirSync(join(directory, 'worker'));
    copyFileSync(source, join(directory, 'worker', 'openapi.yaml'));
    const result = spawnSync(process.execPath, [script, '--check'], {
      env: {
        ...process.env,
        IRIS_WORKER_ROOT: '',
        GITHUB_WORKSPACE: directory,
      },
      encoding: 'utf8',
      timeout: 30_000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Generated contract types match/);
    assert.equal(readFileSync(destination, 'utf8'), before);
    rmSync(join(directory, 'worker', 'openapi.yaml'));
    const missing = spawnSync(process.execPath, [script, '--check'], {
      env: {
        ...process.env,
        IRIS_WORKER_ROOT: '',
        GITHUB_WORKSPACE: directory,
      },
      encoding: 'utf8',
      timeout: 30_000,
    });
    assert.notEqual(missing.status, 0);
    assert.equal(readFileSync(destination, 'utf8'), before);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
