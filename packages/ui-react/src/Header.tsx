// Andamio sobre specs/components/header.spec.json.
import type { ElementType, ReactNode } from 'react';
import { header, type HeaderContract } from '@ds-ia/core';
import { cx, defined } from './util';

/** Requisito header#3: el primer elemento enfocable de la página es "Saltar al contenido". Solo se ve al recibir foco. */
const SKIP_LINK = 'sr-only focus:not-sr-only focus:block focus:bg-surface-strong focus:text-primary focus:p-inset-md focus:rounded-interactive';

export interface HeaderProps extends HeaderContract {
  brand: ReactNode;
  links: { label: string; href: string }[];
  actions?: ReactNode;
  homeHref?: string;
  /** Destino del enlace "Saltar al contenido": el id del <main> de la página. */
  skipTo?: string;
  /** Componente para enlaces (p. ej. next/link). */
  linkAs?: ElementType;
}

export function Header({ sticky, brand, links, actions, homeHref = '/', skipTo = '#contenido', linkAs }: HeaderProps) {
  const c = header(defined({ sticky }));
  const Anchor = linkAs ?? 'a';
  return (
    <header className={c.root}>
      <a className={SKIP_LINK} href={skipTo}>
        Saltar al contenido
      </a>
      <div className={c.inner}>
        <Anchor className={c.brand} href={homeHref}>
          {brand}
        </Anchor>
        {/* extension: responsive. El contrato aún no expresa breakpoints (ver ADR-0003, "Otras consideraciones"). */}
        <nav className={cx(c.nav, 'hidden md:flex')} aria-label="Principal">
          {links.map((l) => (
            <Anchor key={l.href} className={c.link} href={l.href}>
              {l.label}
            </Anchor>
          ))}
        </nav>
        {actions != null && <div className={c.actions}>{actions}</div>}
      </div>
    </header>
  );
}
