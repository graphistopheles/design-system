// Borde specs -> Figma. Cuerpo de una función async(spec, tree, opts) que corre en el sandbox del plugin de Figma.
// Cargado por la skill ds-specs-to-figma (se guarda en figma.root pluginData "dsRender").
// Determinístico: mismo spec -> mismo component set. Todo fill, stroke, padding, gap, radio y tamaño queda ligado
// a una variable de la colección Semantic; los textos, a un text style; las sombras, a un effect style.
//
//   spec  contrato de specs/components/*.spec.json (sin examples/requirements)
//   tree  jerarquía de capas: { root: { label: "text:Etiqueta", icon: "icon", body: { ... } } }
//         valores: objeto = frame · "text:<contenido>" · "icon" · "shape" · "instance:<Componente>"
//         una clave con sufijo "#n" (link#2) repite el nombre de capa sin crear otra propiedad
//   opts  { rootWidth?, prune?: "expresión sobre c", extra?: { prop: [valores extra] }, section?: bool }

const W = [];
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const VAR = new Map(), ALL = new Map();
for (const c of cols) for (const id of c.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id);
  ALL.set(v.id, v);
  if (c.name === 'Semantic') VAR.set(v.name, v);
}
const num = (v) => {
  let x = v.valuesByMode[Object.keys(v.valuesByMode)[0]];
  while (x && x.type === 'VARIABLE_ALIAS') { const t = ALL.get(x.id); x = t.valuesByMode[Object.keys(t.valuesByMode)[0]]; }
  return x;
};
const V = (t) => { const n = t.replace(/\./g, '/'); const v = VAR.get(n); if (!v) W.push('variable inexistente: ' + n); return v; };
const TS = new Map((await figma.getLocalTextStylesAsync()).map((s) => [s.name, s]));
const ES = new Map((await figma.getLocalEffectStylesAsync()).map((s) => [s.name, s]));
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const tsName = (t) => { const p = t.replace('typography.', '').split('-'); return p[0] === 'heading' ? 'Heading/' + p[1].toUpperCase() : cap(p[0]) + '/' + cap(p[0]) + ' ' + p[1]; };
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });

const solid = (v) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v);
const bind = (node, fields, v) => { if (!v) return; for (const f of fields) { try { node.setBoundVariable(f, v); } catch (e) { W.push(f + ': ' + String(e.message).slice(0, 60)); } } };
const SIDES = ['Left', 'Right', 'Top', 'Bottom'];

// ---- resolución de estilos (base -> variantes -> compounds -> estado) ----
const styleFor = (part, c) => {
  const out = {};
  // `layout` se fusiona (como CSS aditivo); el resto de propiedades se reemplaza
  const add = (o) => { if (o && o[part]) for (const [k, v] of Object.entries(o[part])) out[k] = k === 'layout' ? Object.assign({}, out.layout, v) : v; };
  add(spec.base);
  for (const k of Object.keys(spec.variants || {})) add((spec.variants[k] || {})[c[k]]);
  for (const cp of spec.compounds || []) if (Object.keys(cp.when).every((k) => c[k] === cp.when[k])) add(cp);
  const st = c.state;
  if (st && st !== 'default') {
    add((spec.states || {})[st]);
    for (const k of Object.keys(spec.variants || {})) { const vv = (spec.variants[k] || {})[c[k]]; if (vv && vv.states) add(vv.states[st]); }
  }
  return out;
};
const stateValid = (c, st) => {
  if (st === 'default') return true;
  if ((spec.states || {})[st]) return true;
  return Object.keys(spec.variants || {}).some((k) => { const vv = (spec.variants[k] || {})[c[k]]; return vv && vv.states && vv.states[st]; });
};

