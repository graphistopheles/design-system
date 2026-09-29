// Andamio sobre specs/components/button.spec.json. Estilos: @ds-ia/core. Aquí solo estructura, semántica y la capa "extensions" (className).
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { button, type ButtonContract } from '@ds-ia/core';
import { cx, defined } from './util';

export interface ButtonProps
  extends ButtonContract,
    Omit<ComponentPropsWithoutRef<'button'>, keyof ButtonContract | 'className' | 'children'> {
  className?: string;
  children: ReactNode;
  /** Icono opcional a la derecha. Es decorativo: se marca aria-hidden. */
  icon?: ReactNode;
  /** Componente para enlaces (p. ej. next/link). Solo aplica cuando hay `href`. */
  linkAs?: ElementType;
}

export function Button({ variant, size, disabled = false, href, type = 'button', className, children, icon, linkAs, ...rest }: ButtonProps) {
  const c = button(defined({ variant, size, disabled, href, type }));
  const content = (
    <>
      <span className={c.label}>{children}</span>
      {icon != null && (
        <span className={c.icon} aria-hidden="true">
          {icon}
        </span>
      )}
    </>
  );
  // Un enlace nunca se deshabilita (requisito de a11y del contrato).
  if (href) {
    const Anchor = linkAs ?? 'a';
    return (
      <Anchor className={cx(c.root, className)} href={href} aria-label={rest['aria-label']}>
        {content}
      </Anchor>
    );
  }
  return (
    <button {...rest} className={cx(c.root, className)} type={type} disabled={disabled}>
      {content}
    </button>
  );
}
