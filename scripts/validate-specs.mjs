// Valida los contratos de /specs/components:
//  1. Esquema JSON (specs/schema/component.schema.json)
//  2. Cada token referenciado existe y es SEMÁNTICO (un componente nunca consume un primitivo)
//  3. Coherencia: variantes ↔ props, partes ↔ anatomía, requisitos existentes
//  4. Contraste WCAG 2.2 AA para cada combinación de variantes y estados
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { ROOT, SPECS, loadSpecs, loadTokens, collectStyleRefs, normalizeCascade } from './lib/specs.mjs';

const schema = JSON.parse(fs.readFileSync(path.join(SPECS, 'schema/component.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const tokens = loadTokens();

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

// ---------- contraste ----------
const hex = (v) => {
  const m = String(v).match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
};
const lum = (rgb) => {
  const [r, g, b] = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const colorOf = (p) => hex(tokens.byPath.get(p)?.value);
const isLarge = (typo) => {
  if (!typo) return false;
  const size = parseFloat(tokens.byPath.get(`${typo}.font-size`)?.value);
  const weight = Number(tokens.byPath.get(`${typo}.font-weight`)?.value);
  return size >= 24 || (size >= 18.66 && weight >= 700);
};

function combos(spec) {
  const dims = Object.entries(spec.variants ?? {}).map(([prop, values]) => Object.keys(values).map((v) => [prop, v]));
  return dims.reduce((acc, d) => acc.flatMap((a) => d.map((x) => [...a, x])), [[]]).map((c) => Object.fromEntries(c));
}
const merge = (target, entry, state) => {
  for (const [part, styles] of Object.entries(entry ?? {})) {
    if (['states', 'description', 'when'].includes(part)) continue;
    Object.assign((target[part] ??= {}), styles);
  }
  if (state !== 'default') {
    for (const [part, styles] of Object.entries(entry?.states?.[state] ?? {})) Object.assign((target[part] ??= {}), styles);
  }
};

function checkContrast(file, raw) {
  const spec = normalizeCascade(raw);
  const seen = new Set();
  for (const combo of combos(spec)) {
    for (const state of ['default', 'hover', 'active', 'focus-visible', 'focus']) {
      const eff = {};
      merge(eff, { ...spec.base, states: spec.states }, state);
      for (const [prop, val] of Object.entries(combo)) merge(eff, spec.variants[prop][val], state);
      for (const c of spec.compounds ?? []) {
        if (Object.entries(c.when).every(([k, v]) => String(combo[k] ?? spec.props[k]?.default) === String(v))) merge(eff, c, state);
      }
      const rootBg = eff.root?.background ?? 'color.bg.canvas';
      for (const [part, st] of Object.entries(eff)) {
        const bg = st.background ?? rootBg;
        const checks = [];
        if (st.color) checks.push({ fg: st.color, min: isLarge(st.typography) ? 3 : 4.5, kind: 'texto' });
        if (st['outline-color'] && st.layout?.outline === 'solid') checks.push({ fg: st['outline-color'], bgOverride: 'color.bg.canvas', min: 3, kind: 'foco' });
        for (const c of checks) {
          const b = c.bgOverride ?? bg;
          const key = `${part}|${c.fg}|${b}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const [f, g] = [colorOf(c.fg), colorOf(b)];
          if (!f || !g) continue;
          const r = ratio(f, g);
          if (r < c.min) err(file, `contraste ${c.kind} ${r.toFixed(2)}:1 < ${c.min}:1 en ${part} (${c.fg} sobre ${b}) · ${JSON.stringify(combo)} · ${state}`);
        }
      }
    }
  }
  for (const pair of raw.contrast ?? []) {
    const [f, g] = [colorOf(pair.fg), colorOf(pair.bg)];
    if (!f || !g) { err(file, `par de contraste con token inexistente: ${pair.fg} / ${pair.bg}`); continue; }
    const r = ratio(f, g);
    const min = pair.min ?? 4.5;
    if (r < min) err(file, `contraste ${r.toFixed(2)}:1 < ${min}:1 (${pair.fg} sobre ${pair.bg})`);
  }
}

// ---------- validación ----------
const specs = loadSpecs();
const names = new Set();
for (const { file, spec } of specs) {
  if (!validate(spec)) {
    for (const e of validate.errors) err(file, `esquema ${e.instancePath || '/'} ${e.message}`);
    continue;
  }
  if (names.has(spec.name)) err(file, `nombre duplicado ${spec.name}`);
  names.add(spec.name);

  // Tokens
  for (const r of collectStyleRefs(spec)) {
    const probe = r.prop === 'typography' ? `${r.value}.font-size` : r.value;
    const t = tokens.byPath.get(probe);
    if (!t) err(file, `${r.where}: el token "${r.value}" no existe. Si el caso no lo resuelve ningún semántico, créalo primero en /specs/tokens/semantic.`);
    else if (t.tier === 'primitive') err(file, `${r.where}: "${r.value}" es un PRIMITIVO. Un componente nunca consume primitivos.`);
  }

  // Partes
  const parts = new Set(Object.keys(spec.anatomy));
  const checkParts = (where, entry) => {
    for (const k of Object.keys(entry ?? {})) {
      if (['states', 'description', 'when'].includes(k)) continue;
      if (!parts.has(k)) err(file, `${where}: la parte "${k}" no está en anatomy`);
    }
    for (const [st, byPart] of Object.entries(entry?.states ?? {})) checkParts(`${where}.states.${st}`, byPart);
  };
  checkParts('base', spec.base);
  for (const [st, byPart] of Object.entries(spec.states ?? {})) checkParts(`states.${st}`, byPart);

  // Variantes ↔ props
  for (const [prop, values] of Object.entries(spec.variants ?? {})) {
    const p = spec.props[prop];
    if (!p) { err(file, `variants.${prop}: no existe la prop "${prop}"`); continue; }
    const expected = p.type === 'enum' ? p.values : p.type === 'boolean' ? ['true', 'false'] : null;
    if (!expected) { err(file, `variants.${prop}: solo props enum o boolean pueden tener variantes`); continue; }
    const got = Object.keys(values);
    for (const v of expected) if (!got.includes(v)) err(file, `variants.${prop}: falta el valor "${v}"`);
    for (const v of got) if (!expected.includes(v)) err(file, `variants.${prop}: "${v}" no es un valor de la prop`);
    for (const [v, entry] of Object.entries(values)) checkParts(`variants.${prop}.${v}`, entry);
  }
  (spec.compounds ?? []).forEach((c, i) => {
    for (const [k, v] of Object.entries(c.when)) {
      const p = spec.props[k];
      if (!p) err(file, `compounds[${i}].when: prop "${k}" inexistente`);
      else if (p.type === 'enum' && !p.values.includes(String(v))) err(file, `compounds[${i}].when.${k}: valor "${v}" inválido`);
    }
    checkParts(`compounds[${i}]`, c);
  });
  for (const [k, p] of Object.entries(spec.props)) {
    if (p.type === 'enum' && !p.values.includes(p.default)) err(file, `props.${k}.default "${p.default}" no está en values`);
  }

  // Requisitos
  for (const req of spec.requirements ?? []) {
    if (!fs.existsSync(path.join(SPECS, req))) err(file, `requisito inexistente: specs/${req}`);
  }
  if (!(spec.requirements ?? []).some((r) => r.includes('.a11y.'))) warnings.push(`${file}: sin requisitos de accesibilidad (*.a11y.md)`);

  checkContrast(file, spec);
}

// Pares globales del sistema (texto sobre superficies)
const GLOBAL_PAIRS = [
  ['color.text.primary', 'color.bg.canvas'], ['color.text.secondary', 'color.bg.canvas'], ['color.text.tertiary', 'color.bg.canvas'],
  ['color.text.primary', 'color.bg.surface-subtle'], ['color.text.secondary', 'color.bg.surface-secondary'],
  ['color.text.link', 'color.bg.canvas'], ['color.text.brand', 'color.bg.canvas'], ['color.text.brand', 'color.bg.brand-subtle'],
  ['color.text.on-dark', 'color.bg.surface-dark'], ['color.text.on-dark-secondary', 'color.bg.surface-dark'],
  ['color.text.on-brand', 'color.bg.brand'], ['color.text.success', 'color.bg.success'], ['color.text.error', 'color.bg.error'],
];
for (const [fg, bg] of GLOBAL_PAIRS) {
  const [f, g] = [colorOf(fg), colorOf(bg)];
  if (!f || !g) { err('tokens', `par global con token inexistente: ${fg} / ${bg}`); continue; }
  const r = ratio(f, g);
  if (r < 4.5) err('tokens', `contraste ${r.toFixed(2)}:1 < 4.5:1 (${fg} sobre ${bg})`);
}

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  console.error(errors.map((e) => `✖ ${e}`).join('\n'));
  console.error(`\n${errors.length} error(es) en los contratos.`);
  process.exit(1);
}
console.log(`✔ ${specs.length} contratos válidos · tokens semánticos · contraste WCAG 2.2 AA`);
