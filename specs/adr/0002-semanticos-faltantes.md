# ADR-0002 · Semánticos numéricos y vacíos detectados en la guía

## 1. Metadata
- Autor: Mario con asistencia de Claude
- Fecha: 2026-09-28
- Estado: Aceptado

## 2. Contexto
La guía de tokens define primitivos numéricos (cap. 5) y la tabla de aplicación a componentes (cap. 9) usa semánticos numéricos (`space/inset/*`, `size/interactive/*`, `radius/interactive`, `z/*`…) que no están definidos en ningún capítulo.

## 3. Problema
Sin esos semánticos, los contratos tendrían que apuntar a primitivos, violando la regla fundamental (cap. 1.1). Además hay valores de la tabla tipográfica que no existen en la escala primitiva.

## 4. Alternativas
1. Permitir que los componentes consuman primitivos numéricos. Rechazada: rompe la regla y la capacidad de ajustar densidad en un solo lugar.
2. Definir los semánticos faltantes con los valores implícitos en la guía (elegida).

## 5. Decisión
Se definen en `specs/tokens/semantic/number.json`:

| Grupo | Tokens | Alias |
|---|---|---|
| `space/inset` (padding) | xs, sm, md, lg, xl, 2xl | space/1, 2, 4, 6, 8, 16 |
| `space/stack` (gap vertical) | xs, sm, md, lg, xl, 2xl | space/1, 2, 4, 6, 10, 16 |
| `space/inline` (gap horizontal) | xs, sm, md, lg, xl | space/1, 2, 3, 4, 6 |
| `size/interactive` | sm, md, lg | size/36, 44, 48 (md = mínimo táctil) |
| `size/control` · `size/icon` · `size/avatar` | sm–lg | size/16–56 |
| `size/container` | content, prose, narrow | container/xl, md, sm (primitivo nuevo `container/*`) |
| `radius` | interactive, surface, tag, control, pill | radius/md, lg, sm, xs, full |
| `border-width` | default, focus | border-width/1, 2 |
| `opacity` | skeleton | opacity/50 |
| `z` | base, sticky, dropdown, overlay, modal, popover, toast | z/0–60 (primitivo nuevo `z/*`) |
| `shadow` | raised, floating, overlay | elevation/1, 3, 4 |
| `motion` | duration.quick/interactive/emphasis, easing.default | duration/*, easing/standard |

Vacíos adicionales corregidos:
- **font-size**: la tabla Mobile (7.3) usa 22, 26, 30, 32 y 36px, que no estaban en la escala 6.2. Se agregan.
- **line-height**: la tabla 7.2 usa 1.15, 1.25, 1.35 y 1.45, que no estaban en 6.4. Se agregan como `line-height/115`, `125`, `135`, `145`.
- **radius/xs en Checkbox** (9.3) era un primitivo: se crea `radius/control`.
- **Badge padding** (9.3) usaba `space/inline/xs` como padding: el padding siempre es `inset`. Se usa `space/inset/sm` + `space/inset/xs`.
- **field/bg, field/border** (9.2) no seguían la fórmula `{type}/{element}/{role}`: pasan a `color/bg/field` y `color/border/field(-focus|-invalid|-hover)`.
- **color/border/field** usa `neutral/600` (no `neutral/400`) para cumplir contraste no textual ≥ 3:1 (WCAG 1.4.11). Verificado en CI: 3.2:1.
- **text/secondary** usa `neutral/800`; `neutral/700` queda como `text/tertiary` (4.68:1 sobre canvas).
- Los tokens `copy/*` son STRING literales en la capa semántica (excepción explícita en el build).
- Tipografía por modo (Desktop/Mobile) vive en una colección propia en Figma, porque la colección Semantic ya usa sus modos para Light/Dark.

## 6. Consecuencias
- (+) Todos los contratos apuntan a semánticos; el build lo verifica.
- (+) Densidad y radios de todo el sistema se ajustan en un solo archivo.
- (−) La guía original debe actualizarse con estas tablas para no divergir.

## 7. Otras consideraciones
`color/bg/overlay` (scrim con transparencia) queda pendiente: requiere decidir si se modela como color con alfa o como primitivo + opacidad.
