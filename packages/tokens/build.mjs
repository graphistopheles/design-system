// Transformación determinística: /specs/tokens (W3C DTCG) → CSS, Tailwind v4, TS, JSON y Figma.
// Style Dictionary se usa para parsear, resolver alias y aplicar transforms de valor.
// Los formatos de salida se escriben aquí para que la regla "componente → semántico → primitivo"
// quede explícita y auditable. NO usa IA: la misma entrada produce siempre la misma salida.
import StyleDictionary from 'style-dictionary';
import { usesReferences, getReferences } from 'style-dictionary/utils';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SPECS = path.resolve(here, '../../specs/tokens');
const DIST = path.resolve(here, 'dist');
const rel = (p) => path.relative(SPECS, p).split(path.sep).join('/');

const BASE = [
  `${SPECS}/primitives/*.json`,
  `${SPECS}/semantic/color.light.json`,
  `${SPECS}/semantic/number.json`,
  `${SPECS}/semantic/typography.json`,
  `${SPECS}/semantic/copy.json`,
  `${SPECS}/component/*.json`,
];
const MODES = {
  // modo → archivo que sobrescribe valores del modo base
  mobile: `${SPECS}/semantic/typography.mobile.json`,
};

const TRANSFORMS = ['name/kebab', 'fontFamily/css', 'cubicBezier/css', 'shadow/css/shorthand'];
const HEADER = '/* GENERADO por packages/tokens/build.mjs desde /specs/tokens. No editar a mano. */\n';

async function load(sources) {
  const sd = new StyleDictionary({
    source: sources,
    usesDtcg: true,
    log: { verbosity: 'silent', warnings: 'disabled' },
    platforms: { web: { transforms: TRANSFORMS } },
  });
  const dict = await sd.getPlatformTokens('web');
  return dict;
}

function tierOf(token) {
  const f = rel(token.filePath);
  if (f.startsWith('primitives/')) return 'primitive';
  if (f.startsWith('semantic/')) return 'semantic';
  if (f.startsWith('component/')) return 'component';
  throw new Error(`Token fuera de capa conocida: ${token.name} (${f})`);
}

// Nombre CSS de un token referenciado: "{brand.500}" → "brand-500"
const refName = (ref) => ref.replace(/[{}]/g, '').split('.').join('-');

function cssValue(token, dict) {
  const original = token.original.$value;
  if (usesReferences(original) && typeof original === 'string' && /^\{[^}]+\}$/.test(original)) {
    const [ref] = getReferences(original, dict.tokens, { usesDtcg: true });
    return `var(--${ref.name})`;
  }
  return String(token.$value);
}

function cssBlock(tokens, dict, selector = ':root', indent = '  ') {
  const lines = tokens
    .filter((t) => t.$type !== 'string')
    .map((t) => `${indent}--${t.name}: ${cssValue(t, dict)};`);
  return `${selector} {\n${lines.join('\n')}\n}`;
}

