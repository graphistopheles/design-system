---
name: ds-code-to-specs
description: Detecta decisiones de diseño tomadas en código (capa extensions de la landing) y las propone como cambios al contrato o a los requisitos. Usar tras iterar la landing o cuando el lint de consumo marca un caso sin token.
---

# Código → specs

1. Revisa `apps/landing/src/sections/**` y la prop `class` pasada a componentes del sistema.
2. Clasifica cada hallazgo:
   - Patrón repetido en 3+ lugares → candidato a componente o a variante (`ds-new-component`).
   - Estilo aplicado a un componente del sistema vía `class` → candidato a variante o a prop.
   - Caso sin token semántico → proponer semántico + ADR si cambia la arquitectura.
   - Comportamiento o a11y → requisito en `specs/requirements/<componente>.a11y.md` (MUST/SHOULD).
3. Aplica los cambios en `/specs`, ejecuta `npm run check` y `npm run diff`, sube versiones y abre un PR.
4. No elimines la extensión de la landing en el mismo PR si el cambio de spec aún no se aprobó.
