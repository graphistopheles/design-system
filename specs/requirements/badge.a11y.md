# Badge · accesibilidad y contenido

- MUST: no es interactivo. Si necesita acción, es otro componente (Chip/Tag interactivo).
- MUST: el significado no depende solo del color: el texto debe ser autoexplicativo ("Error", no un punto rojo).
- MUST: `tone="success" | "error"` solo para estados correcto/incorrecto; para clasificar, `tone="category"`.
- SHOULD: 1 a 3 palabras, sentence case, sin punto final.
- MAY: si el badge comunica un cambio dinámico de estado, el contenedor usa `role="status"`.
