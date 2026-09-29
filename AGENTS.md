# Reglas para agentes

Este repositorio es el **hub de specs** de DS-IA (ver `specs/adr/0001-specs-como-hub.md`).
Cualquier agente (Claude Code, Claude con MCP de Figma, otros) debe leer este archivo antes de actuar.

## Qué es fuente y qué es generado
| Ruta | Tipo | ¿Se edita a mano? |
|---|---|---|
| `specs/tokens/**` | Tokens W3C DTCG (primitivos, semánticos, componente) | Sí, vía PR |
| `specs/components/*.spec.json` | Contratos de componente | Sí, vía PR |
| `specs/requirements/*.md` | Requisitos redactados (MUST/SHOULD) | Sí, vía PR |
| `specs/adr/*.md` | Decisiones de arquitectura | Sí, vía PR |
| `packages/tokens/dist/**` | CSS, tema Tailwind, TS, JSON para Figma | **No**: `npm run tokens` |
| `packages/ui-core/src/**` | Contratos TS y clases (sin framework) | **No**: `npm run generate` |
| `apps/landing/src/components/*.astro`, `packages/ui-react/src/*.tsx` | Andamios por framework: HTML, semántica, a11y (ADR-0006) | Sí |
| `apps/landing/src/sections/**`, `apps/webapp/src/**` | Capa "extensions" | Sí, pasa por el lint de consumo |

## Reglas no negociables
1. **Un componente nunca consume un primitivo.** Si ningún semántico resuelve el caso, crea el semántico en `specs/tokens/semantic/` y, si cambia la arquitectura, escribe un ADR (`specs/adr/_plantilla.md`).
2. **Nombres** con la fórmula `{type}/{element}/{role}-{emphasis}-{state}`; se omite lo que es default. Traducción mecánica entre contextos: Figma `color/bg/fill-primary` · CSS `--color-bg-fill-primary` · DTCG `color.bg.fill-primary` · Tailwind `bg-fill-primary`.
3. **Padding = `space/inset/*`**, gap vertical = `space/stack/*`, gap horizontal = `space/inline/*`. No intercambiables.
4. **Feedback ≠ categoría**: success/error solo para correcto/incorrecto; las 7 paletas categóricas solo clasifican.
5. **Nunca** escribir hex, px, `rgb()` ni valores arbitrarios de Tailwind (`bg-[…]`) en la landing.
6. **Todo termina en un pull request.** Nunca commits directos a `main`. El PR describe el origen de la intención (Figma, código, requisito).
7. **Semver**: quitar/renombrar prop → major; agregar parte/prop/valor → minor; cambiar token asignado → patch. Sube `version` en el spec; `npm run diff` lo verifica.
8. La transformación specs → código es **determinística** (scripts). Un agente no reescribe a mano lo que un script genera.

## Comandos
```bash
npm run check      # tokens + validación + generación + lint de consumo
npm run dev        # landing en http://localhost:4321
npm run dev:webapp # webapp Next.js en http://localhost:3000
npm run test       # pruebas de accesibilidad: axe sobre examples y props + cada MUST de specs/requirements (ADR-0006)
npm run diff       # clasificación semver contra origin/main
npm run coherence  # informe de deriva contrato ↔ código ↔ Figma (ADR-0004)
npm run roundtrip / roundtrip:tokens   # Figma vs contrato (componentes / variables)
node scripts/generate-components.mjs --check   # ¿lo generado está al día?
```

## Bordes y skills
| Borde | Skill | Estado |
|---|---|---|
| Specs → código | `npm run tokens && npm run generate` | Operativo |
| Figma → specs | `.claude/skills/ds-figma-to-specs` | Listo para usar con el MCP de Figma |
| Specs → Figma | `.claude/skills/ds-specs-to-figma` | Requiere MCP de Figma con escritura (`use_figma`) |
| Código → specs | `.claude/skills/ds-code-to-specs` | Listo |
| Nuevo componente | `.claude/skills/ds-new-component` | Listo |
| Coherencia (los cuatro bordes a la vez) | `.claude/skills/ds-guardian` · `npm run coherence` | Listo · regla de precedencia en ADR-0004 (propuesto) |
