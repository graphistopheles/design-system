// Round trip specs -> Figma -> specs: compara lo que Figma contiene con lo que dicen los contratos.
//   1) En Figma, ejecuta scripts/figma/extract-facts.figma.js (mode "hashes") y guarda la salida en
//      scripts/figma/.roundtrip-input.json  (o pásala como primer argumento).
//   2) node scripts/figma-roundtrip.mjs  ->  diff por componente / variante / capa. Sale con código 1 si no está vacío.
// Comprueba: propiedades de variante (valores), propiedades TEXT/BOOLEAN, anatomía y los hechos de estilo de cada capa
// (variables ligadas, text styles, effect styles). Un valor suelto (raw:) o un token distinto aparece como diferencia.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadSpecs } from './lib/specs.mjs';
import { expectedFacts, hashFacts, parseVariant, hash } from './lib/figma-projection.mjs';

const flagArgs = process.argv.slice(2);
const digestFile = flagArgs.includes('--digest') ? flagArgs[flagArgs.indexOf('--digest') + 1] : null;
const input = flagArgs.find((a, i) => !a.startsWith('--') && flagArgs[i - 1] !== '--digest') ?? path.join(ROOT, 'scripts/figma/.roundtrip-input.json');
if (!fs.existsSync(input)) { console.error(`✖ No existe ${path.relative(ROOT, input)}. Ejecuta extract-facts.figma.js en Figma y guarda su salida ahí.`); process.exit(2); }
const { sets } = JSON.parse(fs.readFileSync(input, 'utf8'));

// --digest <archivo>: salida de extract-facts.figma.js (mode "digest"). Si coincide con la extracción guardada, esa extracción
// sigue describiendo a Figma: se marca como vigente (mtime) y se compara contra los contratos actuales.
if (digestFile) {
  const cd = (v) => (Array.isArray(v) ? '[' + v.map(cd).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + cd(v[k])).join(',') + '}' : JSON.stringify(v));
  const { digests } = JSON.parse(fs.readFileSync(path.resolve(digestFile), 'utf8'));
  const stale = sets.filter((x) => digests[x.name] !== hash(cd({ defs: x.defs, layers: x.layers, alt: x.alt, h: x.h }))).map((x) => x.name);
  const extra = Object.keys(digests).filter((n) => !sets.some((x) => x.name === n));
  if (stale.length || extra.length) { console.error(`✖ Figma cambió desde la última extracción completa (${[...stale, ...extra].join(', ')}). Ejecuta extract-facts.figma.js con mode "hashes" y guarda la salida en ${path.relative(ROOT, input)}.`); process.exit(2); }
  const now = new Date(); fs.utimesSync(input, now, now);
}
const specs = new Map(loadSpecs().map((s) => [s.spec.name, s.spec]));

const diffs = [];
const say = (c, msg) => diffs.push(`${c}: ${msg}`);
let variantsChecked = 0, layersChecked = 0;

for (const spec of specs.values()) if (!sets.some((s) => s.name === spec.name)) say(spec.name, 'no existe como component set en Figma');

for (const set of sets) {
  const spec = specs.get(set.name);
  if (!spec) { say(set.name, 'component set sin contrato en /specs'); continue; }
  if (set.version && set.version !== spec.version) say(set.name, `versión en Figma ${set.version} ≠ contrato ${spec.version}`);

  // --- propiedades de variante: cada valor del contrato debe existir; ningún valor desconocido ---
  const styleProps = new Set(Object.keys(spec.variants ?? {}));
  for (const cp of spec.compounds ?? []) Object.keys(cp.when).forEach((k) => styleProps.add(k));
  for (const k of styleProps) {
    const p = spec.props[k];
    const expected = p?.type === 'boolean' ? ['true', 'false'] : (p?.values ?? Object.keys(spec.variants[k] ?? {}));
    const got = set.defs.variant[k];
    if (!got) { say(set.name, `falta la propiedad de variante \`${k}\``); continue; }
    for (const v of expected) if (!got.includes(v)) say(set.name, `\`${k}\`: falta el valor \`${v}\``);
    for (const v of got) if (!expected.includes(v) && v !== 'none') say(set.name, `\`${k}\`: valor \`${v}\` no está en el contrato`);
  }
  const known = new Set([...styleProps, 'state']);
  for (const k of Object.keys(set.defs.variant)) if (!known.has(k)) say(set.name, `propiedad de variante \`${k}\` no existe en el contrato`);

  // --- propiedades de contenido: TEXT por texto, show-<parte> por parte opcional ---
  for (const [k, a] of Object.entries(spec.anatomy)) if (a.optional && !set.defs.bool.includes('show-' + k)) say(set.name, `falta la propiedad BOOLEAN \`show-${k}\` (parte opcional)`);
  for (const [k, p] of Object.entries(spec.props)) if (p.type === 'slot' && p.required && !set.defs.text.includes(k) && !set.layers.some((l) => l.startsWith('root/' + k + ':')) && !JSON.stringify(set.layers).includes('/' + k + ':')) say(set.name, `slot requerido \`${k}\` sin capa ni propiedad`);

  // --- anatomía: cada parte del contrato existe como capa ---
  const names = new Set(set.layers.map((l) => l.split(':')[0].split('/').pop()));
  for (const k of Object.keys(spec.anatomy)) if (k !== 'root' && !names.has(k)) say(set.name, `la parte \`${k}\` de la anatomía no existe como capa`);

  // --- hechos de estilo por capa y variante ---
  for (const [vname, hs] of Object.entries(set.h)) {
    variantsChecked++;
    const combo = parseVariant(vname);
    const structure = (set.alt[vname] ?? set.layers).map((s) => s.split(':'));
    const exp = expectedFacts(spec, combo, structure);
    const got = hs.split(',');
    structure.forEach(([p, kind], i) => {
      if (kind === 'instance' || kind === 'shape' || kind === 'other') return;
      layersChecked++;
      const want = hashFacts(exp[p]);
      if (want !== got[i]) say(set.name, `\`${vname}\` · \`${p}\`: difiere (esperado ${want}, Figma ${got[i]}) · hechos esperados ${JSON.stringify(exp[p])}`);
    });
  }
}

console.log(`Round trip · ${sets.length} component sets · ${variantsChecked} variantes · ${layersChecked} capas comparadas`);
if (diffs.length === 0) { console.log('✔ Diff vacío: Figma refleja los contratos sin pérdida.'); process.exit(0); }
console.log(`✖ ${diffs.length} diferencia(s):`);
diffs.slice(0, 40).forEach((d) => console.log(' - ' + d));
if (diffs.length > 40) console.log(` … y ${diffs.length - 40} más`);
console.log('Para ver los hechos reales de una capa: extract-facts.figma.js con mode "drill" y { set, variant, path }.');
process.exit(1);
