// Proyección de un contrato a los "hechos" que Figma puede expresar (misma forma que scripts/figma/extract-facts.figma.js).
// Es la mitad "esperada" del round trip specs -> Figma -> specs: si el hash de una capa en Figma coincide con el de aquí,
// esa capa refleja el contrato sin pérdida. Debe mantenerse en sincronía con scripts/figma/render-component.figma.js.

export const canon = (o) => JSON.stringify(Object.keys(o).sort().reduce((a, k) => { a[k] = o[k]; return a; }, {}));
export const hash = (s) => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x.toString(36); };

/** "variant=primary, size=md, state=hover" -> { variant, size, state } */
export const parseVariant = (name) => Object.fromEntries(name.split(', ').map((p) => p.split('=')));

/** Estilo resuelto de una parte: base -> variantes -> compounds -> estado (mismo orden que el motor de render). */
export function styleFor(spec, part, combo) {
  const out = {};
  const add = (o) => { if (o && o[part]) for (const [k, v] of Object.entries(o[part])) out[k] = k === 'layout' ? Object.assign({}, out.layout, v) : v; };
  add(spec.base);
  for (const k of Object.keys(spec.variants ?? {})) add((spec.variants[k] ?? {})[combo[k]]);
  for (const cp of spec.compounds ?? []) if (Object.keys(cp.when).every((k) => combo[k] === cp.when[k])) add(cp);
  const st = combo.state;
  if (st && st !== 'default') {
    add((spec.states ?? {})[st]);
    for (const k of Object.keys(spec.variants ?? {})) { const vv = (spec.variants[k] ?? {})[combo[k]]; if (vv?.states) add(vv.states[st]); }
  }
  return out;
}

const AL = { center: 'CENTER', start: 'MIN', end: 'MAX' };

/**
 * @param spec    contrato
 * @param combo   valores de variante ({variant, size, state})
 * @param layers  [[path, kind]] tal como los reporta Figma
 * @returns       { path: hechos | null }  (null = capa que no se compara: instance/shape/other)
 */
export function expectedFacts(spec, combo, layers) {
  const nameOf = (p) => p.split('/').pop();
  const eff = (path, key) => {
    const parts = path.split('/'); let v;
    for (let i = 0; i < parts.length; i++) { const s = styleFor(spec, i === 0 ? 'root' : parts[i], combo); if (s[key]) v = s[key]; }
    return v;
  };
  const out = {};
  for (const [path, kind] of layers) {
    const st = styleFor(spec, path === 'root' ? 'root' : nameOf(path), combo);
    if (kind === 'text') { out[path] = { color: eff(path, 'color'), typography: eff(path, 'typography') ?? 'typography.body-3' }; continue; }
    if (kind === 'icon') { out[path] = { size: st.size ?? 'size.icon.sm', color: eff(path, 'color') }; continue; }
    if (kind !== 'frame') { out[path] = null; continue; }

    const L = st.layout ?? {};
    const f = { dir: L.direction === 'column' ? 'VERTICAL' : 'HORIZONTAL' };
    f.align = L.align ? (AL[L.align] ?? 'MIN') : st.height ? 'CENTER' : 'MIN';
    f.justify = L.justify ? (L.justify === 'between' ? 'SPACE_BETWEEN' : (AL[L.justify] ?? 'MIN')) : 'MIN';
    // un hijo con layout.center centra al padre en su eje (regla del motor de render)
    for (const [cp, ck] of layers) {
      if (ck !== 'frame' || cp === path || cp.slice(0, cp.lastIndexOf('/')) !== path) continue;
      if (styleFor(spec, nameOf(cp), combo).layout?.center) { if (f.dir === 'HORIZONTAL') f.justify = 'CENTER'; else f.align = 'CENTER'; }
    }
    if (L.wrap) f.wrap = true;
    if (st.background) f.background = st.background;
    if (st['border-color'] && (st['border-width'] || st['border-bottom-width'])) {
      f['stroke-color'] = st['border-color'];
      if (st['border-bottom-width'] && !st['border-width']) f['stroke-bottom'] = st['border-bottom-width'];
      else for (const s of ['top', 'right', 'bottom', 'left']) f['stroke-' + s] = st['border-width'];
    }
    if (st['outline-color'] && st['outline-width']) { f['outline-color'] = st['outline-color']; f['outline-width'] = st['outline-width']; }
    else if (st.shadow) f.shadow = st.shadow;
    if (st.radius) f.radius = st.radius;
    const pad = (sides, tok) => { for (const s of sides) f['padding-' + s] = tok; };
    if (st.padding) pad(['left', 'right', 'top', 'bottom'], st.padding);
    if (st['padding-inline']) pad(['left', 'right'], st['padding-inline']);
    if (st['padding-block']) pad(['top', 'bottom'], st['padding-block']);
    if (st.gap) f.gap = st.gap;
    if (st.height) f.height = st.height;
    if (st['max-width']) f['max-width'] = st['max-width'];
    out[path] = f;
  }
  return out;
}

/** Quita claves undefined y calcula el hash canónico de una capa. */
export const hashFacts = (f) => (f === null ? '-' : hash(canon(JSON.parse(JSON.stringify(f)))));
