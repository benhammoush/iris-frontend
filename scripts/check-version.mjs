/**
 * Reject package, lockfile and runtime version identity drift.
 * @file
 */

import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url)),
);
const appVersion = await readFile(
  new URL('../src/appVersion.ts', import.meta.url),
  'utf8',
);
const displayVersion = appVersion.match(/APP_PACKAGE_VERSION = '([^']+)'/)?.[1];

if (!displayVersion || packageJson.version !== displayVersion) {
  throw new Error(
    `Version mismatch: package=${packageJson.version}, display=${displayVersion ?? 'missing'}`,
  );
}
