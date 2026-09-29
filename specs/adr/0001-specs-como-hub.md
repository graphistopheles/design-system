# ADR-0001 · El repositorio de specs como hub de intención

## 1. Metadata
- Autor: Mario (Head of UX) con asistencia de Claude
- Fecha: 2026-09-28
- Estado: Aceptado

## 2. Contexto
Diseño trabaja en Figma y desarrollo en código (landing Astro + Tailwind como primera superficie). Hoy la intención se traslada a mano, con pérdida y sin versionado.

## 3. Problema
Si Figma o el código se declaran "fuente única de verdad", la otra superficie queda como copia desactualizada. Tampoco hay forma objetiva de saber si un cambio rompe a los consumidores.

## 4. Alternativas
1. **Figma como fuente única** y exportación a código. Pierde las decisiones que nacen en código (a11y, comportamiento) y depende de un plugin.
2. **Código como fuente única** y Figma como documentación. Excluye a diseño del origen de la intención.
3. **Hub de specs en el repo** (elegida): Figma y código son orígenes y superficies; el repo normaliza, valida y versiona.

## 5. Decisión
- `/specs` contiene tokens (W3C DTCG), contratos de componente (JSON Schema), requisitos redactados (MUST/SHOULD) y ADRs. Es lo único que se versiona como contrato.
- Todo lo que está en `/packages` y `/apps/*/src/components/generated` se **genera** desde `/specs` de forma determinística (sin IA).
- Los agentes operan los cuatro bordes (Figma → specs, specs → Figma, specs → código, código → specs) y **siempre terminan en un pull request**; nunca escriben directo en `main`.
- Regla anti-conflictos: la arquitectura (primitivos, esquema) se edita en el repo. Un ajuste puede nacer en Figma, pero solo existe cuando su PR se aprueba.

## 6. Consecuencias
- (+) Una sola discusión por cambio, con diff legible y CI objetivo.
- (+) Semver calculado desde el diff: sin debates de "¿esto rompe?".
- (−) Requiere disciplina: cambios hechos solo en Figma no existen hasta que se sincronizan.
- (−) El borde specs → Figma exige herramientas de escritura (MCP con `use_figma` o plugin).

## 7. Otras consideraciones
La API REST de variables de Figma (lectura y escritura) requiere plan Enterprise. En esta prueba de concepto la lectura va por el MCP de escritorio y la escritura por el Plugin API a través de agentes.
