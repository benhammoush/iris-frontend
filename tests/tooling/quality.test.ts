// @vitest-environment node
/**
 * Keep type-aware promise and callable documentation checks blocking.
 * @packageDocumentation
 */
import { ESLint } from 'eslint';
import { expect, it } from 'vitest';

it('rejects unhandled promises through the actual TypeScript project', async () => {
  const [result] = await new ESLint().lintText(
    '/** Quality fixture.\n * @packageDocumentation\n */\nPromise.resolve(1);',
    { filePath: 'src/api/client.ts' },
  );
  expect(result.fatalErrorCount).toBe(0);
  expect(result.messages.map((message) => message.ruleId)).toContain(
    '@typescript-eslint/no-floating-promises',
  );
}, 30_000);
