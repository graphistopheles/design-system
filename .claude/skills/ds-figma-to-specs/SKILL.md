---
name: ds-figma-to-specs
description: Lee variables y componentes de Figma con el MCP y propone los cambios como diff de /specs en un pull request. Usar cuando el diseñador dice que cambió algo en Figma o pide sincronizar desde Figma.
---

# Figma → specs

## Entrada
Un nodo o componente de Figma seleccionado (MCP de escritorio) o una URL con `node-id`.

## Pasos
1. Lee `AGENTS.md`.
2. Obtén los datos:
   - Variables: `get_variable_defs` sobre el nodo. Devuelve nombre → valor (o código si la variable tiene *code syntax*).
   - Componente: `get_metadata` (estructura, propiedades y variantes) y `get_design_context` si hace falta el detalle de estilos.
3. **Normaliza tokens**: nombre Figma `a/b/c` → ruta DTCG `a.b.c`. Ubica el archivo por capa:
   - `brand/500`, `space/4`… → `specs/tokens/primitives/*.json`
   - `color/*`, `space/inset/*`, `size/*`, `radius/<rol>`… → `specs/tokens/semantic/*.json`
   Un semántico SIEMPRE es alias (`"{brand.600}"`), nunca un hex. Si en Figma un semántico tiene valor crudo, repórtalo como error de Figma: no lo copies.
4. **Normaliza componentes**: propiedades de Figma (`variant=primary`) → `props` del contrato. Variables ligadas a fills/strokes/padding de cada capa → estilos por parte en `base` / `variants`. Nombres de capa = partes de `anatomy`.
   **Detecta qué cambió** con el extractor determinístico (no adivines leyendo capturas):
   1. En Figma (`figma_execute` del MCP `figma-console`) ejecuta `scripts/figma/extract-facts.figma.js` como cuerpo de `AsyncFunction('mode','args', src)` con `mode = "hashes"`; guarda la salida JSON en `scripts/figma/.roundtrip-input.json`.
   2. `npm run roundtrip` compara, por componente, variante y capa, los *hechos* de Figma (variable ligada, text style, effect style, layout) con la proyección del contrato. Sale con código 1 y lista cada diferencia; si está vacío, Figma no cambió nada que el contrato exprese.
   3. Para cada capa que difiere, ejecuta el extractor con `mode = "drill"` y `{ set, variant, path }`: devuelve los hechos reales (`background: "color.bg.fill-primary-hover"`). Ese token es el valor nuevo que debe ir en el contrato.
   4. Un `raw:#rrggbb` (o `raw:<número>`) significa un valor suelto sin variable: es un error de Figma, se reporta y no se copia al contrato.
   5. Qué se cambia en el spec depende del hecho: token de una variante/estado → `variants.*` / `states`; valor de una propiedad de variante → `props`; capa nueva o ausente → `anatomy`.
   Lo que Figma no puede expresar (comportamiento, a11y, `transition`, `cursor`, `z-index`) vive en los contratos y en `requirements/`: el extractor no lo toca.
5. Ejecuta `npm run check`. Si falla, corrige el spec o explica por qué Figma está fuera de la regla.
6. Ejecuta `npm run diff` y sube la `version` de cada componente según la clasificación.
7. Crea una rama `figma/<tema>` y abre un PR con: nodo de origen, diff clasificado y capturas (`get_screenshot`).

## Nunca
- Commitear directo a `main`.
- Aceptar un primitivo dentro de un contrato de componente.
- Inventar tokens que no existan en Figma ni en el repo sin proponer el ADR.
