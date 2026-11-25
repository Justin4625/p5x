import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Two pages: the team builder (index.html) and My roster / Should I pull? (roster.html).
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        roster: resolve(import.meta.dirname, 'roster.html'),
      },
    },
  },
});
