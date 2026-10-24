/**
 * Assert TypeScript-only application surfaces and blocking lint/format configuration.
 * @file
 */

import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
import { check, resolveConfig } from 'prettier';
import { readdir } from 'node:fs/promises';

/** Reject handwritten application JavaScript outside the explicitly permitted tooling surfaces. */
async function assertTypeScriptOnly(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = new URL(
      entry.isDirectory() ? `${entry.name}/` : entry.name,
      directory,
    );
    if (entry.isDirectory()) await assertTypeScriptOnly(path);
    else
      assert.ok(
        !/\.(?:js|jsx|mjs|cjs)$/.test(entry.name),
        `Application/test JavaScript is not allowed: ${path.pathname}`,
      );
  }
}
await assertTypeScriptOnly(new URL('../src/', import.meta.url));

const strictProbe = await new ESLint().lintText(
  'export const unchecked: any = 1;',
  { filePath: 'src/tooling-probe.ts' },
);
assert.ok(
  strictProbe[0].messages.some(
    (message) => message.ruleId === '@typescript-eslint/no-explicit-any',
  ),
  'Explicit any must fail TypeScript linting',
);

const eslint = new ESLint();
const [result] = await eslint.lintText(
  "import { useEffect } from 'react'; export function Example({ flag }) { if (flag) useEffect(() => {}, []); return null; }",
  { filePath: 'src/tooling-probe.tsx' },
);
assert.ok(
  result.messages.some(
    (message) => message.ruleId === 'react-hooks/rules-of-hooks',
  ),
  'Conditional React Hooks must fail linting',
);
const options = await resolveConfig('src/tooling-probe.ts');
assert.equal(
  await check('export const example={value:1}', {
    ...options,
    parser: 'typescript',
  }),
  false,
  'Unformatted TypeScript must fail the format check',
);
console.log(
  'Tooling guards reject application JavaScript, explicit any, invalid hooks and unformatted TypeScript.',
);
