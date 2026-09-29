// GENERADO desde specs/components/card.spec.json por scripts/generate-components.mjs. No editar a mano:
// cambia el spec y vuelve a ejecutar `npm run generate`.
import { resolve } from './_runtime';

/** Agrupa contenido relacionado sobre una superficie delimitada para escanearlo como una unidad. */
export interface CardContract {
  padding?: 'md' | 'lg';
  /** Toda la card es un enlace (requiere href). */
  interactive?: boolean;
  href?: string;
}

/** Slots de contenido: eyebrow, title (requerido), description, footer */
export type CardPart = 'root' | 'eyebrow' | 'title' | 'description' | 'footer';

export const cardMeta = {"name":"Card","version":"1.0.0","status":"stable","level":"molecule","spec":"specs/components/card.spec.json"} as const;

export const cardDefaults = {"padding":"lg","interactive":false} as const;

export const cardStyles = {
  "parts": [
    "root",
    "eyebrow",
    "title",
    "description",
    "footer"
  ],
  "base": {
    "root": "bg-surface-subtle border-subtle border-(length:--border-width-default) rounded-surface gap-stack-sm flex flex-col transition-shadow",
    "title": "text-heading-h5 text-primary",
    "footer": "gap-inline-sm flex items-center flex-wrap"
  },
  "variants": {
    "padding": {
      "md": {
        "root": "p-inset-md"
      },
      "lg": {
        "root": "p-inset-lg"
      }
    },
    "interactive": {
      "true": {
        "root": "cursor-pointer hover:shadow-floating hover:border-default focus-visible:outline-focus focus-visible:outline-(length:--border-width-focus) focus-visible:outline-offset-(length:--border-width-focus) focus-visible:outline-solid"
      },
      "false": {}
    }
  },
  "compounds": []
} as const;

/** Clases por parte de la anatomía para un conjunto de props. */
export function card(props: Partial<CardContract> = {}): Record<CardPart, string> {
  return resolve(cardStyles, { ...cardDefaults, ...props }) as Record<CardPart, string>;
}
