// Round trip de TOKENS: compara las variables de Figma con las que generan los contratos (specs/tokens).
//   1) En Figma ejecuta scripts/figma/extract-variables.figma.js con mode "digest" y guarda la salida en
//      scripts/figma/.roundtrip-tokens.json  como  { "digest": <salida> }.
//   2) node scripts/figma-roundtrip-tokens.mjs
//        - digest igual  -> ✔ y termina (código 0).
//        - digest distinto -> te dice qué modo ejecutar después: "names" por colección, luego "lines" por variable.
//          Agrega cada salida al mismo JSON:  { "digest": …, "names": { "<colección>": <hashes> }, "lines": <líneas> }.
//   3) node scripts/figma-roundtrip-tokens.mjs --apply   escribe en specs/tokens lo que se puede llevar al contrato
//      de forma segura (color primitivo y alias semántico). Lo demás se lista como edición manual.
// Después: npm run check  y  npm run diff  (el semver de un token es patch).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, SPECS } from './lib/specs.mjs';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const input = args.find((a) => !a.startsWith('--')) ?? path.join(ROOT, 'scripts/figma/.roundtrip-tokens.json');

// ---------- lado repo: reconstruye los tokens y serializa en la misma línea canónica que el extractor ----------
execFileSync(process.execPath, [path.join(ROOT, 'packages/tokens/build.mjs')], { stdio: 'ignore' });
const built = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/tokens/dist/figma-variables.json'), 'utf8'));
const hash = (s) => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x.toString(36); };
const lineOf = (c, v) => [
  v.name, v.type[0], [...v.scopes].sort().join(','),
  c.modes.map((m) => {
    const x = v.valuesByMode[m];
    if (x.alias) return '@' + x.alias;
    if (v.type === 'COLOR') return '#' + x.value.slice(1).toUpperCase();
    return typeof x.value === 'number' ? String(Math.round(x.value * 10000) / 10000) : String(x.value);
  }).join('¦'),
  v.codeSyntax.WEB,
].join('|');
const header = (c) => '#' + c.name + '|' + c.modes.join(',') + '|' + c.hiddenFromPublishing;
const repo = new Map(); // colección -> { count, hash, lines: Map(nombre -> línea) }
for (const c of built.collections) {
  const lines = new Map(c.variables.map((v) => [v.name, lineOf(c, v)]));
  repo.set(c.name, { count: lines.size, hash: hash(header(c) + '\n' + [...lines.values()].sort().join('\n')), lines });
}

// ---------- lado Figma ----------
if (!fs.existsSync(input)) { console.error(`✖ No existe ${path.relative(ROOT, input)}. Ejecuta extract-variables.figma.js (mode "digest") y guarda { "digest": <salida> } ahí.`); process.exit(2); }
const data = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!data.digest) { console.error('✖ Falta "digest" en el archivo de entrada.'); process.exit(2); }

const figma = new Map(data.digest.collections.map((c) => [c.name, c]));
const problems = [];
const differing = [];
for (const [name, r] of repo) {
  const f = figma.get(name);
  if (!f) { problems.push(`Colección \`${name}\` falta en Figma`); continue; }
  if (f.hash !== r.hash) differing.push(name);
}
for (const name of figma.keys()) if (!repo.has(name)) problems.push(`Colección \`${name}\` existe en Figma pero no en el contrato`);

const total = [...repo.values()].reduce((n, c) => n + c.count, 0);
if (differing.length === 0 && problems.length === 0) {
  console.log(`Round trip de tokens · ${repo.size} colecciones · ${total} variables`);
  console.log('✔ Diff vacío: las variables de Figma coinciden con los contratos.');
  process.exit(0);
}
problems.forEach((p) => console.log('✖ ' + p));

// ---------- nivel 2: qué variables difieren ----------
const changed = []; // { name, collection, kind }
const needNames = differing.filter((n) => !data.names?.[n]);
if (needNames.length) {
  console.log(`✖ Difieren: ${differing.join(', ')}  (repo ${differing.map((n) => repo.get(n).count).join('/')} vs Figma ${differing.map((n) => figma.get(n).count).join('/')} variables)`);
  console.log('\nSiguiente paso: ejecuta extract-variables.figma.js en Figma y agrega la salida a', path.relative(ROOT, input));
  for (const n of needNames) console.log(`   mode "names", args { "collection": "${n}" }   ->  "names": { "${n}": <salida.hashes> }`);
  process.exit(1);
}
for (const cname of differing) {
  const figHashes = data.names[cname].hashes ?? data.names[cname];
  const lines = repo.get(cname).lines;
  for (const [name, line] of lines) {
    if (!(name in figHashes)) changed.push({ name, collection: cname, kind: 'falta en Figma' });
    else if (figHashes[name] !== hash(line)) changed.push({ name, collection: cname, kind: 'difiere' });
  }
  for (const name of Object.keys(figHashes)) if (!lines.has(name)) changed.push({ name, collection: cname, kind: 'solo en Figma' });
}
if (changed.length === 0) { console.log('✖ La colección difiere en su configuración (modos o publicación), no en variables.'); process.exit(1); }

