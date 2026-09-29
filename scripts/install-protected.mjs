// Mueve los archivos de _instalar/ a .claude/ y .github/ (carpetas que no se pudieron
// escribir de forma remota). Ejecutar una vez: npm run setup
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/specs.mjs';

const SRC = path.join(ROOT, '_instalar');
if (!fs.existsSync(SRC)) {
  console.log('✔ Nada que instalar: _instalar/ no existe.');
  process.exit(0);
}
for (const [from, to] of [['claude', '.claude'], ['github', '.github']]) {
  const src = path.join(SRC, from);
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, path.join(ROOT, to), { recursive: true });
  console.log(`✔ ${to}/ instalado`);
}
fs.rmSync(SRC, { recursive: true, force: true });
console.log('✔ _instalar/ eliminado');
