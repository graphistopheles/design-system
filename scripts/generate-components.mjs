// Borde "specs → código": genera el contrato TypeScript y el mapa de clases de cada componente.
// Determinístico (sin IA). Uso:
//   node scripts/generate-components.mjs          → escribe packages/ui-core/src (contratos + mapas de clases, sin framework)
//   node scripts/generate-components.mjs --check  → falla si lo generado no coincide con los specs (CI)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadSpecs, entryToClasses, normalizeCascade, camel } from './lib/specs.mjs';

const OUT = path.join(ROOT, 'packages/ui-core/src');
const CHECK = process.argv.includes('--check');
const HEADER = (file) => `// GENERADO desde ${file} por scripts/generate-components.mjs. No editar a mano:\n// cambia el spec y vuelve a ejecutar \`npm run generate\`.\n`;

const tsType = (p) => {
  if (p.type === 'enum') return p.values.map((v) => `'${v}'`).join(' | ');
  if (p.type === 'boolean') return 'boolean';
  return 'string';
};

function render({ file, spec: raw }) {
  const spec = normalizeCascade(raw);
  const id = camel(spec.name);
  const contractProps = Object.entries(spec.props).filter(([, p]) => p.type !== 'slot');
  const slots = Object.entries(spec.props).filter(([, p]) => p.type === 'slot');

  const doc = (p) => (p.description ? `  /** ${p.description} */\n` : '');
  const iface = contractProps.map(([k, p]) => `${doc(p)}  ${k}${p.required ? '' : '?'}: ${tsType(p)};`).join('\n');
  const defaults = Object.fromEntries(contractProps.filter(([, p]) => p.default !== undefined).map(([k, p]) => [k, p.default]));

  const base = entryToClasses({ ...spec.base, states: spec.states });
  const variants = {};
  for (const [prop, values] of Object.entries(spec.variants ?? {})) {
    variants[prop] = {};
    for (const [val, entry] of Object.entries(values)) variants[prop][val] = entryToClasses(entry);
  }
  const compounds = (spec.compounds ?? []).map((c) => ({ when: c.when, classes: entryToClasses(c) }));
  const parts = Object.keys(spec.anatomy);

  return `${HEADER(file)}import { resolve } from './_runtime';

/** ${spec.purpose} */
export interface ${spec.name}Contract {
${iface}
}

/** Slots de contenido: ${slots.map(([k, p]) => `${k}${p.required ? ' (requerido)' : ''}`).join(', ') || 'ninguno'} */
export type ${spec.name}Part = ${parts.map((p) => `'${p}'`).join(' | ')};

export const ${id}Meta = ${JSON.stringify({ name: spec.name, version: spec.version, status: spec.status, level: spec.level, spec: file })} as const;

export const ${id}Defaults = ${JSON.stringify(defaults)} as const;

export const ${id}Styles = ${JSON.stringify({ parts, base, variants, compounds }, null, 2)} as const;

/** Clases por parte de la anatomía para un conjunto de props. */
export function ${id}(props: Partial<${spec.name}Contract> = {}): Record<${spec.name}Part, string> {
  return resolve(${id}Styles, { ...${id}Defaults, ...props }) as Record<${spec.name}Part, string>;
}
`;
}

const RUNTIME = `// GENERADO por scripts/generate-components.mjs. No editar a mano.
type Classes = Record<string, string>;
export interface Styles {
  parts: readonly string[];
  base: Classes;
  variants: Record<string, Record<string, Classes>>;
  compounds: readonly { when: Record<string, unknown>; classes: Classes }[];
}

/** Une base + variantes + compuestos por parte. Las clases extra (capa "extensions") se agregan en el componente. */
export function resolve(styles: Styles, props: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string[]> = Object.fromEntries(styles.parts.map((p) => [p, []]));
  const add = (c: Classes | undefined) => {
    for (const [part, cls] of Object.entries(c ?? {})) out[part]?.push(cls);
  };
  add(styles.base);
  for (const [prop, values] of Object.entries(styles.variants)) add(values[String(props[prop])]);
  for (const c of styles.compounds) {
    if (Object.entries(c.when).every(([k, v]) => String(props[k]) === String(v))) add(c.classes);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join(' ')]));
}
`;

const specs = loadSpecs();
const files = new Map();
files.set('_runtime.ts', RUNTIME);
for (const s of specs) files.set(`${camel(s.spec.name)}.ts`, render(s));
files.set(
  'index.ts',
  `// GENERADO. Índice de contratos.\n${specs.map((s) => `export * from './${camel(s.spec.name)}';`).join('\n')}\n`,
);

if (CHECK) {
  const stale = [...files].filter(([f, c]) => {
    const p = path.join(OUT, f);
    return !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== c;
  });
  if (stale.length) {
    console.error(`✖ Código generado desactualizado respecto de los specs: ${stale.map(([f]) => f).join(', ')}\n  Ejecuta: npm run generate`);
    process.exit(1);
  }
  console.log('✔ Código generado al día con los specs');
} else {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [f, c] of files) fs.writeFileSync(path.join(OUT, f), c);
  console.log(`✔ ${specs.length} contratos generados en packages/ui-core/src`);
  // Andamios por superficie (escritos a mano sobre el contrato): Astro y, si existe, React.
  const surfaces = [['Astro', (n) => path.join(ROOT, 'apps/landing/src/components', `${n}.astro`), true], ['React', (n) => path.join(ROOT, 'packages/ui-react/src', `${n}.tsx`), fs.existsSync(path.join(ROOT, 'packages/ui-react'))]];
  for (const [label, file, active] of surfaces) {
    const missing = active ? specs.filter((s) => !fs.existsSync(file(s.spec.name))) : [];
    if (missing.length) console.log(`  ⚠ Sin componente ${label} todavía: ${missing.map((s) => s.spec.name).join(', ')}`);
  }
}
