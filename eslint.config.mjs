/** Blocking source and docblock checks for handwritten application, tooling and test code.
 * @file
 */

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import jsdoc from 'eslint-plugin-jsdoc';
import tsdoc from 'eslint-plugin-tsdoc';

// Named contracts are documented; anonymous callbacks and declarative tests are exempt.
const contexts = [
  'FunctionDeclaration',
  'FunctionExpression[parent.type="VariableDeclarator"]',
  'ArrowFunctionExpression[parent.type="VariableDeclarator"]',
  'FunctionExpression[id]',
  'CallExpression[callee.name=/^(memo|forwardRef)$/] > :matches(ArrowFunctionExpression, FunctionExpression)',
  'CallExpression[callee.object.name="React"][callee.property.name=/^(memo|forwardRef)$/] > :matches(ArrowFunctionExpression, FunctionExpression)',
  'MethodDefinition',
  'Property[value.type=/^(ArrowFunctionExpression|FunctionExpression)$/]',
  'PropertyDefinition[value.type=/^(ArrowFunctionExpression|FunctionExpression)$/]',
  'ClassDeclaration',
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
  'TSMethodSignature',
  'TSPropertySignature[typeAnnotation.typeAnnotation.type="TSFunctionType"]',
  'VariableDeclaration:not([parent.type="ExportNamedDeclaration"]):has(VariableDeclarator > CallExpression[callee.name=/^(memo|forwardRef)$/])',
  'VariableDeclaration:not([parent.type="ExportNamedDeclaration"]):has(VariableDeclarator > CallExpression[callee.object.name="React"][callee.property.name=/^(memo|forwardRef)$/])',
  'ExportNamedDeclaration:has(VariableDeclaration > VariableDeclarator > CallExpression[callee.name=/^(memo|forwardRef)$/])',
  'ExportNamedDeclaration:has(VariableDeclaration > VariableDeclarator > CallExpression[callee.object.name="React"][callee.property.name=/^(memo|forwardRef)$/])',
];

const callableContexts = [
  'ArrowFunctionExpression',
  'FunctionDeclaration',
  'FunctionExpression',
  'TSMethodSignature',
  'TSPropertySignature[typeAnnotation.typeAnnotation.type="TSFunctionType"]',
];

export default [
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    plugins: { jsdoc },
    settings: { jsdoc: { mode: 'typescript' } },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          contexts,
          exemptEmptyFunctions: false,
          exemptEmptyConstructors: false,
        },
      ],
      'jsdoc/require-description': [
        'error',
        { contexts: ['any'], exemptedBy: [] },
      ],
      'jsdoc/check-tag-names': [
        'error',
        { definedTags: ['packageDocumentation'] },
      ],
      'jsdoc/check-param-names': 'error',
      'jsdoc/require-param': ['error', { contexts: callableContexts }],
      'jsdoc/require-param-description': ['error', { contexts: ['any'] }],
      'jsdoc/require-returns': [
        'error',
        {
          contexts: [
            'ArrowFunctionExpression',
            'FunctionDeclaration',
            'FunctionExpression',
            'TSMethodSignature',
            {
              context:
                'TSPropertySignature[typeAnnotation.typeAnnotation.type="TSFunctionType"]:not([typeAnnotation.typeAnnotation.returnType.typeAnnotation.type="TSVoidKeyword"]):not([typeAnnotation.typeAnnotation.returnType.typeAnnotation.type="TSUndefinedKeyword"]):not([typeAnnotation.typeAnnotation.returnType.typeAnnotation.type="TSNeverKeyword"])',
              forceRequireReturn: true,
            },
          ],
        },
      ],
      'jsdoc/require-returns-description': ['error', { contexts: ['any'] }],
      'jsdoc/valid-types': 'error',
      'jsdoc/require-file-overview': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { tsdoc },
    rules: {
      'tsdoc/syntax': 'error',
      'jsdoc/no-types': 'error',
      'jsdoc/require-file-overview': [
        'error',
        {
          tags: {
            packageDocumentation: {
              initialCommentsOnly: true,
              mustExist: true,
              preventDuplicates: true,
            },
            file: { mustExist: false },
          },
        },
      ],
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      '.vercel/**',
      'src/api/generated.ts',
    ],
  },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{js,ts,tsx}', 'tests/unit/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: { 'no-undef': 'off' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    files: ['tests/**/*.{test,spec}.{ts,tsx}', 'tests/unit/setup.ts'],
    languageOptions: {
      globals: {
        vi: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  {
    files: ['*.{js,mjs,ts}', 'scripts/**', 'tests/tooling/**', 'tests/e2e/**'],
    languageOptions: { globals: globals.node },
  },
];
