// Borde Figma -> specs (tokens). Cuerpo de una función async(mode, args) para figma_execute (plugin Desktop Bridge).
// Lee las colecciones de variables y las serializa a la misma "línea canónica" que scripts/figma-roundtrip-tokens.mjs
// calcula desde packages/tokens/dist/figma-variables.json:
//   nombre | tipo(C/F/S) | scopes ordenados | valor por modo (alias como @nombre, color #RRGGBB, número a 4 decimales) | code syntax web
//
//   mode "digest" (por defecto): { collections: [{ name, count, hash }] }   -> ~300 bytes; si coincide con el repo, no hay más que hacer
//   mode "names":  args { collection }  -> { collection, hashes: { nombre: hash } }   (solo para colecciones que difieren)
//   mode "lines":  args { names: [...] } -> { lines: { nombre: línea } }               (detalle de las variables que difieren)

mode = mode || 'digest';
args = args || {};
const hash = (s) => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x.toString(36); };
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const byId = new Map();
for (const c of cols) for (const id of c.variableIds) byId.set(id, await figma.variables.getVariableByIdAsync(id));
const h2 = (n) => Math.round(n * 255).toString(16).padStart(2, '0').toUpperCase();

const lineOf = (c, v) => [
  v.name, v.resolvedType[0], v.scopes.slice().sort().join(','),
  c.modes.map((m) => {
    const x = v.valuesByMode[m.modeId];
    if (x && x.type === 'VARIABLE_ALIAS') return '@' + byId.get(x.id).name;
    if (x && typeof x === 'object') return '#' + h2(x.r) + h2(x.g) + h2(x.b);
    return typeof x === 'number' ? String(Math.round(x * 10000) / 10000) : String(x);
  }).join('¦'),
  v.codeSyntax.WEB || '',
].join('|');
const header = (c) => '#' + c.name + '|' + c.modes.map((m) => m.name).join(',') + '|' + c.hiddenFromPublishing;
const linesOf = (c) => c.variableIds.map((id) => lineOf(c, byId.get(id))).sort();

if (mode === 'digest') {
  return { collections: cols.map((c) => ({ name: c.name, count: c.variableIds.length, hash: hash(header(c) + '\n' + linesOf(c).join('\n')) })) };
}
if (mode === 'names') {
  const c = cols.find((x) => x.name === args.collection);
  if (!c) return { error: 'colección no encontrada: ' + args.collection };
  const hashes = {};
  for (const id of c.variableIds) { const v = byId.get(id); hashes[v.name] = hash(lineOf(c, v)); }
  return { collection: c.name, hashes };
}
if (mode === 'lines') {
  const want = new Set(args.names || []);
  const lines = {};
  for (const c of cols) for (const id of c.variableIds) { const v = byId.get(id); if (want.has(v.name)) lines[v.name] = lineOf(c, v); }
  return { lines };
}
return { error: 'mode desconocido: ' + mode };
