// GENERADO desde specs/components/input.spec.json por scripts/generate-components.mjs. No editar a mano:
// cambia el spec y vuelve a ejecutar `npm run generate`.
import { resolve } from './_runtime';

/** Permite escribir un valor de una línea con etiqueta visible y mensaje de ayuda o error. */
export interface InputContract {
  /** Siempre visible. El placeholder no reemplaza al label. */
  label: string;
  name: string;
  type?: 'text' | 'email' | 'url' | 'search';
  placeholder?: string;
  /** Ayuda o, si invalid, el mensaje de error (nunca culpabiliza al usuario). */
  helper?: string;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
}

/** Slots de contenido: ninguno */
export type InputPart = 'root' | 'label' | 'control' | 'helper';

export const inputMeta = {"name":"Input","version":"1.0.0","status":"stable","level":"molecule","spec":"specs/components/input.spec.json"} as const;

export const inputDefaults = {"type":"text","invalid":false,"required":false,"disabled":false} as const;

export const inputStyles = {
  "parts": [
    "root",
    "label",
    "control",
    "helper"
  ],
  "base": {
    "root": "gap-stack-xs flex flex-col w-full",
    "label": "text-label-2 text-primary",
    "control": "h-interactive-md px-inset-md rounded-interactive bg-field border-(length:--border-width-default) text-body-3 text-primary w-full transition-colors outline-none hover:border-field-hover focus:outline-(length:--border-width-default) focus:outline-solid disabled:bg-disabled disabled:text-disabled disabled:cursor-not-allowed aria-disabled:bg-disabled aria-disabled:text-disabled aria-disabled:cursor-not-allowed",
    "helper": "text-body-4"
  },
  "variants": {
    "invalid": {
      "true": {
        "control": "border-field-invalid focus:border-field-invalid focus:outline-error",
        "helper": "text-error"
      },
      "false": {
        "control": "border-field focus:border-field-focus focus:outline-focus",
        "helper": "text-tertiary"
      }
    }
  },
  "compounds": []
} as const;

/** Clases por parte de la anatomía para un conjunto de props. */
export function input(props: Partial<InputContract> = {}): Record<InputPart, string> {
  return resolve(inputStyles, { ...inputDefaults, ...props }) as Record<InputPart, string>;
}
