import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // Only include the basic setup file for all tests
    setupFiles: ['./src/tests/setup.ts'],
    include: [
      'src/tests/**/*.{test,spec}.{js,ts,tsx}',
    ],
    exclude: [
      'src/tests/integration/**/*',
      'node_modules',
      'dist',
    ],
    testTimeout: 10000, // Increase timeout for integration tests
    // Separate configuration for integration tests
    projects: [
      {
        name: 'integration',
        extends: './vite.config.ts',
        test: {
          include: [
            'src/tests/integration/**/*.{test,spec}.{js,ts,tsx}',
          ],
          setupFiles: ['./src/tests/setup.ts', './src/tests/integration/setup.ts'],
        },
      },
    ],
  },
})
