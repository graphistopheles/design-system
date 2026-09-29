// Requisitos de pantalla completa (no de un componente): un solo H1, un <main>, enlace de salto con destino válido.
import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import Page from '../../../apps/webapp/src/app/page';
import { ROOT } from './support';

const REGLAS_DE_PAGINA = ['page-has-heading-one', 'landmark-one-main', 'heading-order', 'bypass', 'skip-link', 'duplicate-id', 'landmark-unique'];

describe('Webapp Next.js (pantalla completa)', () => {
  it('[general#10] un solo H1 por pantalla, un solo <main> y enlace de salto válido', async () => {
    render(<Page />);
    expect(document.querySelectorAll('h1'), 'Debe haber exactamente un H1').toHaveLength(1);
    expect(document.querySelectorAll('main')).toHaveLength(1);

    const salto = document.querySelector('a[href^="#"]') as HTMLAnchorElement;
    expect(salto.textContent).toBe('Saltar al contenido');
    expect(document.querySelector(salto.getAttribute('href') as string), 'El destino del enlace de salto no existe').not.toBeNull();

    const r = await axe.run(document, { runOnly: REGLAS_DE_PAGINA });
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

// La landing se compila con Astro; se comprueba su HTML final si ya existe (el CI la compila antes de probar).
const landing = path.join(ROOT, 'apps/landing/dist/index.html');
/** Carga el HTML compilado conservando los atributos de <html> (innerHTML los descarta; aquí importa lang). */
function cargarLanding() {
  const html = fs.readFileSync(landing, 'utf8');
  document.documentElement.innerHTML = html;
  const lang = html.match(/<html[^>]*\slang="([^"]+)"/)?.[1];
  if (lang) document.documentElement.setAttribute('lang', lang);
}

describe('Landing Astro (HTML compilado)', () => {
  it.skipIf(!fs.existsSync(landing))('[general#10] un solo H1, un <main id="contenido"> y un enlace de salto que apunta a él', () => {
    cargarLanding();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelectorAll('main#contenido')).toHaveLength(1);
    const saltos = [...document.querySelectorAll('a')].filter((a) => a.textContent?.trim() === 'Saltar al contenido');
    expect(saltos, 'Debe haber exactamente un enlace "Saltar al contenido"').toHaveLength(1);
    expect(saltos[0].getAttribute('href')).toBe('#contenido');
  });

  // Los andamios Astro no tienen pruebas de componente propias: su salida real es este HTML, y axe lo recorre completo.
  it.skipIf(!fs.existsSync(landing))('axe a página completa sin violaciones (el contraste lo verifica validate-specs)', async () => {
    cargarLanding();
    const r = await axe.run(document, { rules: { 'color-contrast': { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([]);
  });
});