// ---------- Mapeo semántico → namespaces de Tailwind v4 ----------
// La paleta, spacing, radios, sombras y tipografía por defecto de Tailwind se anulan.
// Solo existen utilidades generadas desde tokens semánticos: bg-fill-primary, text-secondary,
// border-field, p-inset-md, gap-stack-lg, h-interactive-md, rounded-surface, text-heading-h2...
function tailwindTheme(tokens) {
  const out = [];
  const ref = [];
  // Si el nombre de la utilidad coincide con el del token semántico (radius-*, shadow-*),
  // se declara en @theme reference: Tailwind genera la utilidad sin redeclarar la variable
  // (evita la referencia circular --radius-interactive: var(--radius-interactive)).
  const add = (k, v) => (v === `var(--${k})` ? ref : out).push(`  --${k}: ${v};`);
  const sem = tokens.filter((t) => t.tier === 'semantic');
  for (const t of sem) {
    const [root, group, ...rest] = t.path;
    const name = rest.join('-');
    const v = `var(--${t.name})`;
    if (root === 'color') {
      if (group === 'bg') add(`background-color-${name}`, v);
      if (group === 'text') add(`text-color-${name}`, v);
      if (group === 'icon') add(`text-color-icon-${name}`, v);
      if (group === 'border') {
        add(`border-color-${name}`, v);
        add(`outline-color-${name}`, v);
      }
    } else if (root === 'space') add(`spacing-${group}-${name}`, v);
    else if (root === 'size') {
      if (group === 'container') add(`container-${name}`, v);
      else add(`spacing-${group}-${name}`, v);
    } else if (root === 'radius') add(`radius-${group}`, v);
    else if (root === 'shadow') add(`shadow-${group}`, v);
  }
  // Estilos tipográficos: text-display-1 aplica tamaño, interlineado, tracking y peso.
  const styles = [...new Set(sem.filter((t) => t.path[0] === 'typography' && t.path[1] !== 'family').map((t) => t.path[1]))];
  for (const s of styles) {
    add(`text-${s}`, `var(--typography-${s}-font-size)`);
    add(`text-${s}--line-height`, `var(--typography-${s}-line-height)`);
    add(`text-${s}--letter-spacing`, `var(--typography-${s}-letter-spacing)`);
    add(`text-${s}--font-weight`, `var(--typography-${s}-font-weight)`);
  }
  add('font-ui', 'var(--typography-family-ui)');
  add('font-code', 'var(--typography-family-code)');
  add('default-transition-duration', 'var(--motion-duration-interactive)');
  add('default-transition-timing-function', 'var(--motion-easing-default)');
  add('default-font-family', 'var(--typography-family-ui)');
  add('default-mono-font-family', 'var(--typography-family-code)');

  const resets = [
    '--color-*', '--spacing-*', '--spacing', '--text-*', '--font-*', '--font-weight-*', '--tracking-*',
    '--leading-*', '--radius-*', '--shadow-*', '--inset-shadow-*', '--drop-shadow-*', '--container-*',
    '--ease-*', '--blur-*',
  ].map((r) => `  ${r}: initial;`);

  return `${HEADER}/* Tema Tailwind v4 generado desde los tokens SEMÁNTICOS.
   Las escalas por defecto de Tailwind están anuladas: bg-indigo-600, p-4 o text-sm no existen.
   z-index, opacidad y duraciones se consumen con la sintaxis de variable: z-(--z-sticky). */
@theme {
  /* Anular escalas por defecto */
${resets.join('\n')}

  /* Cero no es una decisión de diseño: habilita top-0, p-0, gap-0 */
  --spacing-0: 0px;

  /* Utilidades del sistema */
${out.join('\n')}
}

@theme reference {
${ref.join('\n')}
}
`;
}

