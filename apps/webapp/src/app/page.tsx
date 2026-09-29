import Link from 'next/link';
import { Badge, Button, Card, Header, Input } from '@ds-ia/react';

// Datos de ejemplo. El estado de cada proyecto usa el tono del Badge que corresponde:
// success/error significan correcto/incorrecto; la fase de proceso se clasifica con una paleta categórica.
const projects = [
  { id: 'landing', name: 'Landing Astro', status: 'Al día', tone: 'success', description: 'Contrato, código y Figma coinciden.', href: '/proyectos/landing' },
  { id: 'webapp', name: 'Webapp Next.js', status: 'En revisión', tone: 'category', description: 'Consume @ds-ia/react. Falta medir Figma.', href: '/proyectos/webapp' },
  { id: 'movil', name: 'App móvil', status: 'Con deriva', tone: 'error', description: 'Dos variables difieren del contrato.', href: '/proyectos/movil' },
] as const;

export default function Page() {
  return (
    <>
      <Header
        linkAs={Link}
        homeHref="/"
        brand="DS-IA · Panel"
        links={[
          { label: 'Resumen', href: '#resumen' },
          { label: 'Nuevo proyecto', href: '#nuevo' },
        ]}
        actions={
          <Button size="sm" href="#nuevo" linkAs={Link}>
            Nuevo proyecto
          </Button>
        }
      />

      <main id="contenido" className="mx-auto max-w-content px-inset-lg py-inset-2xl flex flex-col gap-stack-2xl">
        <section aria-labelledby="resumen" className="flex flex-col gap-stack-xl">
          <div className="flex flex-col gap-stack-md items-start">
            <Badge tone="category" category="prototype">
              Prueba de concepto · Next.js
            </Badge>
            <h1 id="resumen" className="text-heading-h1 text-primary">
              Panel de proyectos
            </h1>
            <p className="text-body-2 text-secondary max-w-prose">
              Esta app no define ningún color, medida ni estilo propio: todo viene de los contratos de <code>/specs</code> a través de <code>@ds-ia/react</code>.
            </p>
          </div>

          <div className="grid gap-stack-lg md:grid-cols-3">
            {projects.map((p) => (
              <Card
                key={p.id}
                width="full"
                interactive
                href={p.href}
                linkAs={Link}
                headingLevel="h2"
                eyebrow={
                  p.tone === 'category' ? (
                    <Badge tone="category" category="discovery">
                      {p.status}
                    </Badge>
                  ) : (
                    <Badge tone={p.tone}>{p.status}</Badge>
                  )
                }
                title={p.name}
                description={p.description}
              />
            ))}
          </div>
        </section>

        <section id="nuevo" aria-labelledby="nuevo-titulo" className="grid gap-stack-xl lg:grid-cols-2 items-start">
          <div className="flex flex-col gap-stack-md">
            <h2 id="nuevo-titulo" className="text-heading-h2 text-primary">
              Crear proyecto
            </h2>
            <p className="text-body-3 text-secondary max-w-prose">
              El segundo campo muestra el estado inválido del contrato: borde, mensaje y <code>aria-invalid</code> salen de la misma variante.
            </p>
          </div>
          <form className="rounded-surface border border-subtle bg-surface-subtle p-inset-lg flex flex-col gap-stack-md" action="#nuevo">
            <Input label="Nombre del proyecto" name="name" required placeholder="Mi producto" helper="Solo para esta demo: el formulario no envía datos." />
            <Input label="Correo del responsable" name="email" type="email" autoComplete="email" invalid defaultValue="nombre@" helper="Ingresa un correo válido, por ejemplo nombre@empresa.com." />
            <div className="flex flex-wrap gap-inline-md">
              <Button type="submit">Crear proyecto</Button>
              <Button type="reset" variant="ghost">
                Limpiar
              </Button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
