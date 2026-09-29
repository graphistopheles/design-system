// GENERADO desde specs/components/header.spec.json por scripts/generate-components.mjs. No editar a mano:
// cambia el spec y vuelve a ejecutar `npm run generate`.
import { resolve } from './_runtime';

/** Identifica el sitio y da acceso a las secciones principales y a la acción prioritaria. */
export interface HeaderContract {
  sticky?: boolean;
}

/** Slots de contenido: brand (requerido), links, action */
export type HeaderPart = 'root' | 'inner' | 'brand' | 'nav' | 'link' | 'actions';

export const headerMeta = {"name":"Header","version":"1.0.0","status":"stable","level":"organism","spec":"specs/components/header.spec.json"} as const;

export const headerDefaults = {"sticky":true} as const;

export const headerStyles = {
  "parts": [
    "root",
    "inner",
    "brand",
    "nav",
    "link",
    "actions"
  ],
  "base": {
    "root": "bg-surface-subtle border-subtle border-b-(length:--border-width-default) w-full",
    "inner": "max-w-content px-inset-lg py-inset-sm gap-inline-xl flex items-center justify-between mx-auto",
    "brand": "text-label-1 text-primary gap-inline-sm inline-flex items-center focus-visible:outline-focus focus-visible:outline-(length:--border-width-focus) focus-visible:outline-offset-(length:--border-width-focus) focus-visible:outline-solid",
    "nav": "gap-inline-xl flex items-center",
    "link": "text-label-2 text-secondary rounded-tag transition-colors hover:text-primary focus-visible:outline-focus focus-visible:outline-(length:--border-width-focus) focus-visible:outline-offset-(length:--border-width-focus) focus-visible:outline-solid",
    "actions": "gap-inline-sm flex items-center"
  },
  "variants": {
    "sticky": {
      "true": {
        "root": "z-(--z-sticky) sticky top-0"
      },
      "false": {}
    }
  },
  "compounds": []
} as const;

/** Clases por parte de la anatomía para un conjunto de props. */
export function header(props: Partial<HeaderContract> = {}): Record<HeaderPart, string> {
  return resolve(headerStyles, { ...headerDefaults, ...props }) as Record<HeaderPart, string>;
}
