# Header · accesibilidad y comportamiento

- MUST: `<header>` con un `<nav aria-label="Principal">`.
- MUST: la marca enlaza al inicio y tiene texto accesible.
- MUST: el primer elemento enfocable de la página es un enlace "Saltar al contenido".
- MUST: si `sticky`, usa `z.sticky`; nunca un z-index literal.
- SHOULD: máximo 5 enlaces de navegación.
- SHOULD: en mobile (< 768px) los enlaces se ocultan y queda la acción principal.
