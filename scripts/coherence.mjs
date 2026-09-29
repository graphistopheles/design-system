// Informe de coherencia entre contrato, código y Figma (parte determinística del agente ds-guardian, ver ADR-0004).
//   node scripts/coherence.mjs [--base <ref>] [--ci] [--json]
// Ejecuta las comprobaciones existentes, clasifica la deriva y escribe coherence-report.md.
//   ✔ medido y coincide · ✖ medido y difiere · ○ no medido o desactualizado (no cuenta como éxito)
// Los chequeos de Figma leen las salidas de los extractores (scripts/figma/.roundtrip-*.json) que guarda el agente con el MCP.
// Con --ci no se miden (no hay sesión de Figma): salen como ○. Código de salida 1 si algo está en ✖.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { ROOT } from './lib/specs.mjs';

const argv = process.argv.slice(2);
const CI = argv.includes('--ci');
const JSON_OUT = argv.includes('--json');
const baseArg = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : null;

const node = (script, ...a) => {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...a], { cwd: ROOT, encoding: 'utf8' });
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.replace(/\x1b\[[0-9;]*m/g, '').trim() };
};
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const tail = (s, n = 8) => s.split('\n').filter(Boolean).slice(-n).join('\n');

const base = baseArg ?? (git('rev-parse', '--verify', 'origin/main') ? 'origin/main' : git('rev-parse', '--verify', 'main') ? 'main' : null);
const results = [];
const add = (r) => results.push(r);

// ---------- 1-4. Contrato y código ----------
let r = node('packages/tokens/build.mjs');
add({ surface: 'Contrato', check: 'Tokens y regla de capas', status: r.code === 0 ? 'ok' : 'fail', detail: r.code === 0 ? tail(r.out, 1) : tail(r.out), drift: 'violacion', action: 'Corregir specs/tokens: un componente no consume primitivos y todo semántico es alias' });

r = node('scripts/validate-specs.mjs');
add({ surface: 'Contrato', check: 'Esquema, tokens y contraste WCAG AA', status: r.code === 0 ? 'ok' : 'fail', detail: r.code === 0 ? tail(r.out, 1) : tail(r.out), drift: 'violacion', action: 'Corregir el contrato; si el fallo es de contraste, el gate manda (ADR-0004 §5.3)' });

r = node('scripts/generate-components.mjs', '--check');
add({ surface: 'Código', check: 'Código generado al día con el contrato', status: r.code === 0 ? 'ok' : 'fail', detail: r.code === 0 ? tail(r.out, 1) : tail(r.out), drift: 'superficie-atrasada', action: '`npm run generate`; si alguien editó un archivo generado a mano, se revierte y se regenera' });

r = node('scripts/lint-consumption.mjs');
add({ surface: 'Código', check: 'Superficies de código usan solo tokens semánticos', status: r.code === 0 ? 'ok' : 'fail', detail: r.code === 0 ? tail(r.out, 1) : tail(r.out), drift: 'violacion', action: 'Reemplazar el valor suelto por un token semántico; si falta, proponerlo con ADR (ds-code-to-specs)' });

// ---------- 5. Semver contra la base ----------
let contractChanged = false;
if (base) {
  r = node('scripts/spec-diff.mjs', base);
  const level = (r.out.match(/semver de specs · \*\*(\w+)\*\*/) ?? [])[1] ?? 'NONE';
  contractChanged = level !== 'NONE';
  add({ surface: 'Contrato', check: `Semver contra ${base}`, status: r.code === 0 ? 'ok' : 'fail', detail: r.code === 0 ? (contractChanged ? `cambio ${level}: ${tail(r.out.split('\n').filter((l) => l.startsWith('### ')).join('\n'), 4)}` : 'sin cambios respecto a la base') : tail(r.out), drift: 'violacion', action: 'Subir `version` del componente según la clasificación' });
} else add({ surface: 'Contrato', check: 'Semver', status: 'skip', detail: 'no hay rama base para comparar', drift: null, action: '' });

// ---------- 6. Extensiones repetidas en la landing (informativo) ----------
{
  // Superficies escritas a mano: .astro de la landing (class) y .tsx de la webapp (className).
  const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
  const files = [...walk(path.join(ROOT, 'apps/landing/src')), ...walk(path.join(ROOT, 'apps/webapp/src'))].filter((f) => /\.(astro|tsx)$/.test(f) && !f.includes(`${path.sep}components${path.sep}`));
  const seen = new Map();
  for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/<(Button|Badge|Card|Input|Header)\b[^>]*?\bclass(?:Name)?="([^"]+)"/g)) {
    for (const cls of m[2].split(/\s+/)) seen.set(`${m[1]} · ${cls}`, (seen.get(`${m[1]} · ${cls}`) ?? 0) + 1);
  }
  const repeated = [...seen].filter(([, n]) => n >= 2);
  add({ surface: 'Código', check: 'Extensiones repetidas sobre componentes del sistema', status: 'ok', detail: repeated.length ? `candidatas a variante o prop: ${repeated.map(([k, n]) => `${k} ×${n}`).join(', ')}` : 'ninguna', info: repeated.length > 0, drift: repeated.length ? 'codigo-adelantado' : null, action: repeated.length ? 'Evaluar con ds-code-to-specs si merece variante o prop en el contrato' : '' });
}

