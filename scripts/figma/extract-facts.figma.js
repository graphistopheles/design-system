// Borde Figma -> specs (lectura). Cuerpo de una función async(mode, args) para figma_execute (plugin Desktop Bridge).
// Lee los component sets de la página "Componentes" y devuelve "hechos" de estilo por capa expresados en el vocabulario del
// contrato: nombres de token (color.bg.fill-primary), no valores. Un valor sin variable sale como "raw:<valor>" (valor suelto).
//
//   mode "hashes" (por defecto): { sets: [{ name, id, version, defs, layers, alt, h }] }  -> entrada de scripts/figma-roundtrip.mjs
//   mode "drill":  args { set, variant, path }  -> hechos completos de una capa, para ver qué difiere.
//   args.only?: ["Button", ...] limita los sets.
//
// El hash de cada capa usa el mismo JSON canónico (claves ordenadas) y el mismo hash que scripts/lib/figma-projection.mjs.

mode = mode || 'hashes';
args = args || {};
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const NAMES = new Map();
for (const c of cols) for (const id of c.variableIds) { const v = await figma.variables.getVariableByIdAsync(id); NAMES.set(v.id, v.name.replace(/\//g, '.')); }
const vn = (id) => (id && NAMES.get(id)) || 'unknown-var';
const hex = (c) => '#' + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
const bv = (node, field) => { const b = node.boundVariables && node.boundVariables[field]; return b ? (Array.isArray(b) ? b[0] : b).id : null; };
const paintFact = (p) => (p.boundVariables && p.boundVariables.color ? vn(p.boundVariables.color.id) : 'raw:' + hex(p.color));
const canon = (o) => JSON.stringify(Object.keys(o).sort().reduce((a, k) => { a[k] = o[k]; return a; }, {}));
const hash = (s) => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x.toString(36); };

const kindOf = (n) => {
  if (n.type === 'TEXT') return 'text';
  if (n.type === 'INSTANCE') return 'instance';
  if (n.type === 'FRAME' || n.type === 'COMPONENT') {
    if (n.children.length === 1 && n.children[0].type === 'VECTOR') return 'icon';
    if (n.children.length === 0 && n.layoutMode === 'NONE') return 'shape';
    return 'frame';
  }
  return 'other';
};

const factsOf = async (n, kind) => {
  const f = {};
  if (kind === 'text') {
    const fl = n.fills.filter((p) => p.visible !== false);
    if (fl[0]) f.color = paintFact(fl[0]);
    if (n.textStyleId) {
      const s = await figma.getStyleByIdAsync(n.textStyleId);
      const [g, rest] = s.name.split('/');
      f.typography = 'typography.' + (g === 'Heading' ? 'heading-' + rest.toLowerCase() : g.toLowerCase() + '-' + rest.split(' ')[1]);
    }
    return f;
  }
  if (kind === 'icon') {
    const id = bv(n, 'width'); f.size = id ? vn(id) : 'raw:' + n.width;
    const st = n.children[0].strokes.filter((p) => p.visible !== false);
    if (st[0]) f.color = paintFact(st[0]);
    return f;
  }
  // frame
  f.dir = n.layoutMode; f.align = n.counterAxisAlignItems; f.justify = n.primaryAxisAlignItems;
  if (n.layoutWrap === 'WRAP') f.wrap = true;
  const fl = n.fills.filter((p) => p.visible !== false);
  if (fl[0]) f.background = paintFact(fl[0]);
  const st = n.strokes.filter((p) => p.visible !== false);
  if (st[0]) {
    const sides = [['top', 'strokeTopWeight'], ['right', 'strokeRightWeight'], ['bottom', 'strokeBottomWeight'], ['left', 'strokeLeftWeight']];
    if (sides.some(([, fld]) => n[fld] > 0)) {
      f['stroke-color'] = paintFact(st[0]);
      for (const [s, fld] of sides) if (n[fld] > 0) { const id = bv(n, fld); f['stroke-' + s] = id ? vn(id) : 'raw:' + n[fld]; }
    }
  }
  const ef = n.effects.filter((e) => e.visible !== false);
  if (ef[0] && ef[0].type === 'DROP_SHADOW' && ef[0].radius === 0 && ef[0].offset.x === 0 && ef[0].offset.y === 0) {
    const b = ef[0].boundVariables || {};
    f['outline-color'] = b.color ? vn(b.color.id) : 'raw:' + hex(ef[0].color);
    f['outline-width'] = b.spread ? vn(b.spread.id) : 'raw:' + ef[0].spread;
  }
  if (n.effectStyleId) { const es = await figma.getStyleByIdAsync(n.effectStyleId); if (es) f.shadow = 'shadow.' + es.name.split('/')[1]; }
  { const id = bv(n, 'topLeftRadius'); if (id) f.radius = vn(id); else if (n.topLeftRadius > 0) f.radius = 'raw:' + n.topLeftRadius; }
  for (const S of ['Left', 'Right', 'Top', 'Bottom']) { const id = bv(n, 'padding' + S); if (id) f['padding-' + S.toLowerCase()] = vn(id); else if (n['padding' + S] > 0) f['padding-' + S.toLowerCase()] = 'raw:' + n['padding' + S]; }
  { const id = bv(n, 'itemSpacing'); if (id) f.gap = vn(id); else if (n.itemSpacing > 0 && n.children.length > 1) f.gap = 'raw:' + n.itemSpacing; }
  { const id = bv(n, 'height'); if (id) f.height = vn(id); }
  { const id = bv(n, 'maxWidth'); if (id) f['max-width'] = vn(id); }
  return f;
};

const walk = async (node, path, out) => {
  const kind = kindOf(node);
  out.push({ path, kind, node });
  if (kind === 'frame') for (const ch of node.children) await walk(ch, path + '/' + ch.name, out);
};

const page = figma.root.children.find((p) => p.name === 'Componentes');
if (!page) return { error: 'No existe la página "Componentes"' };
const sets = page.findAll((n) => n.type === 'COMPONENT_SET' && (!args.only || args.only.includes(n.name)));

if (mode === 'drill') {
  const s = sets.find((x) => x.name === args.set);
  const v = s && s.children.find((c) => c.name === args.variant);
  if (!v) return { error: 'variante no encontrada' };
  const layers = []; await walk(v, 'root', layers);
  const l = layers.find((x) => x.path === args.path);
  return l ? { kind: l.kind, facts: await factsOf(l.node, l.kind) } : { error: 'capa no encontrada', paths: layers.map((x) => x.path) };
}

const result = [];
for (const s of sets) {
  const defs = { variant: {}, text: [], bool: [] };
  for (const [k, d] of Object.entries(s.componentPropertyDefinitions)) {
    if (d.type === 'VARIANT') defs.variant[k] = d.variantOptions;
    else if (d.type === 'TEXT') defs.text.push(k.split('#')[0]);
    else if (d.type === 'BOOLEAN') defs.bool.push(k.split('#')[0]);
  }
  let layers = null; const alt = {}; const h = {};
  for (const v of s.children) {
    const ls = []; await walk(v, 'root', ls);
    const sig = ls.map((l) => l.path + ':' + l.kind);
    if (!layers) layers = sig; else if (sig.join() !== layers.join()) alt[v.name] = sig;
    h[v.name] = (await Promise.all(ls.map(async (l) => (l.kind === 'instance' || l.kind === 'shape' || l.kind === 'other') ? '-' : hash(canon(await factsOf(l.node, l.kind)))))).join(',');
  }
  result.push({ name: s.name, id: s.id, version: s.getPluginData('specVersion'), defs, layers, alt, h });
}
return { sets: result };