// ---- matriz de variantes ----
const propNames = Object.keys(spec.variants || {});
for (const cp of spec.compounds || []) for (const k of Object.keys(cp.when)) if (!propNames.includes(k)) propNames.push(k);
const valuesOf = (k) => {
  const p = (spec.props || {})[k] || {};
  let v = p.type === 'boolean' ? ['false', 'true'] : (p.values || Object.keys((spec.variants[k]) || {}));
  return v.concat((opts.extra || {})[k] || []);
};
const ORDER = ['hover', 'active', 'focus', 'focus-visible', 'disabled'];
const stateSet = new Set(Object.keys(spec.states || {}));
for (const k of Object.keys(spec.variants || {})) for (const val of Object.keys(spec.variants[k])) Object.keys((spec.variants[k][val] || {}).states || {}).forEach((s) => stateSet.add(s));
const stateList = ['default'].concat(ORDER.filter((s) => stateSet.has(s) && !opts.noState));
let combos = [{}];
for (const k of propNames) { const n = []; for (const c of combos) for (const v of valuesOf(k)) n.push(Object.assign({}, c, { [k]: v })); combos = n; }
const prune = opts.prune ? new Function('c', 'return ' + opts.prune) : () => false;
combos = combos.filter((c) => !prune(c));
const full = [];
for (const c of combos) for (const st of stateList) if (stateValid(c, st)) full.push(Object.assign({}, c, { state: st }));
const useState = stateList.length > 1;
const finalCombos = full.map((c) => { if (!useState) delete c.state; return c; });

// ---- página y limpieza ----
await figma.loadAllPagesAsync();
let page = figma.root.children.find((p) => p.name === 'Componentes');
if (!page) { page = figma.createPage(); page.name = 'Componentes'; }
await figma.setCurrentPageAsync(page);
for (const n of page.children.filter((n) => n.name === spec.name)) n.remove();
let yCursor = 0;
for (const n of page.children) yCursor = Math.max(yCursor, n.y + n.height + 120);

