# ADR-0006 · Superficies de código: `ui-core` compartido y andamios por framework

## 1. Metadata
- Autor: Mario (Head of UX) con asistencia de Claude
- Fecha: 2026-09-29
- Estado: Aceptado

## 2. Contexto
El contrato de cada componente ya genera contratos TypeScript y mapas de clases (ADR-0003), pero esa salida vivía dentro de `apps/landing` y solo la consumía Astro. Se quiere que una segunda aplicación, en Next.js, use el mismo sistema.

## 3. Problema
Copiar los componentes a la app de Next o generar una segunda salida duplicaría lo que debe ser una sola verdad: dos copias de las mismas clases pueden divergir sin que ningún contrato lo detecte.

## 4. Alternativas
1. **Generar dos salidas** (una por app). No toca la landing, pero hay dos copias que mantener sincronizadas y el `--check` debe cubrirlas todas.
2. **Web Components** compartidos por ambos frameworks. Una sola implementación, pero complica el renderizado en servidor y la integración con enrutamiento y formularios de cada framework.
3. **Salida generada única en un paquete + un andamio por framework** (elegida).

## 5. Decisión
- `packages/ui-core` (`@ds-ia/core`) contiene lo que genera `scripts/generate-components.mjs`: interfaz TypeScript y mapa de clases por parte. No depende de ningún framework y no se edita a mano.
- Cada superficie escribe a mano un **andamio** que solo aporta estructura HTML, semántica, accesibilidad y la capa "extensions":
  - `apps/landing/src/components/*.astro` (Astro).
  - `packages/ui-react/src/*.tsx` (`@ds-ia/react`, usado por `apps/webapp`, Next.js).
- Los andamios no llevan estilos propios. Los enlaces se resuelven en el andamio (`linkAs`, p. ej. `next/link`); no forman parte del contrato.
- Tailwind v4 solo escanea la app; cada app declara con `@source` los paquetes del workspace cuyas clases usa.
- El lint de consumo cubre todas las superficies escritas a mano: `apps/landing/src`, `apps/webapp/src` y `packages/ui-react/src`.

## 6. Consecuencias
- (+) Una sola salida generada: un cambio en el contrato llega a Astro y a React sin pasos manuales.
- (+) Añadir un componente exige un andamio por superficie; el generador avisa de los que faltan.
- (−) Cada framework nuevo implica un andamio nuevo por componente (30 a 60 líneas) y su propia validación de accesibilidad.
- (−) Los paquetes del workspace se publican como TypeScript fuente; cada app debe transpilarlos (`transpilePackages` en Next).

## 7. Otras consideraciones
- **Coherencia y accesibilidad:** las pruebas de `packages/ui-react/tests` (Vitest + Testing Library + axe-core) leen los contratos en ejecución: cada `example` y cada combinación de props se monta y pasa por axe; cada requisito MUST de `specs/requirements` debe estar cubierto por una prueba con etiqueta `[archivo#n]` o declarado en `requirements.other.ts` con el mecanismo que lo cubre (CI de contraste, lint, revisión editorial). Un MUST nuevo sin cubrir hace fallar la suite. Los andamios Astro se verifican por su salida real: el HTML compilado de la landing pasa por axe a página completa. Límites: jsdom no calcula estilos (el contraste y la precedencia de estados en CSS quedan fuera) y no existe aún una suite por componente para Astro.
- **Distribución:** la prueba de concepto usa workspace. Publicar `@ds-ia/react` y `@ds-ia/tokens` con el semver que calcula `spec-diff` es el siguiente paso natural.
- **Escalas anuladas:** `theme.css` elimina las escalas por defecto de Tailwind; una librería de terceros con clases estándar no funcionará dentro de estas apps.
