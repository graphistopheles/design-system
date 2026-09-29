// Cómo se monta cada componente a partir de las props y el contenido de un `example` del contrato.
// Si se añade un componente al sistema, esta tabla debe tener su entrada (lo verifica examples.test.tsx).
import type { ReactElement } from 'react';
import { Badge, Button, Card, Header, Input } from '../src';

type Adapter = (props: Record<string, unknown>, content: Record<string, string>) => ReactElement;

export const links = [
  { label: 'Sistema', href: '#sistema' },
  { label: 'Contratos', href: '#contratos' },
];

export const adapters: Record<string, Adapter> = {
  Button: (p, c) => <Button {...(p as object)}>{c.label ?? 'Guardar cambios'}</Button>,
  Badge: (p, c) => <Badge {...(p as object)}>{c.label ?? 'Publicado'}</Badge>,
  Card: (p, c) => <Card {...(p as object)} title={c.title ?? 'Tokens en tres capas'} description={c.description} />,
  Header: (p) => <Header {...(p as object)} brand="DS-IA" links={links} actions={<Button size="sm" href="#nuevo">Nuevo proyecto</Button>} />,
  Input: (p) => <Input label="Correo de trabajo" name="email" {...(p as object)} />,
};
