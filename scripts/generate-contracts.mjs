import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';
import { format, resolveConfig } from 'prettier';

const source = resolve(
  process.env.IRIS_WORKER_ROOT || '../iris-backend',
  'openapi.yaml',
);
const destination = new URL('../src/api/generated.ts', import.meta.url);
const generated = astToString(
  await openapiTS(pathToFileURL(source), { alphabetize: true }),
);
const content = await format(
  '// Generated from the compatible Iris Worker openapi.yaml. Do not edit manually.\n' +
    generated,
  {
    ...(await resolveConfig(fileURLToPath(destination))),
    parser: 'typescript',
  },
);

if (process.argv.includes('--check')) {
  const existing = await readFile(destination, 'utf8').catch(() => '');
  if (existing !== content) {
    console.error(
      'Generated contract types do not match the compatible Worker. Run npm run generate:contracts with the intended Worker checkout.',
    );
    process.exitCode = 1;
  } else console.log('Generated contract types match the compatible Worker.');
} else {
  await writeFile(destination, content);
  console.log(`Generated contract types from ${source}.`);
}
