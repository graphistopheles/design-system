// Clasificación semver automática a partir del diff de specs (guía §4, reglas de versionado).
//   MAJOR: quitar/renombrar una prop, quitar un valor de enum, cambiar el tipo de una prop,
//          quitar una parte de la anatomía, quitar un token semántico.
//   MINOR: agregar prop, valor de enum, parte de anatomía, componente o token semántico.
//   PATCH: cambiar el token asignado a una variante/estado, o el alias de un semántico.
// Uso: node scripts/spec-diff.mjs [ref-base]   (por defecto origin/main)
// Escribe spec-diff.md (para comentar el PR) y falla si la versión de un componente no sube lo suficiente.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, loadSpecs, collectStyleRefs } from './lib/specs.mjs';

const base = process.argv[2] ?? 'origin/main';
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const atBase = (p) => {
  try { return JSON.parse(git('show', `${base}:${p}`)); } catch { return null; }
};
try { git('rev-parse', '--verify', base); } catch {
  console.log(`ℹ No existe la referencia "${base}" (¿primer commit?). Sin diff que clasificar.`);
  process.exit(0);
}
const listAtBase = (dir) => {
  try { return git('ls-tree', '--name-only', `${base}`, `${dir}/`).split('\n').filter(Boolean); } catch { return []; }
};

const RANK = { none: 0, patch: 1, minor: 2, major: 3 };
const max = (a, b) => (RANK[a] >= RANK[b] ? a : b);
const bumpOf = (from, to) => {
  const [a, b] = [from, to].map((v) => v.split('.').map(Number));
  if (b[0] > a[0]) return 'major';
  if (b[0] === a[0] && b[1] > a[1]) return 'minor';
  if (b[0] === a[0] && b[1] === a[1] && b[2] > a[2]) return 'patch';
  return 'none';
};

const report = [];
const failures = [];

// ---------- Componentes ----------
const current = new Map(loadSpecs().map((s) => [s.file, s.spec]));
const previousFiles = listAtBase('specs/components').filter((f) => f.endsWith('.spec.json'));
for (const f of previousFiles) if (!current.has(f)) report.push({ name: path.basename(f), level: 'major', changes: ['componente eliminado'] });

for (const [file, spec] of current) {
  const prev = atBase(file);
  const changes = [];
  let level = 'none';
  const note = (l, msg) => { level = max(level, l); changes.push(`**${l}** · ${msg}`); };
  if (!prev) { report.push({ name: spec.name, level: 'minor', changes: ['componente nuevo'] }); continue; }

  for (const [k, p] of Object.entries(prev.props)) {
    const c = spec.props[k];
    if (!c) { note('major', `prop \`${k}\` eliminada o renombrada`); continue; }
    if (c.type !== p.type) note('major', `prop \`${k}\`: tipo ${p.type} → ${c.type}`);
    for (const v of p.values ?? []) if (!(c.values ?? []).includes(v)) note('major', `prop \`${k}\`: valor \`${v}\` eliminado`);
    for (const v of c.values ?? []) if (!(p.values ?? []).includes(v)) note('minor', `prop \`${k}\`: valor \`${v}\` agregado`);
    if (c.required && !p.required) note('major', `prop \`${k}\` ahora es requerida`);
    if (JSON.stringify(c.default) !== JSON.stringify(p.default)) note('minor', `prop \`${k}\`: default ${p.default} → ${c.default}`);
  }
  for (const k of Object.keys(spec.props)) if (!prev.props[k]) note('minor', `prop \`${k}\` agregada`);
  for (const k of Object.keys(prev.anatomy)) if (!spec.anatomy[k]) note('major', `parte \`${k}\` eliminada de la anatomía`);
  for (const k of Object.keys(spec.anatomy)) if (!prev.anatomy[k]) note('minor', `parte \`${k}\` agregada a la anatomía`);

  const refs = (s) => new Map(collectStyleRefs(s).map((r) => [r.where, r.value]));
  const [a, b] = [refs(prev), refs(spec)];
  for (const [w, v] of b) if (a.get(w) !== v) note('patch', `\`${w}\`: ${a.get(w) ?? '—'} → ${v}`);
  for (const [w, v] of a) if (!b.has(w)) note('patch', `\`${w}\`: ${v} → —`);
  if (JSON.stringify(prev.base?.root?.layout) !== JSON.stringify(spec.base?.root?.layout)) note('patch', 'layout de root modificado');

  if (level === 'none') continue;
  const got = bumpOf(prev.version, spec.version);
  report.push({ name: spec.name, level, changes, from: prev.version, to: spec.version, got });
  if (RANK[got] < RANK[level]) failures.push(`${spec.name}: el cambio es ${level.toUpperCase()} pero la versión va de ${prev.version} a ${spec.version} (${got}).`);
}

// ---------- Tokens semánticos ----------
const flatten = (obj, prefix = []) =>
  Object.entries(obj).flatMap(([k, v]) =>
    k.startsWith('$') ? [] : v && typeof v === 'object' && '$value' in v ? [[[...prefix, k].join('.'), JSON.stringify(v.$value)]] : v && typeof v === 'object' ? flatten(v, [...prefix, k]) : [],
  );
const semDir = 'specs/tokens/semantic';
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const curFiles = fs.readdirSync(path.join(ROOT, semDir)).filter((f) => f.endsWith('.json')).map((f) => `${semDir}/${f}`);
const tokCur = new Map(curFiles.flatMap((f) => flatten(read(f)).map(([k, v]) => [`${path.basename(f)}:${k}`, v])));
const tokPrev = new Map(listAtBase(semDir).filter((f) => f.endsWith('.json')).flatMap((f) => flatten(atBase(f) ?? {}).map(([k, v]) => [`${path.basename(f)}:${k}`, v])));
const tokChanges = [];
let tokLevel = 'none';
for (const [k, v] of tokPrev) {
  if (!tokCur.has(k)) { tokLevel = max(tokLevel, 'major'); tokChanges.push(`**major** · \`${k}\` eliminado`); }
  else if (tokCur.get(k) !== v) { tokLevel = max(tokLevel, 'patch'); tokChanges.push(`**patch** · \`${k}\`: ${v} → ${tokCur.get(k)}`); }
}
for (const k of tokCur.keys()) if (!tokPrev.has(k)) { tokLevel = max(tokLevel, 'minor'); tokChanges.push(`**minor** · \`${k}\` agregado`); }
if (tokLevel !== 'none') report.push({ name: 'Tokens semánticos', level: tokLevel, changes: tokChanges });

// ---------- Salida ----------
const overall = report.reduce((acc, r) => max(acc, r.level), 'none');
const md = [
  `## Clasificación semver de specs · **${overall.toUpperCase()}**`,
  `Comparado contra \`${base}\`.`,
  '',
  ...report.flatMap((r) => [
    `### ${r.name} · ${r.level}${r.from ? ` · ${r.from} → ${r.to}` : ''}`,
    ...r.changes.map((c) => `- ${c}`),
    '',
  ]),
  failures.length ? `### ✖ Versiones insuficientes\n${failures.map((f) => `- ${f}`).join('\n')}` : report.length ? '✔ Las versiones reflejan el alcance de los cambios.' : 'Sin cambios en specs.',
].join('\n');
fs.writeFileSync(path.join(ROOT, 'spec-diff.md'), md);
console.log(md);
if (failures.length) process.exit(1);
