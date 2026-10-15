import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { target: ['chrome111', 'firefox128', 'safari16.4'] },
  esbuild: {
    include: /src\/.*\.(js|ts|tsx)$/,
    exclude: [],
    loader: 'tsx',
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
  },
});
