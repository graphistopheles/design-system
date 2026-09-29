// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Si publicas en GitHub Pages, define site y base (ver README).
  site: process.env.SITE_URL,
  base: process.env.BASE_PATH ?? '/',
  vite: { plugins: [tailwindcss()] },
});
