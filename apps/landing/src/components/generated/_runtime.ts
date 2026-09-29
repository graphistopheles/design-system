// GENERADO por scripts/generate-components.mjs. No editar a mano.
type Classes = Record<string, string>;
export interface Styles {
  parts: readonly string[];
  base: Classes;
  variants: Record<string, Record<string, Classes>>;
  compounds: readonly { when: Record<string, unknown>; classes: Classes }[];
}

/** Une base + variantes + compuestos por parte. Las clases extra (capa "extensions") se agregan en el componente. */
export function resolve(styles: Styles, props: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string[]> = Object.fromEntries(styles.parts.map((p) => [p, []]));
  const add = (c: Classes | undefined) => {
    for (const [part, cls] of Object.entries(c ?? {})) out[part]?.push(cls);
  };
  add(styles.base);
  for (const [prop, values] of Object.entries(styles.variants)) add(values[String(props[prop])]);
  for (const c of styles.compounds) {
    if (Object.entries(c.when).every(([k, v]) => String(props[k]) === String(v))) add(c.classes);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join(' ')]));
}
