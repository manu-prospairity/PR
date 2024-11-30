import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      '@db': path.resolve(__dirname, 'db'),
    },
  },
});