// ---------- nivel 3: detalle ----------
const figLines = data.lines?.lines ?? data.lines ?? {};
const need = changed.filter((c) => c.kind !== 'falta en Figma' && !(c.name in figLines)).map((c) => c.name);
console.log(`\n✖ ${changed.length} variable(s) difieren:`);
const parse = (line) => { const [name, type, scopes, vals, code] = line.split('|'); return { name, type, scopes, vals: vals.split('¦'), code }; };
const applyPlan = [];

// ---------- comparación a tres bandas (ADR-0004 §5.2): base (rama de referencia) · contrato · Figma ----------
const gitq = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } };
const baseArg = args.includes('--base') ? args[args.indexOf('--base') + 1] : null;
const BASE = baseArg ?? (gitq('rev-parse', '--verify', 'origin/main') ? 'origin/main' : gitq('rev-parse', '--verify', 'main') ? 'main' : null);
const baseFiles = BASE ? (gitq('ls-tree', '-r', '--name-only', BASE, 'specs/tokens/primitives', 'specs/tokens/semantic') ?? '').split('\n').filter((f) => f.endsWith('.json')) : [];
const norm = (v) => (typeof v === 'string' ? (v.startsWith('{') ? '@' + v.slice(1, -1).replace(/\./g, '/') : /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : null) : null);
/** Valor de una variable en la base, en la misma notación que la línea de Figma (@alias o #RRGGBB); null si no se puede saber. */
const baseValue = (name) => {
  const hits = [];
  for (const f of baseFiles) {
    let node; try { node = JSON.parse(gitq('show', `${BASE}:${f}`)); } catch { continue; }
    for (const k of name.split('/')) node = node?.[k];
    if (node && typeof node === 'object' && '$value' in node) hits.push(norm(node.$value));
  }
  return hits.length === 1 ? hits[0] : null;
};
/** convergente · superficie-atrasada (solo cambió el contrato) · figma-adelantado (solo cambió Figma) · conflicto (los tres difieren) · sin-base */
const classify = (b, c, f) => (c === f ? 'convergente' : b == null ? 'sin-base' : f === b ? 'superficie-atrasada' : c === b ? 'figma-adelantado' : 'conflicto');

for (const c of changed) {
  const want = repo.get(c.collection).lines.get(c.name);
  const got = figLines[c.name];
  if (c.kind === 'falta en Figma') { console.log(` - \`${c.name}\` (${c.collection}): existe en el contrato y falta en Figma`); continue; }
  if (!got) { console.log(` - \`${c.name}\` (${c.collection}): ${c.kind} · sin detalle todavía`); continue; }
  const P = { want: want && parse(want), got: parse(got) };
  const single = P.want && P.want.vals.length === 1 && P.got.vals.length === 1;
  const b = single ? baseValue(c.name) : null;
  const cls = single ? classify(b, P.want.vals[0], P.got.vals[0]) : 'sin-base';
  console.log(` - \`${c.name}\` (${c.collection}): ${c.kind} · clase: ${cls}\n     base (${BASE ?? 'sin base'}): ${b ?? '—'}\n     contrato: ${want ?? '—'}\n     Figma:    ${got}`);
  applyPlan.push({ ...c, ...P, cls });
}
if (need.length) {
  console.log('\nSiguiente paso: mode "lines", args { "names": ' + JSON.stringify(need.slice(0, 40)) + ' }  ->  "lines": <salida>');
  process.exit(1);
}

