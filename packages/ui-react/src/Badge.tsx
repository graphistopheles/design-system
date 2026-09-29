// Andamio sobre specs/components/badge.spec.json.
import type { ReactNode } from 'react';
import { badge, type BadgeContract } from '@ds-ia/core';
import { cx, defined } from './util';

export interface BadgeProps extends BadgeContract {
  className?: string;
  children: ReactNode;
}

export function Badge({ tone, category, emphasis, className, children }: BadgeProps) {
  const c = badge(defined({ tone, category, emphasis }));
  return <span className={cx(c.root, className)}>{children}</span>;
}
