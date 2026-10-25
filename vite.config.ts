/**
 * Frontend build modes, plugins and deterministic test configuration.
 * @packageDocumentation
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { target: ['chrome111', 'firefox128', 'safari16.4'] },
  esbuild: {
    include: /(?:src|tests)\/.*\.(js|ts|tsx)$/,
    exclude: [],
    loader: 'tsx',
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/unit/setup.ts',
    include: ['tests/{unit,tooling}/**/*.{test,spec}.{ts,tsx}'],
  },
});
