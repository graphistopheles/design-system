// MUST que NO se verifican con estas pruebas, y el mecanismo que sí los cubre.
// Un MUST solo puede vivir aquí con una razón concreta; tests/traceability.test.ts lo exige.
// Si algún día una prueba lo cubre (etiqueta [id] en tests/*.test.tsx), hay que quitarlo de esta lista.

const REVISION_EDITORIAL = 'Contenido y voz: revisión editorial en el PR (no es verificable con el DOM).';
const CI_CONTRASTE = 'scripts/validate-specs.mjs calcula el contraste WCAG 2.2 AA de tokens y variantes en cada PR.';
const CSS_REAL = 'Depende del orden de cascada del CSS compilado: requiere pruebas visuales en navegador (jsdom no calcula estilos).';

export const otherMechanisms: Record<string, string> = {
  'badge#2': REVISION_EDITORIAL,
  'badge#3': 'Uso semántico de success/error frente a category: AGENTS.md regla 4 y revisión de diseño.',
  'button#3': REVISION_EDITORIAL,
  'general#1': 'scripts/lint-consumption.mjs prohíbe hex, px y valores arbitrarios en todas las superficies de código.',
  'general#2': 'Proceso: si falta un semántico se crea con ADR (AGENTS.md regla 1).',
  'general#3': 'Uso de paletas de feedback vs. categóricas: AGENTS.md regla 4 y revisión de diseño.',
  'general#4': CSS_REAL,
  'general#5': CSS_REAL,
  'general#7': CI_CONTRASTE,
  'general#8': CI_CONTRASTE,
  'general#11': REVISION_EDITORIAL,
  'general#13': REVISION_EDITORIAL,
  'input#4': REVISION_EDITORIAL,
  'input#5': CI_CONTRASTE,
};
