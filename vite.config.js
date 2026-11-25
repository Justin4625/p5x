import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Two pages: the team builder (index.html) and My roster / Should I pull? (roster.html).
// BASE_PATH is set by the GitHub Pages workflow (the site lives under /<repo>/ there).
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        roster: resolve(import.meta.dirname, 'roster.html'),
      },
    },
  },
});
