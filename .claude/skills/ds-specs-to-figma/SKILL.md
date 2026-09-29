---
name: ds-specs-to-figma
description: Crea o actualiza en Figma las colecciones de variables, estilos de texto y efectos y los componentes a partir de /specs. Usar cuando se aprobó un cambio en el repo y Figma debe reflejarlo.
---

# Specs → Figma

Requiere el MCP remoto de Figma con escritura (`use_figma`) y cargar antes las skills `figma-use` y `figma-generate-library`.

## Entrada
`packages/tokens/dist/figma-variables.json` (ejecuta `npm run tokens`) y `specs/components/*.spec.json`.

## Pasos
1. **Colecciones**, en este orden (los alias exigen que el destino exista):
   - `Primitives` · modo `Value` · `hiddenFromPublishing: true` · scopes vacíos.
   - `Semantic` · modo `Light` · scopes y `codeSyntax.WEB` tal como vienen en el JSON.
   - `Typography` · modos `Desktop` y `Mobile`.
   Crea o actualiza por nombre; nunca borres una variable que no esté en el JSON sin confirmación.
2. `valuesByMode` con `alias` → `createVariableAlias` hacia la variable con ese nombre. Valores `PERCENT` (line-height, letter-spacing) se aplican con esa unidad.
3. **Text styles** (`textStyles`): crea `Display/Display 1`, `Heading/H1`, … y liga cada propiedad a su variable de Typography.
4. **Effect styles** (`effectStyles`): `Elevation/raised`, `floating`, `overlay`.
5. **Componentes**: por cada spec, un component set con el nombre del contrato. No los dibujes a mano: usa el motor determinístico `scripts/figma/render-component.figma.js` (cuerpo de `async (spec, tree, opts)` para `figma_execute` del MCP `figma-console`; guárdalo una vez en `figma.root.setPluginData('dsRender', src)` y ejecútalo con el constructor de `AsyncFunction`). Construye antes Button y Badge, porque Card y Header los instancian. Convenciones que aplica:
   - Propiedades de variante = las `props` que aparecen en `variants`/`compounds`, con el mismo nombre; los booleanos son `true`/`false`. Los estados del contrato (`hover`, `active`, `focus`, `focus-visible`, `disabled`) forman la propiedad `state`; `disabled` de Button/Input se modela como `state=disabled`. Solo se generan las combinaciones que el contrato define.
   - Cada texto/slot es una propiedad TEXT con el nombre de la capa; cada parte `optional` es una propiedad BOOLEAN `show-<parte>`.
   - Capas con los nombres de `anatomy`. Fills, strokes, padding, gap, radio, altura y max-width ligados a variables **Semantic**; tipografía → text style; `shadow.*` → effect style.
   - `outline` (foco) se emula con un DROP_SHADOW sin desenfoque cuyo color y grosor van ligados a variables (Figma no tiene outline).
   - Sin equivalente en Figma, se ignoran: `z-index`, `position: sticky`, `transition`, `cursor`.
   - `line-height` y `letter-spacing` de los text styles llevan el valor en %, sin ligar (Figma interpreta esas variables como px). La fuente es `Inter` (Figma no tiene `Inter Variable`).
6. **Round trip**: ejecuta `ds-figma-to-specs` sobre lo creado y compara. El diff debe estar vacío.
7. Anota en el PR el `nodeId` de cada componente en `specs/components/*.spec.json → figma.nodeId`.
