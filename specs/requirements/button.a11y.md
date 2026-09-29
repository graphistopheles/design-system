# Button · accesibilidad y comportamiento

- MUST: renderizar `<button>` para acciones y `<a href>` para navegación. Nunca `<div>` clicable.
- MUST: `type="button"` por defecto para no enviar formularios por accidente.
- MUST: la etiqueta es un verbo que describe el resultado ("Guardar cambios", no "OK").
- MUST: con solo icono, `aria-label` obligatorio; el icono lleva `aria-hidden="true"`.
- MUST: un `<a>` no se deshabilita; si la acción no está disponible, se oculta o se explica.
- MUST: `disabled` usa el atributo nativo en `<button>`; en casos especiales `aria-disabled="true"` manteniendo el foco.
- MUST: activación con Enter y Space (nativo en `<button>`).
- SHOULD: un solo `primary` por vista; `destructive` solo para acciones irreversibles y con confirmación.
- SHOULD: `size="sm"` solo en contextos densos de escritorio (36px < 44px mínimo táctil).
