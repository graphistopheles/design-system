// Pruebas de accesibilidad derivadas de los contratos: cada `example` y cada combinación de props
// se monta y pasa por axe-core. Los contratos se leen en ejecución (no hay lista que mantener).
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { adapters } from './adapters';
import { checkA11y, loadSpecs, propCombinations } from './support';

const specs = loadSpecs();

describe('cobertura de andamios', () => {
  it.each(specs.map((s) => s.name))('%s tiene adaptador de prueba', (name) => {
    expect(adapters[name], `Falta la entrada de ${name} en tests/adapters.tsx`).toBeTypeOf('function');
  });
  it('cada contrato declara al menos un example', () => {
    const sin = specs.filter((s) => !s.examples?.length).map((s) => s.name);
    expect(sin, 'Contratos sin examples').toEqual([]);
  });
});

describe.each(specs)('$name · examples del contrato', (spec) => {
  it.each(spec.examples ?? [])('axe sin violaciones: $name', async (ex) => {
    const { container } = render(adapters[spec.name](ex.props ?? {}, ex.content ?? {}));
    expect(await checkA11y(container)).toEqual([]);
  });
});

describe.each(specs)('$name · matriz de props', (spec) => {
  const combos = propCombinations(spec);
  it(`axe sin violaciones en las ${combos.length} combinaciones`, async () => {
    const fallos: string[] = [];
    for (const props of combos) {
      const { container, unmount } = render(adapters[spec.name](props, {}));
      const v = await checkA11y(container);
      if (v.length) fallos.push(`${JSON.stringify(props)} → ${v.join('; ')}`);
      unmount();
    }
    expect(fallos).toEqual([]);
  });
});
