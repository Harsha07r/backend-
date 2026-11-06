import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    hookTimeout: 120_000, // first run downloads a MongoDB binary
    testTimeout: 30_000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      MONGO_URI: 'mongodb://placeholder',
      JWT_SECRET: 'test-secret-test-secret-test-secret-123',
    },
  },
});