// ---------- 7-8. Figma (medido por el agente con el MCP) ----------
const newest = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((m, d) => {
  const p = path.join(dir, d.name);
  return Math.max(m, d.isDirectory() ? newest(p) : /\.(json|md)$/.test(d.name) ? fs.statSync(p).mtimeMs : 0);
}, 0);
const specsNewest = newest(path.join(ROOT, 'specs'));
const figmaLeg = (label, inputFile, script) => {
  if (CI) return add({ surface: 'Figma', check: label, status: 'skip', detail: 'no medido en CI (requiere una sesión de Figma con el plugin)', drift: null, action: '' });
  const p = path.join(ROOT, 'scripts/figma', inputFile);
  if (!fs.existsSync(p)) return add({ surface: 'Figma', check: label, status: 'skip', detail: `no medido: falta scripts/figma/${inputFile}`, drift: null, action: 'Ejecutar el extractor en Figma (ver ds-guardian, paso 2)' });
  const dg = path.join(ROOT, 'scripts/figma/.roundtrip-digest.json');
  if (script.endsWith('figma-roundtrip.mjs') && fs.statSync(p).mtimeMs < specsNewest && fs.existsSync(dg) && fs.statSync(dg).mtimeMs >= specsNewest) node(script, '--digest', dg); // digest vigente => la extracción guardada sigue valiendo
  if (fs.statSync(p).mtimeMs < specsNewest) return add({ surface: 'Figma', check: label, status: 'skip', detail: 'desactualizado: los specs cambiaron después de la última lectura de Figma', drift: null, action: 'Volver a ejecutar el extractor en Figma' });
  const res = node(script);
  if (res.code === 2) return add({ surface: 'Figma', check: label, status: 'skip', detail: tail(res.out, 2), drift: null, action: 'Completar la entrada del extractor' });
  // Con la comparación a tres bandas (base · contrato · Figma) cada variable trae su clase; si no la hay (componentes) se usa la heurística.
  const classes = [...new Set([...res.out.matchAll(/clase: ([\w-]+)/g)].map((m) => m[1]))];
  const drift = classes.includes('conflicto') ? 'conflicto' : classes.length === 1 ? classes[0] : classes.length ? classes.join(' + ') : contractChanged ? 'superficie-atrasada o conflicto' : 'figma-adelantado';
  const ACTIONS = {
    conflicto: 'ESCALAR: etiqueta `needs-decision`; no aplicar ni regenerar. Resumen con base, contrato y Figma (formato en ds-guardian) y decide una persona (ADR-0004 §5.2)',
    'superficie-atrasada': 'Solo cambió el contrato: regenerar Figma con ds-specs-to-figma',
    'figma-adelantado': 'Figma cambió sin que el contrato lo sepa: si es su origen natural (ADR-0004 §5.1) llevarlo al contrato con `roundtrip:tokens --apply` o ds-figma-to-specs',
  };
  const action = ACTIONS[drift] ?? (contractChanged ? 'El contrato cambió en esta rama y Figma difiere: regenerar Figma (ds-specs-to-figma) o, si diseño tocó lo mismo, escalar como conflicto' : ACTIONS['figma-adelantado']);
  add({ surface: 'Figma', check: label, status: res.code === 0 ? 'ok' : 'fail', detail: res.code === 0 ? tail(res.out, 1) : tail(res.out, 14), drift, action });
};
figmaLeg('Componentes de Figma vs contrato', '.roundtrip-input.json', 'scripts/figma-roundtrip.mjs');
figmaLeg('Variables de Figma vs contrato', '.roundtrip-tokens.json', 'scripts/figma-roundtrip-tokens.mjs');

// ---------- Informe ----------
const icon = { ok: '✔', fail: '✖', skip: '○' };
const fails = results.filter((x) => x.status === 'fail');
const skips = results.filter((x) => x.status === 'skip');
const verdict = fails.length ? `✖ ${fails.length} deriva(s) por resolver` : skips.length ? `✔ lo medido coincide · ○ ${skips.length} sin medir` : '✔ Sin deriva';
const md = [
  `## Informe de coherencia · ${verdict}`,
  base ? `Base de comparación: \`${base}\`${CI ? ' · modo CI (sin Figma)' : ''}.` : 'Sin rama base.',
  '',
  '| Superficie | Comprobación | Estado | Detalle |',
  '|---|---|---|---|',
  ...results.map((x) => `| ${x.surface} | ${x.check} | ${icon[x.status]} | ${x.detail.split('\n')[0].replace(/\|/g, '\\|')} |`),
  '',
  ...(fails.length ? ['### Qué hacer (ADR-0004)', ...fails.map((x) => `- **${x.check}** · clase \`${x.drift}\` → ${x.action}\n${x.detail.split('\n').map((l) => `  > ${l}`).join('\n')}`), ''] : []),
  ...(results.some((x) => x.info) ? ['### Para evaluar', ...results.filter((x) => x.info).map((x) => `- ${x.check}: ${x.detail} → ${x.action}`), ''] : []),
  ...(skips.length ? ['### Sin medir', ...skips.map((x) => `- ${x.check}: ${x.detail}${x.action ? ' → ' + x.action : ''}`), '', '> ○ no es un éxito: solo lo medido puede darse por coincidente.'] : []),
].join('\n');
fs.writeFileSync(path.join(ROOT, 'coherence-report.md'), md);
if (JSON_OUT) console.log(JSON.stringify({ verdict, base, results }, null, 2)); else console.log(md);
process.exit(fails.length ? 1 : 0);
