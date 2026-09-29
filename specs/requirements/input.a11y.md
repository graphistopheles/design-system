# Input · accesibilidad y comportamiento

- MUST: `<label for>` visible y asociado. El placeholder nunca reemplaza al label.
- MUST: el helper se asocia con `aria-describedby`.
- MUST: con `invalid`, `aria-invalid="true"` y el helper pasa a ser el mensaje de error.
- MUST: el mensaje de error dice cómo resolver y no culpabiliza ("Escribe un correo con el formato nombre@empresa.com").
- MUST: borde en reposo con contraste ≥ 3:1 contra el fondo (WCAG 1.4.11). Verificado en CI.
- MUST: `type` y `autocomplete` correctos para facilitar el autocompletado.
- SHOULD: validar al salir del campo (blur) o al enviar, no mientras se escribe.
