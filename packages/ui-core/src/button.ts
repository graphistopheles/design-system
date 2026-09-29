// GENERADO desde specs/components/button.spec.json por scripts/generate-components.mjs. No editar a mano:
// cambia el spec y vuelve a ejecutar `npm run generate`.
import { resolve } from './_runtime';

/** Dispara una acción o navega a un destino con una etiqueta de verbo clara. */
export interface ButtonContract {
  /** Jerarquía visual. Un solo primary por vista. */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  /** md cumple el mínimo táctil de 44px. sm solo en densidad alta con escritorio. */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Si existe, se renderiza como <a>. Un enlace nunca se deshabilita. */
  href?: string;
  type?: 'button' | 'submit' | 'reset';
}

/** Slots de contenido: label (requerido), icon */
export type ButtonPart = 'root' | 'label' | 'icon';

export const buttonMeta = {"name":"Button","version":"1.0.0","status":"stable","level":"atom","spec":"specs/components/button.spec.json"} as const;

export const buttonDefaults = {"variant":"primary","size":"md","disabled":false,"type":"button"} as const;

export const buttonStyles = {
  "parts": [
    "root",
    "label",
    "icon"
  ],
  "base": {
    "root": "gap-inline-sm rounded-interactive inline-flex items-center justify-center cursor-pointer transition-colors whitespace-nowrap select-none focus-visible:outline-focus focus-visible:outline-(length:--border-width-focus) focus-visible:outline-offset-(length:--border-width-focus) focus-visible:outline-solid disabled:bg-disabled disabled:text-disabled disabled:cursor-not-allowed aria-disabled:bg-disabled aria-disabled:text-disabled aria-disabled:cursor-not-allowed",
    "icon": "inline-flex"
  },
  "variants": {
    "variant": {
      "primary": {
        "root": "bg-fill-primary text-on-brand hover:bg-fill-primary-hover active:bg-fill-primary-active"
      },
      "secondary": {
        "root": "bg-fill-secondary text-on-dark hover:bg-fill-secondary-hover active:bg-fill-secondary-active"
      },
      "outline": {
        "root": "border-strong border-(length:--border-width-default) text-primary hover:bg-fill-muted active:bg-fill-muted-hover"
      },
      "ghost": {
        "root": "text-primary hover:bg-fill-muted active:bg-fill-muted-hover"
      },
      "destructive": {
        "root": "bg-error-solid text-on-brand hover:bg-error-solid-hover"
      }
    },
    "size": {
      "sm": {
        "root": "h-interactive-sm px-inset-sm text-label-3",
        "icon": "size-icon-sm"
      },
      "md": {
        "root": "h-interactive-md px-inset-md text-label-2",
        "icon": "size-icon-sm"
      },
      "lg": {
        "root": "h-interactive-lg px-inset-lg text-label-1",
        "icon": "size-icon-md"
      }
    }
  },
  "compounds": []
} as const;

/** Clases por parte de la anatomía para un conjunto de props. */
export function button(props: Partial<ButtonContract> = {}): Record<ButtonPart, string> {
  return resolve(buttonStyles, { ...buttonDefaults, ...props }) as Record<ButtonPart, string>;
}
