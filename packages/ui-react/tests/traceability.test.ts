// Trazabilidad requisito → verificación. Si se añade un MUST a specs/requirements/*.md, esta prueba falla
// hasta que alguien lo cubra con una prueba ([id]) o declare en requirements.other.ts qué otro mecanismo lo cubre.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { otherMechanisms } from './requirements.other';
import { loadMusts } from './support';

const here = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs
  .readdirSync(here)
  .filter((f) => /\.test\.tsx?$/.test(f) && f !== 'traceability.test.ts')
  .map((f) => fs.readFileSync(path.join(here, f), 'utf8'))
  .join('\n');
const musts = loadMusts();
const etiquetas = new Set([...fuente.matchAll(/\[([a-z]+#\d+)\]/g)].map((m) => m[1]));

describe('trazabilidad de requisitos MUST', () => {
  it.each(musts)('$id · $text', ({ id }) => {
    const probado = etiquetas.has(id);
    const otro = id in otherMechanisms;
    expect(probado || otro, `El requisito ${id} no tiene prueba [${id}] ni entrada en tests/requirements.other.ts`).toBe(true);
    expect(probado && otro, `${id} está probado Y declarado como "otro mecanismo": quítalo de requirements.other.ts`).toBe(false);
  });

  it('las etiquetas de las pruebas apuntan a requisitos que existen', () => {
    const ids = new Set(musts.map((m) => m.id));
    expect([...etiquetas].filter((e) => !ids.has(e))).toEqual([]);
  });

  it('requirements.other.ts no tiene entradas obsoletas', () => {
    const ids = new Set(musts.map((m) => m.id));
    expect(Object.keys(otherMechanisms).filter((k) => !ids.has(k))).toEqual([]);
  });
});
