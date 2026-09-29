// Lint de consumo: la landing (capa "extensions") solo puede usar tokens semánticos.
// Prohíbe: colores literales, px literales, valores arbitrarios de Tailwind, variables de primitivos
// y el cruce de grupos de espaciado (padding = inset; gap = stack/inline).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadTokens } from './lib/specs.mjs';

const SRC = path.join(ROOT, 'apps/landing/src');
const IGNORE = [path.join(SRC, 'components/generated')];
const EXT = /\.(astro|ts|tsx|js|mjs|css)$/;

const primitives = new Set(loadTokens().list.filter((t) => t.tier === 'primitive').map((t) => t.name));

const RULES = [
  { id: 'color-literal', re: /#[0-9a-fA-F]{3,8}\b(?![^<]*<\/code>)/g, msg: 'color literal: usa un token semántico (bg-*, text-*, border-*)' },
  { id: 'color-fn', re: /\b(?:rgba?|hsla?|oklch)\(/g, msg: 'función de color literal: usa un token semántico' },
  { id: 'px-literal', re: /(?<![\w-])(?!0px)\d+(?:\.\d+)?px\b/g, msg: 'medida literal en px: usa space/*, size/* o radius/*' },
  { id: 'tw-arbitrary', re: /\b[a-z-]+-\[[^\]]+\]/g, msg: 'valor arbitrario de Tailwind: si falta un valor, crea el token semántico' },
  { id: 'padding-group', re: /\b(?:p|px|py|pt|pb|pl|pr|ps|pe)-(?:stack|inline)-/g, msg: 'el padding interno usa space/inset/*' },
  { id: 'gap-group', re: /\bgap(?:-[xy])?-inset-/g, msg: 'el gap usa space/stack/* (vertical) o space/inline/* (horizontal)' },
  { id: 'inline-style', re: /\bstyle\s*=\s*["{]/g, msg: 'estilo inline: usa utilidades semánticas' },
];

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (IGNORE.some((i) => p.startsWith(i))) return [];
    return d.isDirectory() ? walk(p) : EXT.test(d.name) ? [p] : [];
  });

const problems = [];
for (const file of walk(SRC)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Texto dentro de <code> es contenido (documentación), no estilo.
    const code = line.replace(/<code[^>]*>.*?<\/code>/g, '').replace(/^\s*(\/\/|\/\*|\*).*/, '').replace(/<!--.*?-->/g, '');
    for (const r of RULES) {
      for (const m of code.matchAll(r.re)) problems.push({ file, line: i + 1, found: m[0], msg: r.msg, id: r.id });
    }
    for (const m of code.matchAll(/(?:var\(|-\()--([a-z0-9-]+)/g)) {
      if (primitives.has(m[1])) problems.push({ file, line: i + 1, found: m[0], msg: `"--${m[1]}" es un PRIMITIVO: usa su semántico`, id: 'primitive-var' });
    }
  });
}

if (problems.length) {
  for (const p of problems) console.error(`✖ ${path.relative(ROOT, p.file)}:${p.line}  ${p.found}  → ${p.msg} [${p.id}]`);
  console.error(`\n${problems.length} problema(s) de consumo de tokens.`);
  process.exit(1);
}
console.log('✔ Consumo de tokens: solo semánticos en la landing');
