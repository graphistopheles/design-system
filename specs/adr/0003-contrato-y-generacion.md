# ADR-0003 · Contrato de componente y generación hacia Tailwind v4

## 1. Metadata
- Autor: Mario con asistencia de Claude
- Fecha: 2026-09-28
- Estado: Aceptado

## 2. Contexto
La primera superficie de código es una landing Astro con Tailwind v4. Tailwind trae escalas propias (`bg-indigo-600`, `p-4`, `text-sm`) que permiten saltarse los tokens.

## 3. Problema
Un sistema que depende de la disciplina del desarrollador para no usar la paleta de Tailwind no se sostiene. El contrato debe ser la única forma de expresar estilos.

## 4. Alternativas
1. Estilos a mano en cada componente con `var(--token)`. Rechazada: no hay forma de verificar que coincidan con el spec.
2. CSS Modules generados. Posible, pero se pierde el ecosistema de Tailwind.
3. **Tema Tailwind generado desde los semánticos + clases generadas desde el contrato** (elegida).

## 5. Decisión
- `packages/tokens/build.mjs` genera `theme.css`: anula las escalas por defecto (`--color-*: initial`, `--spacing-*: initial`, etc.) y declara solo utilidades semánticas mapeando el segmento *element* del token al namespace de Tailwind:
  - `color/bg/fill-primary` → `bg-fill-primary` · `color/text/secondary` → `text-secondary` · `color/border/field` → `border-field`
  - `space/inset/md` → `p-inset-md` · `space/stack/lg` → `gap-stack-lg` · `size/interactive/md` → `h-interactive-md`
  - `radius/surface` → `rounded-surface` · `typography/heading-h2` → `text-heading-h2` (tamaño + interlineado + tracking + peso)
  - z-index, opacidad y anchos de borde se consumen como variable: `z-(--z-sticky)`, `border-(length:--border-width-default)`
- El contrato (`specs/components/*.spec.json`) declara `props`, `anatomy`, `base`, `states`, `variants` y `compounds`. Cada estilo es una ruta de token semántico validada contra el esquema y contra los tokens reales.
- Cascada: una variante que redefine una propiedad **reemplaza** la de base. El generador mueve la propiedad de base a cada valor de la variante para no emitir clases en conflicto.
- `scripts/generate-components.mjs` produce `generated/<componente>.ts` (interfaz TS + clases por parte). El `.astro` es un scaffold escrito a mano: estructura HTML, semántica y a11y.
- Capas de CSS: **generated** (desde el spec) · **extensions** (prop `class` y secciones de la landing, controladas por el lint de consumo) · **overrides** (no existen hoy; requerirían ADR).

## 6. Consecuencias
- (+) `bg-indigo-600` o `p-4` no compilan: no existen.
- (+) El CI compara el código generado con el spec (`--check`) y bloquea divergencias.
- (−) Nombres como `border-(length:--border-width-default)` son largos; se aceptan porque salen del generador.

## 7. Otras consideraciones
El contrato aún no expresa responsive (breakpoints). Hoy se resuelve en la capa extensions (p. ej. `hidden md:flex` en la navegación del Header). Candidato a ADR-0004: `responsive` como dimensión del contrato.
