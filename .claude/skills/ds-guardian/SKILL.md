---
name: ds-guardian
description: Agente de coherencia entre diseño (Figma) y desarrollo (código) a través del contrato. Mide la deriva en las tres superficies, la clasifica según el ADR-0004 y actúa por PR. Usar cuando alguien pide "sincroniza", "¿estamos alineados?", antes de un release, o cuando el CI de coherencia reporta deriva.
---

# ds-guardian · coherencia diseño ↔ desarrollo

El contrato (`/specs`) es el hub; Figma y la landing son superficies. Tu trabajo es **medir, clasificar y proponer**. No decides los conflictos y no haces merge.

## 0. Antes de empezar
1. Lee `AGENTS.md` y `specs/adr/0004-coherencia-y-precedencia.md` (la tabla de precedencia y las clases de deriva salen de ahí).
2. `git fetch` y confirma la rama base (`origin/main`). Trabaja en una rama `guardian/<tema>` si vas a modificar algo.
3. Comprueba que Figma responde: `figma_get_status` (probe) del MCP `figma-console`. Si no responde, dile a la persona que abra el plugin *Figma Desktop Bridge* en el archivo; no sigas con lecturas viejas.

## 1. Mide Figma (solo lectura)
Los extractores son cuerpos de `AsyncFunction('mode','args', src)` que se ejecutan con `figma_execute`. Su fuente está en `scripts/figma/` y también en `figma.root.getPluginData('dsExtract' | 'dsExtractVars')`.

| Qué | Extractor y modo | Guarda en `scripts/figma/` |
|---|---|---|
| Variables | `extract-variables` · `digest` | `.roundtrip-tokens.json` → `{ "digest": <salida> }` (sobrescribe todo el archivo) |
| Componentes | `extract-facts` · `digest` | `.roundtrip-digest.json` → `<salida>` |

Si `npm run coherence` dice *"Figma cambió desde la última extracción"* para componentes, ejecuta `extract-facts` con `mode "hashes"` y guarda la salida en `.roundtrip-input.json`; después vuelve a sacar el `digest`.
**Nunca reutilices archivos de una sesión anterior**: si son más viejos que los specs, el informe los marca ○ (sin medir) y eso no cuenta como éxito.

## 2. Ejecuta el informe
```bash
npm run coherence        # escribe coherence-report.md; código 1 si hay deriva
```
Lee el informe completo. Estados: ✔ medido y coincide · ✖ medido y difiere · ○ no medido o desactualizado.

## 3. Clasifica y actúa (ADR-0004 §5.2)
| Clase | Qué significa | Qué haces |
|---|---|---|
| `superficie-atrasada` | Cambió el contrato; falta regenerar una superficie | Código: `npm run generate`. Figma: skill `ds-specs-to-figma` (motor `render-component.figma.js`) |
| `figma-adelantado` | Figma cambió; el contrato no | Si Figma es el origen natural de esa decisión (tokens, estilos por variante, estructura): `ds-figma-to-specs` / `npm run roundtrip:tokens -- --apply` → `npm run check` → `npm run diff` → PR. Si no lo es (API, comportamiento, a11y): repórtalo como error de Figma |
| `codigo-adelantado` | Alguien tocó el código a mano | Archivo generado: revierte y regenera. `sections/`: evalúa con `ds-code-to-specs` |
| `violacion` | Valor suelto (hex, px, `raw:`) o contrato inválido | Repórtalo; **nunca** lo copies al contrato |
| `conflicto` | Dos superficies cambiaron el mismo hecho de forma distinta | **Detente.** Etiqueta `needs-decision` y escribe un resumen con ambos valores (ver formato abajo) |

Cuando `figma-adelantado` y `superficie-atrasada` aparecen juntos en el mismo hecho, es un conflicto potencial: no adivines cuál es el reciente; pregunta.

## 4. Entrega
- Un PR por origen de intención (Figma → contrato; contrato → código; etc.). No mezcles en un commit un cambio de Figma con código regenerado.
- Cuerpo del PR: origen de la intención, el `coherence-report.md` y el semver que calculó `npm run diff`.
- Después de sincronizar, vuelve a medir (paso 1 y 2): el informe debe quedar en ✔.

## Formato de un conflicto
```
Conflicto · <hecho> (p. ej. color.bg.fill-primary-hover en Button/primary)
- Contrato (main):  <valor>
- Figma:            <valor>
- Código:           <valor>
Precedencia natural (ADR-0004 §5.1): <superficie>. Motivo del desacuerdo: <si se sabe>.
Decide: <persona o rol>.
```

## Nunca
- Hacer merge, cerrar conflictos o commitear a `main`.
- Editar a mano archivos generados (`packages/tokens/dist`, `packages/ui-core/src`) ni variables de Figma sin pasar por el contrato.
- Aceptar un primitivo dentro de un contrato de componente, un semántico con valor crudo, o saltarse un gate (contraste, capas, consumo).
- Dar por coincidente lo que está en ○.