// ---- construcción de una variante ----
const build = async (c) => {
  const comp = figma.createComponent();
  comp.name = Object.entries(c).map(([k, v]) => k + '=' + v).join(', ');
  page.appendChild(comp);

  const frameStyle = async (node, st, isRoot) => {
    const L = st.layout || {};
    node.layoutMode = L.direction === 'column' ? 'VERTICAL' : 'HORIZONTAL';
    node.primaryAxisSizingMode = 'AUTO'; node.counterAxisSizingMode = 'AUTO';
    node.fills = []; node.clipsContent = false;
    const al = { center: 'CENTER', start: 'MIN', end: 'MAX' };
    if (L.align) node.counterAxisAlignItems = al[L.align] || 'MIN';
    else if (st.height) node.counterAxisAlignItems = 'CENTER'; // altura fija: el contenido se centra, como en un <input>/<button>
    if (L.justify) node.primaryAxisAlignItems = L.justify === 'between' ? 'SPACE_BETWEEN' : (al[L.justify] || 'MIN');
    if (L.wrap) node.layoutWrap = 'WRAP';
    const pad = (sides, tok) => { const v = V(tok); if (!v) return; for (const s of sides) node['padding' + s] = num(v); bind(node, sides.map((s) => 'padding' + s), v); };
    if (st.padding) pad(SIDES, st.padding);
    if (st['padding-inline']) pad(['Left', 'Right'], st['padding-inline']);
    if (st['padding-block']) pad(['Top', 'Bottom'], st['padding-block']);
    if (st.gap) { const v = V(st.gap); node.itemSpacing = num(v); bind(node, ['itemSpacing'], v); }
    if (st.radius) { const v = V(st.radius); const f = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']; f.forEach((k) => node[k] = num(v)); bind(node, f, v); }
    if (st.background) node.fills = [solid(V(st.background))];
    if (st['border-color'] && (st['border-width'] || st['border-bottom-width'])) {
      node.strokes = [solid(V(st['border-color']))]; node.strokeAlign = 'INSIDE';
      if (st['border-bottom-width'] && !st['border-width']) {
        const w = V(st['border-bottom-width']); ['Top', 'Left', 'Right'].forEach((s) => node['stroke' + s + 'Weight'] = 0);
        node.strokeBottomWeight = num(w); bind(node, ['strokeBottomWeight'], w);
      } else {
        const w = V(st['border-width']); const f = SIDES.map((s) => 'stroke' + s + 'Weight'); f.forEach((k) => node[k] = num(w)); bind(node, f, w);
      }
    }
    if (st['outline-color'] && st['outline-width']) {
      const cv = V(st['outline-color']), wv = V(st['outline-width']);
      let e = { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 1 }, offset: { x: 0, y: 0 }, radius: 0, spread: num(wv), visible: true, blendMode: 'NORMAL' };
      e = figma.variables.setBoundVariableForEffect(e, 'color', cv);
      try { e = figma.variables.setBoundVariableForEffect(e, 'spread', wv); } catch (x) { W.push('spread'); }
      node.effects = [e];
    } else if (st.shadow) {
      const es = ES.get('Elevation/' + st.shadow.replace('shadow.', ''));
      if (es) await node.setEffectStyleIdAsync(es.id); else W.push('effect style ' + st.shadow);
    }
  };
  const frameSizing = (node, st, parent, isRoot) => {
    const L = st.layout || {};
    if (isRoot) {
      if (L.width === 'full' && opts.rootWidth) node.resize(opts.rootWidth, node.height); // width: full = ocupa su contenedor; en el lienzo se muestra al ancho de trabajo
    } else if (L.width === 'full' || st['max-width']) {
      node.layoutSizingHorizontal = 'FILL';
    }
    if (st['max-width']) { const v = V(st['max-width']); try { node.maxWidth = num(v); bind(node, ['maxWidth'], v); } catch (x) { W.push('maxWidth'); } }
    if (st.height) {
      const v = V(st.height); node.resize(node.width, num(v));
      if (node.layoutMode === 'HORIZONTAL') node.counterAxisSizingMode = 'FIXED'; else node.primaryAxisSizingMode = 'FIXED';
      bind(node, ['height'], v);
    }
  };

  const mk = async (key, def, parent, inh, isRoot) => {
    const name = key.split('#')[0];
    const st = styleFor(name, c);
    const color = st.color || inh.color, typo = st.typography || inh.typography;
    const inh2 = { color, typography: typo };
    const L = st.layout || {};
    let node;
    if (typeof def === 'string' && def.startsWith('text:')) {
      node = figma.createText(); parent.appendChild(node);
      node.fontName = { family: 'Inter', style: 'Regular' }; node.characters = def.slice(5);
      const ts = TS.get(tsName(typo || 'typography.body-3'));
      if (ts) await node.setTextStyleIdAsync(ts.id); else W.push('text style ' + typo);
      if (color) node.fills = [solid(V(color))];
      if (parent.layoutMode === 'VERTICAL') { node.layoutSizingHorizontal = 'FILL'; node.textAutoResize = 'HEIGHT'; }
    } else if (def === 'icon') {
      node = figma.createFrame(); parent.appendChild(node); node.fills = []; node.clipsContent = false;
      const sv = V(st.size || 'size.icon.sm'); const s = num(sv); node.resize(s, s); bind(node, ['width', 'height'], sv);
      const vec = figma.createVector(); node.appendChild(vec);
      vec.vectorPaths = [{ windingRule: 'NONE', data: 'M 3 8 L 13 8 M 9 4 L 13 8 L 9 12' }];
      vec.fills = []; vec.strokeWeight = 1.5; vec.strokeCap = 'ROUND'; vec.strokeJoin = 'ROUND';
      if (color) vec.strokes = [solid(V(color))];
      vec.x = (s - vec.width) / 2; vec.y = (s - vec.height) / 2; vec.name = 'arrow';
    } else if (def === 'shape') {
      node = figma.createFrame(); parent.appendChild(node); node.resize(24, 24); node.cornerRadius = 6;
      node.fills = [solid(V('color.bg.brand'))];
    } else if (typeof def === 'string' && def.startsWith('instance:')) {
      const set = page.findOne((n) => n.type === 'COMPONENT_SET' && n.name === def.slice(9));
      if (!set) { W.push('instancia inexistente ' + def); return; }
      const base = set.children.find((ch) => ch.name === 'variant=primary, size=sm, state=default') || set.defaultVariant;
      node = base.createInstance(); parent.appendChild(node);
    } else {
      node = isRoot ? comp : figma.createFrame();
      if (!isRoot) parent.appendChild(node);
      await frameStyle(node, st, isRoot);
      if (L.center) { if (parent.layoutMode === 'HORIZONTAL') parent.primaryAxisAlignItems = 'CENTER'; else parent.counterAxisAlignItems = 'CENTER'; }
      for (const [k, d] of Object.entries(def || {})) await mk(k, d, node, inh2, false);
      frameSizing(node, st, parent, isRoot);
    }
    if (!isRoot) node.name = name; // la raíz conserva el nombre de variante "prop=valor, ..."
    return node;
  };
  const rootKey = Object.keys(tree)[0];
  await mk(rootKey, tree[rootKey], comp, {}, true);
  return comp;
};

