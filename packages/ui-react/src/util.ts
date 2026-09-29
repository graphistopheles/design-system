export const cx = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(' ');

/**
 * Quita las claves undefined. El mapa de clases resuelve `{ ...defaults, ...props }`, y un `undefined`
 * explícito (lo normal al desestructurar props en React) pisaría el valor por defecto del contrato.
 */
export const defined = <T extends object>(o: T): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
