import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axe from 'axe-core';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../../..');

export interface Spec {
  name: string;
  props: Record<string, { type: string; values?: string[]; default?: unknown }>;
  examples?: { name: string; props?: Record<string, unknown>; content?: Record<string, string> }[];
}

/** Los contratos son la única fuente: las pruebas los leen en ejecución, no hay copia que mantener. */
export const loadSpecs = (): Spec[] =>
  fs
    .readdirSync(path.join(ROOT, 'specs/components'))
    .filter((f) => f.endsWith('.spec.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'specs/components', f), 'utf8')));

/**
 * axe-core sobre un contenedor. El contraste de color queda fuera porque jsdom no calcula estilos:
 * lo verifica scripts/validate-specs.mjs (WCAG 2.2 AA sobre tokens y variantes) en CI.
 * `region` se desactiva porque un componente suelto no es una página.
 */
export async function checkA11y(container: Element): Promise<string[]> {
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return results.violations.map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

/** Combinaciones de las props enumeradas y booleanas del contrato (las que cambian estructura o estilo). */
export function propCombinations(spec: Spec, cap = 300): Record<string, unknown>[] {
  const axes = Object.entries(spec.props)
    .filter(([, p]) => p.type === 'enum' || p.type === 'boolean')
    .map(([k, p]) => [k, p.type === 'enum' ? (p.values as string[]) : [false, true]] as const);
  let out: Record<string, unknown>[] = [{}];
  for (const [k, values] of axes) out = out.flatMap((o) => values.map((v) => ({ ...o, [k]: v })));
  return out.slice(0, cap);
}

/** Requisitos MUST / MUST NOT de specs/requirements/*.md, numerados por archivo en orden de aparición. */
export function loadMusts(): { id: string; text: string }[] {
  const dir = path.join(ROOT, 'specs/requirements');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .flatMap((f) => {
      const prefix = f.replace(/\.a11y\.md$/, '').replace(/\.md$/, '');
      return fs
        .readFileSync(path.join(dir, f), 'utf8')
        .split('\n')
        .filter((l) => /^- MUST( NOT)?:/.test(l))
        .map((text, i) => ({ id: `${prefix}#${i + 1}`, text: text.replace(/^- /, '') }));
    });
}
