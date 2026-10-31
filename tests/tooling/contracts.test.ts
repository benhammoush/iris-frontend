/**
 * Contract generator compatibility and fail-closed verification coverage.
 * @packageDocumentation
 */

// @vitest-environment node
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import openapiTS from 'openapi-typescript';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  CandleTimeframe,
  HistoryRange,
  Mint,
  WalletAddress,
} from '../../src/api/contracts';

const script = fileURLToPath(
  new URL('../../scripts/generate-contracts.mjs', import.meta.url),
);
const destination = new URL('../../src/api/generated.ts', import.meta.url);

describe('contract generation', () => {
  it('keeps application parameter aliases as values, not optional properties', () => {
    expectTypeOf<Extract<CandleTimeframe, undefined>>().toEqualTypeOf<never>();
    expectTypeOf<HistoryRange>().toEqualTypeOf<'1d' | '7d'>();
    expectTypeOf<Mint>().toEqualTypeOf<string>();
    expectTypeOf<WalletAddress>().toEqualTypeOf<string>();
  });
  it('retains required, optional, nullable, enum and array schema types', async () => {
    const generated = await openapiTS({
      openapi: '3.0.3',
      info: { title: 'Generator fixture', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          Fixture: {
            type: 'object',
            required: ['id', 'state', 'items'],
            properties: {
              id: { type: 'string' },
              state: { type: 'string', enum: ['deleting', 'deleted'] },
              note: { type: 'string', nullable: true },
              items: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    });
    expect(generated).toMatch(/id: string;/);
    expect(generated).toMatch(/state: "deleting" \| "deleted";/);
    expect(generated).toMatch(/note\?: string \| null;/);
    expect(generated).toMatch(/items: string\[\];/);
  });

  it('retains OpenAPI 3.1 null unions, constants and composed objects', async () => {
    const generated = await openapiTS({
      openapi: '3.1.0',
      info: { title: 'OpenAPI 3.1 fixture', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          Fixture: {
            allOf: [
              {
                type: 'object',
                required: ['note'],
                properties: { note: { type: ['string', 'null'] } },
              },
              {
                type: 'object',
                required: ['removed'],
                properties: { removed: { type: 'boolean', const: true } },
              },
            ],
          },
        },
      },
    });
    expect(generated).toMatch(/note: string \| null;/);
    expect(generated).toMatch(/removed: true;/);
    expect(generated).toMatch(/}\)?\s*&\s*{/);
  });

  it('checks reproducibly without modifying the generated file', () => {
    const before = readFileSync(destination, 'utf8');
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = spawnSync(process.execPath, [script, '--check'], {
        encoding: 'utf8',
        timeout: 30_000,
      });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('Generated contract types match');
    }
    expect(readFileSync(destination, 'utf8')).toBe(before);
  });

  it('rejects drift, malformed schemas and missing input without writing output', () => {
    const directory = mkdtempSync(join(tmpdir(), 'iris-contract-check-'));
    const before = readFileSync(destination, 'utf8');
    try {
      const schema = join(directory, 'openapi.yaml');
      for (const content of [
        'openapi: 3.0.3\ninfo: { title: Drift, version: 1.0.0 }\npaths: {}\n',
        'openapi: [\n',
        undefined,
      ]) {
        if (content === undefined) rmSync(schema);
        else writeFileSync(schema, content);
        const result = spawnSync(process.execPath, [script, '--check'], {
          env: { ...process.env, IRIS_WORKER_ROOT: directory },
          encoding: 'utf8',
          timeout: 30_000,
        });
        expect(result.status).not.toBe(0);
        if (content?.includes('title: Drift'))
          expect(result.stderr).toContain(
            'Generated contract types do not match',
          );
        expect(readFileSync(destination, 'utf8')).toBe(before);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('uses the GitHub worker checkout when the integration override is absent', () => {
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
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('Generated contract types match');
      expect(readFileSync(destination, 'utf8')).toBe(before);
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
      expect(missing.status).not.toBe(0);
      expect(readFileSync(destination, 'utf8')).toBe(before);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
