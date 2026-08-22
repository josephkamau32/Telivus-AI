/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^npm:@supabase\/supabase-js(@.*)?$/, replacement: '@supabase/supabase-js' },
      { find: /^https:\/\/esm\.sh\/@supabase\/supabase-js(@.*)?$/, replacement: '@supabase/supabase-js' },
      { find: /^https:\/\/deno\.land\/std(@.*)?\/http\/server\.ts$/, replacement: path.resolve(__dirname, './tests/edge-functions/serve-shim.ts') },
      { find: /^jsr:@supabase\/functions-js\/.*$/, replacement: path.resolve(__dirname, './tests/edge-functions/empty-shim.ts') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    // Test timeout
    testTimeout: 10000,
    // Retry failed tests
    retry: 2,
  },
});