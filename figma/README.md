# Preparar Figma para el hub

Figma es a la vez **origen** (el diseñador expresa intención) y **superficie** (refleja lo aprobado en el repo). Para que un agente pueda leer y escribir sin ambigüedad, el archivo debe seguir estas convenciones.

## 1. Colecciones de variables
Se generan desde `packages/tokens/dist/figma-variables.json` (`npm run tokens`).

| Colección | Modos | Scopes | Publicar |
|---|---|---|---|
| Primitives | Value | ninguno | No (`hiddenFromPublishing`) |
| Semantic | Light (Dark más adelante) | específicos por grupo (fills, text, stroke, gap, radius…) | Sí |
| Typography | Desktop · Mobile | FONT_SIZE, LINE_HEIGHT, LETTER_SPACING, FONT_WEIGHT, FONT_FAMILY | Sí |

Por qué Typography va aparte: la colección Semantic ya usa sus modos para Light/Dark (ADR-0002).

## 2. Code syntax (clave para el MCP)
Cada variable semántica lleva en **Code syntax → Web** su variable CSS, por ejemplo `var(--color-bg-fill-primary)`. Así, `get_variable_defs` y `get_design_context` devuelven el token del código y no un hex. El JSON generado ya incluye `codeSyntax.WEB`.

## 3. Estilos
- **Text styles**: `Display/Display 1…3`, `Heading/H1…H6`, `Label/Label 1…3`, `Body/Body 1…5`, `Caption/Caption 1…2`, cada propiedad ligada a su variable de Typography.
- **Effect styles**: `Elevation/raised`, `Elevation/floating`, `Elevation/overlay` (Figma no admite sombras como variables).

## 4. Componentes
- El nombre del component set es el `name` del contrato: `Button`, `Badge`, `Card`, `Input`, `Header`.
- Las propiedades de variante se llaman **igual que las props** del contrato: `variant=primary`, `size=md`, `tone=category`.
- Las capas se llaman como las partes de `anatomy`: `root`, `label`, `icon`…
- Todo fill, stroke, padding, gap y radio está ligado a una variable **semántica**. Nunca a un primitivo ni a un valor suelto.

## 5. MCP de Figma: qué hace cada uno
| Servidor | Uso en este repo | Requisitos |
|---|---|---|
| MCP de escritorio (Dev Mode) | Lectura: borde Figma → specs | App de escritorio abierta, archivo y capa seleccionados, "Enable Dev Mode MCP server" en Preferencias |
| MCP remoto con `use_figma` | Escritura: borde specs → Figma | Conector de Figma en claude.ai; plan con acceso a Dev Mode |
| Code Connect | Mostrar el snippet del componente real en Dev Mode | Plan Organization o superior; Astro no tiene plantilla nativa (usar mapeo genérico) |
| API REST de variables | Sincronización por CI sin agente | Plan Enterprise |

## 6. Orden sugerido
1. Crear un archivo vacío "DS-IA · Foundations".
2. Ejecutar la skill `ds-specs-to-figma` para crear colecciones, estilos y componentes desde el repo.
3. Ejecutar `ds-figma-to-specs` sobre el resultado: el diff debe estar vacío (round trip).
4. Desde ahí, cambios de diseño en Figma → `ds-figma-to-specs` → PR.
