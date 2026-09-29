# Requisitos generales

Aplican a todos los componentes. Palabras clave según RFC 2119: MUST (obligatorio), SHOULD (recomendado), MAY (opcional).

## Tokens
- MUST: todo valor visual proviene de un token semántico. Ningún componente consume primitivos ni valores literales (hex, px, rgb).
- MUST: si ningún semántico resuelve el caso, se crea el semántico (con ADR si cambia la arquitectura) antes de aplicarlo.
- MUST NOT: usar paletas de feedback (success, error) para categorizar ni paletas categóricas para indicar correcto/incorrecto.

## Estados
- MUST: `disabled` tiene precedencia sobre `hover`, `active` y `focus`.
- MUST: `disabled` tiene precedencia sobre `readonly`.
- MUST: todo elemento interactivo muestra foco visible con `color.border.focus` y `border-width.focus` (focus-visible).
- SHOULD: las transiciones usan `motion.duration.interactive` y `motion.easing.default`.

## Accesibilidad (WCAG 2.2 AA)
- MUST: contraste de texto ≥ 4.5:1 (≥ 3:1 en texto grande: ≥ 24px, o ≥ 18.66px en bold). Verificado en CI.
- MUST: contraste no textual (bordes de controles, foco) ≥ 3:1.
- MUST: área táctil ≥ 44 × 44px en elementos interactivos primarios (`size.interactive.md`).
- MUST: un solo H1 por pantalla.
- SHOULD: respetar `prefers-reduced-motion`.

## Contenido (voz y tono)
- MUST: sentence case siempre.
- MUST: sin punto final en botones y labels.
- SHOULD: números del 1 al 9 en letras; 10+ en dígitos (salvo datos).
- MUST: los mensajes de error nunca culpabilizan al usuario y dicen cómo resolver.
- SHOULD: textos recurrentes salen de `copy.*` (`copy.action.save`, `copy.state.loading`…).
