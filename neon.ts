import { defineConfig } from '@neon/config/v1';

export default defineConfig({
  auth: true,
  functions: {
    sync: {
      name: 'LOREKEEP encrypted sync API',
      source: 'functions/sync/index.ts',
    },
  },
});