// ---------- Figma: colecciones de variables listas para el agente "specs → Figma" ----------
const FIGMA_SCOPES = {
  'color.bg': ['FRAME_FILL', 'SHAPE_FILL'],
  'color.text': ['TEXT_FILL'],
  'color.border': ['STROKE_COLOR'],
  'color.icon': ['SHAPE_FILL', 'STROKE_COLOR'],
  'space.inset': ['GAP'],
  'space.stack': ['GAP'],
  'space.inline': ['GAP'],
  size: ['WIDTH_HEIGHT'],
  radius: ['CORNER_RADIUS'],
  'border-width': ['STROKE_FLOAT'],
  opacity: ['OPACITY'],
  copy: ['TEXT_CONTENT'],
  'typography.*.font-size': ['FONT_SIZE'],
  'typography.*.font-weight': ['FONT_WEIGHT'],
  'typography.*.line-height': ['LINE_HEIGHT'],
  'typography.*.letter-spacing': ['LETTER_SPACING'],
  'typography.*.font-family': ['FONT_FAMILY'],
  'typography.family': ['FONT_FAMILY'],
};
function figmaScopes(p) {
  const key2 = p.slice(0, 2).join('.');
  if (FIGMA_SCOPES[key2]) return FIGMA_SCOPES[key2];
  if (p[0] === 'typography') return FIGMA_SCOPES[`typography.*.${p[2]}`] ?? [];
  return FIGMA_SCOPES[p[0]] ?? [];
}
function figmaType(t) {
  if (t.$type === 'color') return 'COLOR';
  if (t.$type === 'string' || t.$type === 'fontFamily') return 'STRING';
  if (['dimension', 'number', 'fontWeight'].includes(t.$type)) return 'FLOAT';
  return null; // shadow, duration, cubicBezier → no son variables en Figma
}
function figmaLiteral(t) {
  if (t.$type === 'dimension') {
    const v = String(t.$value);
    if (v.endsWith('em')) return { value: parseFloat(v) * 100, unit: 'PERCENT' };
    return { value: parseFloat(v) };
  }
  if (t.$type === 'number' && t.path.includes('line-height')) return { value: Math.round(Number(t.$value) * 100), unit: 'PERCENT' };
  if (t.$type === 'fontFamily') return { value: String(t.$value).split(',')[0].replace(/['"]/g, '').trim() };
  return { value: t.$value };
}
function figmaValue(t, dict) {
  const o = t.original.$value;
  if (typeof o === 'string' && /^\{[^}]+\}$/.test(o)) return { alias: o.slice(1, -1).split('.').join('/') };
  return figmaLiteral(t);
}

async function main() {
  await fs.mkdir(DIST, { recursive: true });
  const base = await load(BASE);
  const tokens = base.allTokens.map((t) => ({ ...t, tier: tierOf(t) }));

  // Regla fundamental verificada en build: semántico → primitivo; componente → semántico.
  for (const t of tokens) {
    const o = t.original.$value;
    if (!usesReferences(o)) {
      // Excepción documentada (guía cap. 11): los tokens de copy son STRING literales en la capa semántica.
      if (t.tier !== 'primitive' && t.$type !== 'string') throw new Error(`El token ${t.path.join('/')} (${t.tier}) tiene un valor crudo. Solo los primitivos pueden tenerlos.`);
      continue;
    }
    const refs = getReferences(o, base.tokens, { usesDtcg: true });
    for (const r of refs) {
      const rt = tierOf(r);
      if (t.tier === 'semantic' && rt !== 'primitive') throw new Error(`${t.path.join('/')} debe apuntar a un primitivo, apunta a ${r.path.join('/')}`);
      if (t.tier === 'component' && rt !== 'semantic') throw new Error(`${t.path.join('/')} (componente) debe apuntar a un semántico, apunta a ${r.path.join('/')}`);
    }
  }

  // Modos
  const modeBlocks = [];
  const modeTokens = {};
  for (const [mode, file] of Object.entries(MODES)) {
    const d = await load([...BASE, file]);
    const only = d.allTokens.filter((t) => path.resolve(t.filePath) === path.resolve(file));
    modeTokens[mode] = only;
    if (mode === 'mobile') {
      modeBlocks.push(`/* Modo Mobile: solo cambian Display 1–3 y H1–H4 */\n@media (max-width: 47.9375rem) {\n${cssBlock(only, d, '  :root', '    ')}\n}`);
    }
  }

  const prim = tokens.filter((t) => t.tier === 'primitive');
  const sem = tokens.filter((t) => t.tier !== 'primitive');
  const css = `${HEADER}
/* ── Capa 1 · Primitivos (valores crudos; ningún componente los consume) ── */
${cssBlock(prim, base)}

/* ── Capa 2 · Semánticos (modo Light / Desktop) ── */
${cssBlock(sem, base)}

${modeBlocks.join('\n\n')}
`;
  await fs.writeFile(path.join(DIST, 'tokens.css'), css);
  await fs.writeFile(path.join(DIST, 'theme.css'), tailwindTheme(tokens));

  // JSON plano: lo consumen los validadores, el lint y los agentes.
  const flat = tokens.map((t) => ({
    name: t.name,
    path: t.path.join('.'),
    figma: t.path.join('/'),
    css: `--${t.name}`,
    tier: t.tier,
    type: t.$type,
    value: t.$value,
    ref: typeof t.original.$value === 'string' && usesReferences(t.original.$value) ? t.original.$value.slice(1, -1) : null,
    description: t.$description ?? null,
    file: rel(t.filePath),
  }));
  const modes = Object.fromEntries(
    Object.entries(modeTokens).map(([m, list]) => [m, list.map((t) => ({ path: t.path.join('.'), value: t.$value, ref: t.original.$value.slice(1, -1) }))]),
  );
  await fs.writeFile(path.join(DIST, 'tokens.json'), JSON.stringify({ tokens: flat, modes }, null, 2));

  // JS + tipos
  const copy = {};
  for (const t of tokens.filter((t) => t.path[0] === 'copy')) {
    let o = copy;
    t.path.slice(1, -1).forEach((k) => (o = o[k] ??= {}));
    o[t.path.at(-1)] = t.$value;
  }
  const semanticNames = sem.map((t) => t.path.join('.'));
  await fs.writeFile(
    path.join(DIST, 'tokens.js'),
    `${HEADER}export const copy = ${JSON.stringify(copy, null, 2)};\nexport const semanticTokens = ${JSON.stringify(semanticNames, null, 2)};\n`,
  );
  const union = (pred) => sem.filter(pred).map((t) => `'${t.path.join('.')}'`).join(' | ') || 'never';
  await fs.writeFile(
    path.join(DIST, 'tokens.d.ts'),
    `${HEADER}export declare const copy: ${JSON.stringify(copy).replace(/"([^"]+)":"[^"]*"/g, '"$1": string')};
export declare const semanticTokens: string[];
export type SemanticToken = ${union(() => true)};
export type ColorToken = ${union((t) => t.path[0] === 'color')};
export type SpaceToken = ${union((t) => t.path[0] === 'space')};
export type SizeToken = ${union((t) => t.path[0] === 'size')};
export type RadiusToken = ${union((t) => t.path[0] === 'radius')};
export type TextStyle = ${[...new Set(sem.filter((t) => t.path[0] === 'typography' && t.path[1] !== 'family').map((t) => `'${t.path[1]}'`))].join(' | ')};
`,
  );

  // Figma
  const collection = (name, list, modeNames, hidden) => ({
    name,
    modes: modeNames,
    hiddenFromPublishing: hidden,
    variables: list
      .filter((t) => figmaType(t))
      .map((t) => ({
        name: t.path.join('/'),
        type: figmaType(t),
        description: t.$description ?? '',
        scopes: hidden ? [] : figmaScopes(t.path),
        codeSyntax: { WEB: `var(--${t.name})` },
        valuesByMode: { [modeNames[0]]: figmaValue(t, base) },
      })),
  });
  const typo = sem.filter((t) => t.path[0] === 'typography');
  const typoCol = collection('Typography', typo, ['Desktop', 'Mobile'], false);
  for (const v of typoCol.variables) {
    const m = modeTokens.mobile.find((t) => t.path.join('/') === v.name);
    v.valuesByMode.Mobile = m ? figmaValue(m) : v.valuesByMode.Desktop;
  }
  const textStyles = [...new Set(typo.filter((t) => t.path[1] !== 'family').map((t) => t.path[1]))].map((s) => {
    const [fam, n] = s.split('-');
    const label = fam === 'heading' ? n.toUpperCase() : `${fam[0].toUpperCase()}${fam.slice(1)} ${n}`;
    return {
      name: `${fam[0].toUpperCase()}${fam.slice(1)}/${label}`,
      boundVariables: Object.fromEntries(
        ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing'].map((p) => [p, `typography/${s}/${p}`]),
      ),
    };
  });
  const effectStyles = tokens
    .filter((t) => t.$type === 'shadow' && t.tier === 'semantic')
    .map((t) => ({ name: `Elevation/${t.path[1]}`, css: t.$value, from: t.original.$value.slice(1, -1).replace('.', '/') }));
  const figma = {
    $comment: 'GENERADO. Contrato para el borde specs → Figma. Colecciones según la guía (1.2): Primitives sin scope y sin publicar; Semantic con scopes y codeSyntax.',
    collections: [
      collection('Primitives', prim, ['Value'], true),
      collection('Semantic', sem.filter((t) => t.path[0] !== 'typography'), ['Light'], false),
      typoCol,
    ],
    textStyles,
    effectStyles,
  };
  await fs.writeFile(path.join(DIST, 'figma-variables.json'), JSON.stringify(figma, null, 2));

  const count = (tier) => tokens.filter((t) => t.tier === tier).length;
  console.log(`✔ tokens: ${count('primitive')} primitivos · ${count('semantic')} semánticos · ${count('component')} de componente · modos: ${Object.keys(MODES).join(', ')}`);
}

main().catch((e) => {
  console.error(`✖ ${e.message}`);
  process.exit(1);
});
