# DS-IA · Sistema de diseño spec-driven

Prueba de concepto de un sistema de diseño en el que **Figma y el código leen el mismo contrato**. El repositorio no es "la" fuente de verdad: es el hub donde la intención que nace en Figma o en código se normaliza, se valida y se versiona. Los agentes traducen entre superficies y el CI verifica que nada se pierda.

```
Figma (variables + componentes) ◀──agente──▶ /specs (HUB) ──script──▶ Landing Astro · Webapp Next.js (Tailwind v4)
                                             tokens DTCG · contratos · requisitos · ADRs
```

## Requisitos
- Node.js 20 o superior (incluye npm)
- Git

## Empezar
```bash
npm run setup      # solo la primera vez: instala .claude/ y .github/ desde _instalar/
npm install
npm run dev        # genera tokens y contratos, y abre la landing en http://localhost:4321
npm run check      # tokens + validación + generación + lint de consumo
npm run build      # check + build estático en apps/landing/dist
npm run dev:webapp  # genera tokens y contratos, y abre la webapp Next.js en http://localhost:3000
npm run build:webapp # check + build de la webapp
```

## Estructura
```
specs/                     ← HUB: lo único que se edita como contrato
  tokens/primitives/       11 paletas, escalas numéricas y tipográficas (W3C DTCG)
  tokens/semantic/         color (Light), numéricos, tipografía (Desktop + Mobile), copy
  tokens/component/        capa 3: vacía a propósito (excepciones con ADR)
  components/*.spec.json   contratos: props, anatomy, base, states, variants, compounds
  requirements/*.md        requisitos redactados MUST/SHOULD (a11y, comportamiento, contenido)
  schema/                  JSON Schema del contrato
  adr/                     decisiones de arquitectura (formato de 7 partes)
packages/tokens/           build determinístico → dist/ tokens.css · theme.css · tokens.js · tokens.json · figma-variables.json
packages/ui-core/           GENERADO desde los specs: contratos TS + mapas de clases (sin framework, no editar)
packages/ui-react/          andamios React sobre ui-core: HTML, semántica y a11y (ADR-0006)
apps/landing/              landing Astro + Tailwind v4 que consume solo componentes y tokens semánticos
apps/webapp/               webapp Next.js (App Router) + Tailwind v4 sobre @ds-ia/react (mini dashboard)
scripts/                   validar · generar · lint de consumo · semver diff
figma/                     cómo preparar Figma para el hub
.claude/skills/            skills de agente para los cuatro bordes
AGENTS.md                  reglas que todo agente sigue antes de actuar
```

## Las garantías
| Garantía | Dónde se verifica |
|---|---|
| Semántico → primitivo; componente → semántico | `packages/tokens/build.mjs` (falla el build) |
| Contratos válidos contra el esquema | `scripts/validate-specs.mjs` |
| Ningún contrato referencia un primitivo | `scripts/validate-specs.mjs` |
| Contraste WCAG 2.2 AA en todas las combinaciones de variantes y estados | `scripts/validate-specs.mjs` |
| Sin hex, px, valores arbitrarios ni primitivos en la landing | `scripts/lint-consumption.mjs` |
| `bg-indigo-600`, `p-4`, `text-sm` no existen | `theme.css` anula las escalas de Tailwind |
| Código generado al día con los specs | `generate-components.mjs --check` (CI) |
| Semver calculado desde el diff | `scripts/spec-diff.mjs` (comenta el PR) |

## La demostración
Cambia `brand.500` en `specs/tokens/primitives/color.json` y ejecuta `npm run dev`: todo lo que es "primario" en la landing cambia sin tocar un solo componente (guía §1.3).

## Próximos pasos
1. Subir el repo a GitHub y activar Actions y Pages.
2. Preparar Figma según `figma/README.md` y ejecutar el borde specs → Figma.
3. Round trip specs → Figma → specs con diff vacío.
4. Modo Dark (`specs/tokens/semantic/color.dark.json`) y responsive en el contrato (ADR-0005).
