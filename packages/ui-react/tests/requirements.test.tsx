// Cada prueba lleva la etiqueta [<archivo>#<n>] del requisito MUST que verifica (specs/requirements/*.md).
// tests/traceability.test.ts exige que todo MUST esté aquí o declarado en tests/requirements.other.ts.
import fs from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { badge, button, card, header, input } from '@ds-ia/core';
import { Badge, Button, Card, Header, Input } from '../src';
import { links } from './adapters';
import { ROOT, loadSpecs } from './support';

describe('Badge', () => {
  it('[badge#1] no es interactivo', () => {
    const { container } = render(<Badge tone="success">Publicado</Badge>);
    expect(container.querySelectorAll('a, button, input, select, textarea, [tabindex], [role=button], [role=link]')).toHaveLength(0);
    expect(container.firstElementChild?.tagName).toBe('SPAN');
  });
});

describe('Button', () => {
  it('[button#1] <button> para acciones y <a href> para navegación, nunca un div clicable', () => {
    const { container } = render(
      <>
        <Button>Guardar</Button>
        <Button href="/inicio">Ir al inicio</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Guardar' }).tagName).toBe('BUTTON');
    const a = screen.getByRole('link', { name: 'Ir al inicio' });
    expect(a.tagName).toBe('A');
    expect(a.getAttribute('href')).toBe('/inicio');
    expect(container.querySelectorAll('div[role=button], div[onclick]')).toHaveLength(0);
  });

  it('[button#2] type="button" por defecto para no enviar formularios por accidente', () => {
    render(
      <>
        <Button>Por defecto</Button>
        <Button type="submit">Enviar</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Por defecto' }).getAttribute('type')).toBe('button');
    expect(screen.getByRole('button', { name: 'Enviar' }).getAttribute('type')).toBe('submit');
  });

  it('[button#4] el icono es decorativo (aria-hidden) y aria-label define el nombre accesible', () => {
    const { container } = render(
      <>
        <Button icon={<svg data-testid="i" />}>Siguiente</Button>
        <Button aria-label="Cerrar" icon={<svg />}>
          {''}
        </Button>
      </>,
    );
    expect(container.querySelector('[aria-hidden="true"] [data-testid="i"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy();
  });

  it('[button#5] un <a> no se deshabilita', () => {
    render(
      <Button href="/x" disabled>
        Ver detalle
      </Button>,
    );
    const a = screen.getByRole('link', { name: 'Ver detalle' });
    expect(a.hasAttribute('disabled')).toBe(false);
    expect(a.getAttribute('aria-disabled')).toBeNull();
  });

  it('[button#6] disabled usa el atributo nativo y bloquea la acción', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Guardar
      </Button>,
    );
    const b = screen.getByRole('button', { name: 'Guardar' });
    expect(b.hasAttribute('disabled')).toBe(true);
    await userEvent.setup().click(b);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('[button#7] se activa con Enter y Space', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Guardar</Button>);
    await user.tab();
    expect(document.activeElement?.tagName).toBe('BUTTON');
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

describe('Card', () => {
  it('[card#1] el título es un encabezado real h2–h4', () => {
    render(
      <>
        <Card title="Por defecto" />
        <Card title="Segundo nivel" headingLevel="h2" />
        <Card title="Cuarto nivel" headingLevel="h4" />
      </>,
    );
    expect(screen.getByRole('heading', { name: 'Por defecto' }).tagName).toBe('H3');
    expect(screen.getByRole('heading', { name: 'Segundo nivel' }).tagName).toBe('H2');
    expect(screen.getByRole('heading', { name: 'Cuarto nivel' }).tagName).toBe('H4');
  });

  it('[card#2] interactiva: toda la card es un único <a> sin enlaces ni botones anidados', () => {
    const { container } = render(<Card interactive href="/detalle" title="Proyecto" description="Resumen" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe('A');
    expect(root.getAttribute('href')).toBe('/detalle');
    expect(container.querySelectorAll('a')).toHaveLength(1);
    expect(root.querySelectorAll('a, button')).toHaveLength(0);
  });

  it('[card#3] interactiva: el foco visible rodea la card completa (está en la raíz)', () => {
    const { container } = render(<Card interactive href="/detalle" title="Proyecto" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('focus-visible:outline-focus');
    expect(card({ interactive: true }).root).toContain('focus-visible:outline-focus');
  });
});

describe('Header', () => {
  const montar = (props: object = {}) => render(<Header brand="DS-IA" links={links} {...props} />);

  it('[header#1] <header> con un <nav aria-label="Principal">', () => {
    montar();
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('navigation', { name: 'Principal' })).toBeTruthy();
  });

  it('[header#2] la marca enlaza al inicio y tiene texto accesible', () => {
    montar();
    const marca = screen.getByRole('link', { name: 'DS-IA' });
    expect(marca.getAttribute('href')).toBe('/');
  });

  it('[header#3] el primer elemento enfocable es el enlace "Saltar al contenido"', async () => {
    montar();
    await userEvent.setup().tab();
    const activo = document.activeElement as HTMLAnchorElement;
    expect(activo.textContent).toBe('Saltar al contenido');
    expect(activo.getAttribute('href')).toBe('#contenido');
  });

  it('[header#4] sticky usa z.sticky, nunca un z-index literal', () => {
    const sticky = header({ sticky: true }).root;
    expect(sticky).toContain('z-(--z-sticky)');
    expect(sticky).not.toMatch(/(^|\s)-?z-(\d+|\[)/);
    const { container } = montar({ sticky: true });
    expect((container.querySelector('header') as HTMLElement).className).toContain('z-(--z-sticky)');
  });
});

describe('Input', () => {
  it('[input#1] <label for> visible y asociado; el placeholder no reemplaza al label', () => {
    render(<Input label="Correo de trabajo" name="email" placeholder="nombre@empresa.com" />);
    const campo = screen.getByLabelText('Correo de trabajo') as HTMLInputElement;
    const label = document.querySelector('label') as HTMLLabelElement;
    expect(label.htmlFor).toBe(campo.id);
    expect(label.getAttribute('aria-hidden')).toBeNull();
    expect(label.textContent).toBe('Correo de trabajo');
  });

  it('[input#2] el helper se asocia con aria-describedby', () => {
    render(<Input label="Correo" name="email" helper="Te escribiremos solo para esta demo." />);
    const campo = screen.getByLabelText('Correo');
    const id = campo.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)?.textContent).toBe('Te escribiremos solo para esta demo.');
  });

  it('[input#3] invalid → aria-invalid="true"; válido → sin el atributo', () => {
    const { rerender } = render(<Input label="Correo" name="email" invalid helper="Escribe un correo con el formato nombre@empresa.com" />);
    expect(screen.getByLabelText('Correo').getAttribute('aria-invalid')).toBe('true');
    rerender(<Input label="Correo" name="email" helper="Ayuda" />);
    expect(screen.getByLabelText('Correo').getAttribute('aria-invalid')).toBeNull();
  });

  it('[input#6] type y autocomplete correctos para facilitar el autocompletado', () => {
    render(
      <>
        <Input label="Correo" name="email" type="email" />
        <Input label="Sitio" name="site" type="url" />
        <Input label="Nombre" name="nombre" autoComplete="name" />
      </>,
    );
    const correo = screen.getByLabelText('Correo');
    expect(correo.getAttribute('type')).toBe('email');
    expect(correo.getAttribute('autocomplete')).toBe('email');
    expect(screen.getByLabelText('Sitio').getAttribute('autocomplete')).toBe('url');
    expect(screen.getByLabelText('Nombre').getAttribute('autocomplete')).toBe('name');
  });
});

describe('Requisitos generales', () => {
  it('[general#6] todo elemento interactivo muestra foco visible con color.border.focus y border-width.focus', () => {
    const foco = /(focus-visible|focus):outline-focus/;
    const anchoFoco = /outline-\(length:--border-width-(focus|default)\)/;
    const raices = {
      Button: button({}).root,
      'Card interactiva': card({ interactive: true }).root,
      'Header · enlace': header({}).link,
      'Header · marca': header({}).brand,
      'Input · control': input({}).control,
    };
    for (const [nombre, clases] of Object.entries(raices)) {
      expect(clases, `${nombre} sin foco visible`).toMatch(foco);
      expect(clases, `${nombre} sin grosor de foco tokenizado`).toMatch(anchoFoco);
    }
  });

  it('[general#9] el área táctil de los elementos interactivos primarios es ≥ 44px (size.interactive.md)', () => {
    const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/tokens/dist/tokens.json'), 'utf8')).tokens as { path: string; value: string }[];
    const md = Number.parseFloat(tokens.find((t) => t.path === 'size.interactive.md')?.value ?? '0');
    expect(md).toBeGreaterThanOrEqual(44);
    // md es el tamaño por defecto de Button y la altura del control de Input
    expect(button({}).root).toContain('h-interactive-md');
    expect(input({}).control).toContain('h-interactive-md');
  });

  it('[general#12] sin punto final en botones y labels (según los examples de los contratos)', () => {
    const specs = loadSpecs();
    const textos = [
      ...(specs.find((s) => s.name === 'Button')?.examples ?? []).map((e) => e.content?.label),
      ...(specs.find((s) => s.name === 'Input')?.examples ?? []).map((e) => e.props?.label as string | undefined),
    ].filter((t): t is string => typeof t === 'string');
    expect(textos.length).toBeGreaterThan(0);
    for (const t of textos) expect(t, `"${t}" termina en punto`).not.toMatch(/[.。]$/);
  });
});

// Evita que un import sin uso oculte un componente sin probar.
void badge;