// ---------- --apply: llevar al contrato lo que es seguro ----------
const tokenFiles = ['primitives', 'semantic'].flatMap((d) => fs.readdirSync(path.join(SPECS, 'tokens', d)).filter((f) => f.endsWith('.json')).map((f) => path.join(SPECS, 'tokens', d, f)));
const find = (name) => {
  const hits = [];
  for (const file of tokenFiles) {
    const root = JSON.parse(fs.readFileSync(file, 'utf8'));
    let node = root;
    for (const k of name.split('/')) node = node?.[k];
    if (node && typeof node === 'object' && '$value' in node) hits.push({ file, root, node });
  }
  return hits;
};
/** Cambia el "$value" de la hoja `parts` sin tocar el resto del archivo. Devuelve null si no lo encuentra o si el resultado no valida. */
function patchValue(text, parts, next) {
  let pos = 0;
  for (const k of parts) {
    const re = new RegExp('"' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s*:\\s*\\{', 'g');
    re.lastIndex = pos;
    const m = re.exec(text);
    if (!m) return null;
    pos = m.index + m[0].length;
  }
  const vre = /"\$value"\s*:\s*"[^"]*"/g;
  vre.lastIndex = pos;
  const m = vre.exec(text);
  if (!m) return null;
  const out = text.slice(0, m.index) + m[0].replace(/"[^"]*"$/, JSON.stringify(next)) + text.slice(m.index + m[0].length);
  try {
    let node = JSON.parse(out);
    for (const k of parts) node = node?.[k];
    return node?.$value === next ? out : null;
  } catch { return null; }
}

const manual = [];
const touched = new Map();
if (APPLY) {
  for (const p of applyPlan) {
    if (p.kind !== 'difiere' || !p.want) { manual.push(`\`${p.name}\`: ${p.kind} (variable nueva o eliminada: requiere ADR)`); continue; }
    // Solo se lleva al contrato lo que Figma cambió y el contrato no (ADR-0004): aplicar otra clase borraría el cambio del otro lado.
    if (p.cls !== 'figma-adelantado') {
      const why = { conflicto: 'CONFLICTO: base, contrato y Figma difieren; lo decide una persona (etiqueta needs-decision)', 'superficie-atrasada': 'solo cambió el contrato: Figma está atrasado, regénéralo con ds-specs-to-figma', 'sin-base': 'no se pudo determinar el valor base; revisa a mano' }[p.cls] ?? p.cls;
      manual.push(`\`${p.name}\`: no aplicado · ${why}`); continue;
    }
    if (p.want.scopes !== p.got.scopes || p.want.code !== p.got.code || p.want.type !== p.got.type) { manual.push(`\`${p.name}\`: cambió scopes, code syntax o tipo (lo genera build.mjs; no se copia)`); continue; }
    if (p.got.vals.length !== 1) { manual.push(`\`${p.name}\`: variable multimodo, edítala a mano en specs/tokens/semantic`); continue; }
    const v = p.got.vals[0];
    const hits = find(p.name);
    if (hits.length !== 1) { manual.push(`\`${p.name}\`: ${hits.length === 0 ? 'no está en specs/tokens' : 'está en varios archivos'}`); continue; }
    const { file, root, node } = hits[0];
    const isSemantic = p.collection !== 'Primitives';
    let next;
    if (v.startsWith('@')) next = '{' + v.slice(1).replace(/\//g, '.') + '}';
    else if (p.got.type === 'C' && !isSemantic) next = v.toUpperCase();
    else if (p.got.type === 'C') { manual.push(`\`${p.name}\`: un semántico con valor crudo (${v}) es un error de Figma; debe ser alias`); continue; }
    else { manual.push(`\`${p.name}\`: valor ${p.got.type === 'F' ? 'numérico' : 'de texto'} (${v}); revisa la unidad en el contrato`); continue; }
    if (isSemantic && !next.startsWith('{')) { manual.push(`\`${p.name}\`: un semántico debe ser alias`); continue; }
    if (!touched.has(file)) touched.set(file, fs.readFileSync(file, 'utf8'));
    // parche de texto sobre el valor: no se reserializa el JSON (JS reordenaría las claves numéricas y el diff sería ruido)
    const patched = patchValue(touched.get(file), p.name.split('/'), next);
    if (patched === null) { manual.push(`\`${p.name}\`: no pude ubicar el valor en ${path.relative(ROOT, file)}`); continue; }
    touched.set(file, patched);
    console.log(`   ✎ ${path.relative(ROOT, file)} · ${p.name.replace(/\//g, '.')} → ${next}`);
  }
  for (const [file, text] of touched) fs.writeFileSync(file, text);
  console.log(`\n${touched.size ? '✔ Escribí ' + touched.size + ' archivo(s) de tokens. Ahora: npm run check && npm run diff' : 'Nada que escribir automáticamente.'}`);
} else {
  const safe = applyPlan.filter((p) => p.cls === 'figma-adelantado').length;
  console.log(safe ? `\n${safe} cambio(s) de Figma se pueden llevar al contrato con --apply (solo \`figma-adelantado\`).` : '\nNada se puede llevar al contrato con --apply: ninguna variable es `figma-adelantado`.');
  for (const p of applyPlan.filter((x) => x.cls === 'conflicto')) console.log(`⚠ CONFLICTO en \`${p.name}\`: escalar a una persona (needs-decision); no aplicar ni regenerar.`);
}
if (manual.length) { console.log('\nRequiere edición manual:'); manual.forEach((m) => console.log(' - ' + m)); }
process.exit(APPLY && touched.size ? 0 : 1);
