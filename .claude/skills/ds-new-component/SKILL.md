---
name: ds-new-component
description: Crea un componente nuevo en el sistema a partir de su contrato (spec, requisitos, código generado y scaffold Astro). Usar cuando se necesita un patrón que no existe en /specs/components.
---

# Nuevo componente

1. Verifica el criterio de aceptación: se usa (o se necesita) en 3+ contextos, tiene un propósito en una frase y no duplica otro componente (misma finalidad + mismo comportamiento = mismo patrón).
2. Nombre por estructura, no por contenido (`Card`, no `ProductCard`), igual en Figma y en código.
3. Crea `specs/components/<nombre>.spec.json` con `$schema`, `version: "0.1.0"`, `status: "proposed"`, props, anatomy, base, states y variants (máx. 5 valores visuales por prop). Solo tokens semánticos.
4. Crea `specs/requirements/<nombre>.a11y.md` con MUST/SHOULD (roles ARIA, teclado, contraste, contenido).
5. `npm run tokens && npm run validate && npm run generate`.
6. Escribe `apps/landing/src/components/<Nombre>.astro` sobre `generated/<nombre>.ts`: HTML semántico, a11y, prop `class` para extensiones. Sin estilos propios.
7. `npm run check`, captura de la landing y PR. Cuando se apruebe, `status: "stable"` y `version: "1.0.0"`.
