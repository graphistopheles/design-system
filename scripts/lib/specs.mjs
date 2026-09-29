// Utilidades compartidas por generador, validador y diff.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SPECS = path.join(ROOT, 'specs');
export const TOKENS_JSON = path.join(ROOT, 'packages/tokens/dist/tokens.json');

export function loadSpecs(dir = path.join(SPECS, 'components')) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.spec.json'))
    .sort()
    .map((f) => ({ file: `specs/components/${f}`, spec: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
}

export function loadTokens() {
  if (!fs.existsSync(TOKENS_JSON)) {
    throw new Error('No existe packages/tokens/dist/tokens.json. Ejecuta primero: npm run tokens');
  }
  const { tokens, modes } = JSON.parse(fs.readFileSync(TOKENS_JSON, 'utf8'));
  return { list: tokens, byPath: new Map(tokens.map((t) => [t.path, t])), modes };
}

export const STATE_PREFIX = {
  hover: ['hover:'],
  active: ['active:'],
  focus: ['focus:'],
  'focus-visible': ['focus-visible:'],
  disabled: ['disabled:', 'aria-disabled:'],
  invalid: ['aria-invalid:'],
};

const tail = (tokenPath, n) => tokenPath.split('.').slice(n).join('-');

// Propiedad de estilo + token semántico → utilidad Tailwind (generada por packages/tokens/dist/theme.css)
export function styleToClasses(prop, value, state) {
  switch (prop) {
    case 'background': return [`bg-${tail(value, 2)}`];
    case 'color': return value.startsWith('color.icon.') ? [`text-icon-${tail(value, 2)}`] : [`text-${tail(value, 2)}`];
    case 'border-color': return [`border-${tail(value, 2)}`];
    case 'outline-color': return [`outline-${tail(value, 2)}`];
    case 'border-width': return [`border-(length:--${value.replace(/\./g, '-')})`];
    case 'border-bottom-width': return [`border-b-(length:--${value.replace(/\./g, '-')})`];
    case 'border-top-width': return [`border-t-(length:--${value.replace(/\./g, '-')})`];
    case 'outline-width': {
      const v = `--${value.replace(/\./g, '-')}`;
      return state === 'focus-visible' ? [`outline-(length:${v})`, `outline-offset-(length:${v})`] : [`outline-(length:${v})`];
    }
    case 'radius': return [`rounded-${tail(value, 1)}`];
    case 'height': return [`h-${tail(value, 1)}`];
    case 'min-height': return [`min-h-${tail(value, 1)}`];
    case 'size': return [`size-${tail(value, 1)}`];
    case 'max-width': return [`max-w-${tail(value, 2)}`];
    case 'padding': return [`p-${tail(value, 1)}`];
    case 'padding-inline': return [`px-${tail(value, 1)}`];
    case 'padding-block': return [`py-${tail(value, 1)}`];
    case 'gap': return [`gap-${tail(value, 1)}`];
    case 'typography': return [`text-${tail(value, 1)}`];
    case 'shadow': return [`shadow-${tail(value, 1)}`];
    case 'z-index': return [`z-(--${value.replace(/\./g, '-')})`];
    case 'opacity': return [`opacity-(--${value.replace(/\./g, '-')})`];
    default: throw new Error(`Propiedad de estilo desconocida: ${prop}`);
  }
}

const LAYOUT = {
  display: { flex: 'flex', 'inline-flex': 'inline-flex', grid: 'grid', block: 'block', 'inline-block': 'inline-block', none: 'hidden' },
  direction: { row: 'flex-row', column: 'flex-col' },
  align: { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch', baseline: 'items-baseline' },
  justify: { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between' },
  wrap: { true: 'flex-wrap' },
  width: { full: 'w-full', auto: 'w-auto', fit: 'w-fit' },
  position: { static: 'static', relative: 'relative', sticky: 'sticky' },
  pin: { top: 'top-0' },
  center: { true: 'mx-auto' },
  cursor: { pointer: 'cursor-pointer', 'not-allowed': 'cursor-not-allowed' },
  transition: { colors: 'transition-colors', shadow: 'transition-shadow', all: 'transition' },
  whitespace: { nowrap: 'whitespace-nowrap' },
  select: { none: 'select-none' },
  outline: { none: 'outline-none', solid: 'outline-solid' },
};
export function layoutToClasses(layout) {
  return Object.entries(layout).flatMap(([k, v]) => (LAYOUT[k]?.[String(v)] ? [LAYOUT[k][String(v)]] : []));
}

export function stylesToClasses(styles = {}, state) {
  const out = [];
  for (const [prop, value] of Object.entries(styles)) {
    if (prop === 'layout') out.push(...layoutToClasses(value));
    else out.push(...styleToClasses(prop, value, state));
  }
  const prefixes = state ? STATE_PREFIX[state] : [''];
  return prefixes.flatMap((p) => out.map((c) => p + c));
}

// Estilos por parte: { root: {...}, label: {...} } (+ states) → { root: 'clases', label: 'clases' }
export function entryToClasses(entry = {}) {
  const parts = {};
  const push = (part, classes) => {
    if (!classes.length) return;
    parts[part] = [...(parts[part] ?? []), ...classes];
  };
  for (const [part, styles] of Object.entries(entry)) {
    if (part === 'states' || part === 'description' || part === 'when') continue;
    push(part, stylesToClasses(styles));
  }
  for (const [state, byPart] of Object.entries(entry.states ?? {})) {
    for (const [part, styles] of Object.entries(byPart)) push(part, stylesToClasses(styles, state));
  }
  return Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, v.join(' ')]));
}

// Todas las referencias a tokens de un spec, con su ubicación (para validar y para el diff).
export function collectStyleRefs(spec) {
  const refs = [];
  const walkStyles = (where, styles) => {
    for (const [prop, value] of Object.entries(styles ?? {})) {
      if (prop !== 'layout') refs.push({ where: `${where}.${prop}`, prop, value });
    }
  };
  const walkEntry = (where, entry) => {
    for (const [part, styles] of Object.entries(entry ?? {})) {
      if (['states', 'description', 'when'].includes(part)) continue;
      walkStyles(`${where}.${part}`, styles);
    }
    for (const [state, byPart] of Object.entries(entry?.states ?? {})) {
      for (const [part, styles] of Object.entries(byPart)) walkStyles(`${where}.states.${state}.${part}`, styles);
    }
  };
  walkEntry('base', { ...spec.base, states: spec.states });
  for (const [prop, values] of Object.entries(spec.variants ?? {})) {
    for (const [val, entry] of Object.entries(values)) walkEntry(`variants.${prop}.${val}`, entry);
  }
  (spec.compounds ?? []).forEach((c, i) => walkEntry(`compounds[${i}]`, c));
  return refs;
}

// Semántica de cascada del contrato: una variante que define una propiedad REEMPLAZA a la de base.
// Como las clases de Tailwind del mismo tipo no tienen orden garantizado, antes de generar se mueve
// la propiedad de base a cada valor de la variante que no la redefine. Así nunca coexisten
// h-interactive-md y h-interactive-lg en el mismo elemento.
export function normalizeCascade(spec) {
  const s = structuredClone(spec);
  const baseEntry = { ...s.base, states: s.states ?? {} };
  const get = (entry, state, part) => (state === 'default' ? entry[part] : entry.states?.[state]?.[part]);
  const ensure = (entry, state, part) => {
    if (state === 'default') return (entry[part] ??= {});
    entry.states ??= {};
    entry.states[state] ??= {};
    return (entry.states[state][part] ??= {});
  };
  const keysOf = (entry) => {
    const keys = [];
    for (const [part, st] of Object.entries(entry)) {
      if (['states', 'description', 'when'].includes(part)) continue;
      for (const prop of Object.keys(st)) keys.push(['default', part, prop]);
    }
    for (const [state, byPart] of Object.entries(entry.states ?? {}))
      for (const [part, st] of Object.entries(byPart)) for (const prop of Object.keys(st)) keys.push([state, part, prop]);
    return keys;
  };
  for (const values of Object.values(s.variants ?? {})) {
    const overridden = new Set();
    for (const entry of Object.values(values)) for (const [st, part, prop] of keysOf(entry)) if (prop !== 'layout') overridden.add(`${st}|${part}|${prop}`);
    for (const key of overridden) {
      const [st, part, prop] = key.split('|');
      const baseStyles = get(baseEntry, st, part);
      if (!baseStyles || !(prop in baseStyles)) continue;
      const baseValue = baseStyles[prop];
      delete baseStyles[prop];
      for (const entry of Object.values(values)) {
        const target = ensure(entry, st, part);
        if (!(prop in target)) target[prop] = baseValue;
      }
    }
  }
  const { states, ...base } = baseEntry;
  s.base = base;
  s.states = states;
  return s;
}

export const camel =(s) => s[0].toLowerCase() + s.slice(1);
