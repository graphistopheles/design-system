// GENERADO desde specs/components/badge.spec.json por scripts/generate-components.mjs. No editar a mano:
// cambia el spec y vuelve a ejecutar `npm run generate`.
import { resolve } from './_runtime';

/** Etiqueta breve y no interactiva que comunica estado (feedback) o clasificación (categoría). */
export interface BadgeContract {
  /** success/error significan correcto/incorrecto. Para clasificar usa category: nunca el rojo de error para decorar. */
  tone?: 'neutral' | 'success' | 'error' | 'category';
  /** Solo aplica con tone=category. */
  category?: 'terracota' | 'cyan' | 'gold' | 'discovery' | 'prototype' | 'validation' | 'handoff';
  emphasis?: 'subtle' | 'solid';
}

/** Slots de contenido: label (requerido) */
export type BadgePart = 'root';

export const badgeMeta = {"name":"Badge","version":"1.0.0","status":"stable","level":"atom","spec":"specs/components/badge.spec.json"} as const;

export const badgeDefaults = {"tone":"neutral","category":"terracota","emphasis":"subtle"} as const;

export const badgeStyles = {
  "parts": [
    "root"
  ],
  "base": {
    "root": "px-inset-sm py-inset-xs rounded-tag text-label-3 inline-flex items-center whitespace-nowrap"
  },
  "variants": {
    "tone": {
      "neutral": {
        "root": "bg-fill-muted text-secondary"
      },
      "success": {},
      "error": {},
      "category": {}
    }
  },
  "compounds": [
    {
      "when": {
        "tone": "success",
        "emphasis": "subtle"
      },
      "classes": {
        "root": "bg-success text-success"
      }
    },
    {
      "when": {
        "tone": "success",
        "emphasis": "solid"
      },
      "classes": {
        "root": "bg-success-solid text-on-brand"
      }
    },
    {
      "when": {
        "tone": "error",
        "emphasis": "subtle"
      },
      "classes": {
        "root": "bg-error text-error"
      }
    },
    {
      "when": {
        "tone": "error",
        "emphasis": "solid"
      },
      "classes": {
        "root": "bg-error-solid text-on-brand"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "terracota",
        "emphasis": "subtle"
      },
      "classes": {
        "root": "bg-category-terracota text-category-terracota"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "terracota",
        "emphasis": "solid"
      },
      "classes": {
        "root": "bg-category-terracota-solid text-on-brand"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "cyan",
        "emphasis": "subtle"
      },
      "classes": {
        "root": "bg-category-cyan text-category-cyan"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "cyan",
        "emphasis": "solid"
      },
      "classes": {
        "root": "bg-category-cyan-solid text-on-brand"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "gold",
        "emphasis": "subtle"
      },
      "classes": {
        "root": "bg-category-gold text-category-gold"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "gold",
        "emphasis": "solid"
      },
      "classes": {
        "root": "bg-category-gold-solid text-on-brand"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "discovery",
        "emphasis": "subtle"
      },
      "classes": {
        "root": "bg-category-discovery text-category-discovery"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "discovery",
        "emphasis": "solid"
      },
      "classes": {
        "root": "bg-category-discovery-solid text-on-brand"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "prototype",
        "emphasis": "subtle"
      },
      "classes": {
        "root": "bg-category-prototype text-category-prototype"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "prototype",
        "emphasis": "solid"
      },
      "classes": {
        "root": "bg-category-prototype-solid text-on-brand"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "validation",
        "emphasis": "subtle"
      },
      "classes": {
        "root": "bg-category-validation text-category-validation"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "validation",
        "emphasis": "solid"
      },
      "classes": {
        "root": "bg-category-validation-solid text-on-brand"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "handoff",
        "emphasis": "subtle"
      },
      "classes": {
        "root": "bg-category-handoff text-category-handoff"
      }
    },
    {
      "when": {
        "tone": "category",
        "category": "handoff",
        "emphasis": "solid"
      },
      "classes": {
        "root": "bg-category-handoff-solid text-on-brand"
      }
    }
  ]
} as const;

/** Clases por parte de la anatomía para un conjunto de props. */
export function badge(props: Partial<BadgeContract> = {}): Record<BadgePart, string> {
  return resolve(badgeStyles, { ...badgeDefaults, ...props }) as Record<BadgePart, string>;
}
