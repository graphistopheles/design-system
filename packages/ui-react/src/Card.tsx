// Andamio sobre specs/components/card.spec.json.
import type { ElementType, ReactNode } from 'react';
import { card, type CardContract } from '@ds-ia/core';
import { cx, defined } from './util';

export interface CardProps extends CardContract {
  className?: string;
  /** Nivel del encabezado según la jerarquía de la página (el estilo sigue siendo heading-h5). */
  headingLevel?: 'h2' | 'h3' | 'h4';
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  /** Componente para enlaces (p. ej. next/link). Solo aplica con `interactive` y `href`. */
  linkAs?: ElementType;
}

export function Card({ padding, width, interactive = false, href, headingLevel = 'h3', eyebrow, title, description, footer, children, className, linkAs }: CardProps) {
  const c = card(defined({ padding, width, interactive, href }));
  const Heading = headingLevel;
  const content = (
    <>
      {eyebrow != null && <div className={c.eyebrow}>{eyebrow}</div>}
      <Heading className={c.title}>{title}</Heading>
      {description != null && <p className={c.description}>{description}</p>}
      {children}
      {footer != null && <div className={c.footer}>{footer}</div>}
    </>
  );
  if (interactive && href) {
    const Anchor = linkAs ?? 'a';
    return (
      <Anchor className={cx(c.root, className)} href={href}>
        {content}
      </Anchor>
    );
  }
  return <article className={cx(c.root, className)}>{content}</article>;
}