const comps = [];
for (const c of finalCombos) comps.push(await build(c));

// ---- cuadrícula: filas = props de estilo, columnas = estado ----
const rowKey = (c) => propNames.map((k) => c[k]).join('|');
const rows = [...new Set(finalCombos.map(rowKey))];
const cw = Math.max(...comps.map((x) => x.width)) + 32, ch = Math.max(...comps.map((x) => x.height)) + 32;
comps.forEach((cp, i) => { const c = finalCombos[i]; cp.x = (useState ? stateList.indexOf(c.state) : 0) * cw; cp.y = rows.indexOf(rowKey(c)) * ch; });
const set = figma.combineAsVariants(comps, page);
set.name = spec.name; set.description = spec.purpose || '';
set.setPluginData('specName', spec.name); set.setPluginData('specVersion', spec.version || '');

// ---- propiedades del componente: TEXT por cada texto, BOOLEAN por cada parte opcional ----
const made = [];
const textKeys = []; const seen = new Set();
(function walk(t) { for (const [k, d] of Object.entries(t)) { if (typeof d === 'object') walk(d); else if (String(d).startsWith('text:') && !k.includes('#') && !seen.has(k)) { seen.add(k); textKeys.push([k, String(d).slice(5)]); } } })(tree);
for (const [k, def] of textKeys) {
  const id = set.addComponentProperty(k, 'TEXT', def);
  for (const cp of set.children) { const n = cp.findOne((x) => x.type === 'TEXT' && x.name === k); if (n) n.componentPropertyReferences = { characters: id }; }
  made.push('TEXT ' + k);
}
const optional = Object.keys(spec.anatomy || {}).filter((k) => spec.anatomy[k].optional);
for (const k of optional) {
  const id = set.addComponentProperty('show-' + k, 'BOOLEAN', true); // show-<parte>: no choca con la prop TEXT homónima
  for (const cp of set.children) { const n = cp.findOne((x) => x.name === k); if (n) n.componentPropertyReferences = Object.assign({}, n.componentPropertyReferences, { visible: id }); }
  made.push('BOOL show-' + k);
}

// ---- sección contenedora ----
const sec = figma.createSection(); sec.name = spec.name; sec.x = 0; sec.y = yCursor;
sec.resizeWithoutConstraints(set.width + 96, set.height + 144);
sec.appendChild(set); set.x = 48; set.y = 96;
return { name: spec.name, setId: set.id, variants: comps.length, props: made, size: [Math.round(set.width), Math.round(set.height)], warnings: [...new Set(W)].slice(0, 12) };
