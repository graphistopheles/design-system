import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Raíz del monorepo: los paquetes @ds-ia/* viven fuera de apps/webapp y se enlazan por workspace.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // @ds-ia/core y @ds-ia/react se publican como TypeScript fuente: Next los compila con la app.
  transpilePackages: ['@ds-ia/core', '@ds-ia/react'],
  turbopack: { root },
  outputFileTracingRoot: root,
};
