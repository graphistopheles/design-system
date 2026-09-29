# ADR-0004 · Coherencia entre diseño y desarrollo: quién manda en cada decisión

## 1. Metadata
- Autor: Mario (Head of UX) con asistencia de Claude
- Fecha: 2026-09-29
- Estado: **Propuesto** (la regla de precedencia la ratifica el equipo; hasta entonces el agente `ds-guardian` la aplica solo como recomendación)

## 2. Contexto
El hub de specs (ADR-0001) tiene cuatro bordes con Figma y con el código, y comprobaciones sueltas que detectan deriva en cada uno: `roundtrip` (componentes en Figma), `roundtrip:tokens` (variables en Figma), `generate --check` (código generado), `lint:consumption` (landing) y `spec-diff` (semver). Ninguna dice qué hacer cuando dos superficies dicen cosas distintas.

## 3. Problema
Sin una regla explícita de precedencia, cada desacuerdo entre diseño y desarrollo se resuelve por costumbre o por quién actúa primero, y un agente no puede decidir por sí solo en qué dirección sincronizar. Tampoco hay un criterio para distinguir un cambio legítimo de una deriva accidental.

## 4. Alternativas
1. **Figma manda siempre.** Simple, pero Figma no expresa comportamiento, accesibilidad ni relaciones entre props (ADR-0001, alternativa 1).
2. **El código manda siempre.** Excluye a diseño de decisiones visuales que son suyas.
3. **Última escritura gana.** Sin fricción, pero silencia conflictos reales y depende del orden de los pushes.
4. **Precedencia por tipo de decisión** (elegida): cada hecho tiene un origen natural; los conflictos se escalan a una persona.

## 5. Decisión
### 5.1 Origen natural de cada decisión
| Tipo de decisión | Origen que propone | Dónde se valida |
|---|---|---|
| Valores de tokens primitivos (`brand/600 = #8F2E07`) | **Figma** | Gate de contraste WCAG y regla de capas en `npm run check` |
| Qué token semántico usa cada variante y estado | **Figma** | `validate`, `roundtrip` |
| Estructura visual: capas, matriz de variantes, tamaños | **Figma** | `roundtrip` |
| API: nombre, tipo, valores y defaults de las props | **Contrato / código** | JSON Schema, `spec-diff` (major/minor) |
| Comportamiento, accesibilidad, contenido | **Requisitos** (`specs/requirements`) | Revisión humana; el código los implementa |
| Componentes nuevos y variantes nacidas de patrones repetidos | **Código** (`sections/`) | `ds-code-to-specs`, `ds-new-component` |
| Código generado y variables/estilos generados en Figma | **Nadie**: se regeneran desde el contrato | `generate --check`, `roundtrip*` |

"Propone" no es "decide": ninguna superficie escribe en `main`; toda propuesta es un pull request que pasa los gates.

### 5.2 Clasificación de la deriva
Para cada hecho, con el contrato en `main` como referencia:

| Situación | Clase | Acción del agente |
|---|---|---|
| Solo cambió el contrato | `superficie-atrasada` | Regenerar la superficie que falta (`npm run generate`, `ds-specs-to-figma`) |
| Solo cambió Figma | `figma-adelantado` | Si Figma es el origen natural (5.1): PR al contrato con `roundtrip:tokens --apply`. Si no: reportar como error de Figma |
| Solo cambió el código a mano | `codigo-adelantado` | Si es un archivo generado: revertirlo y regenerar. Si es `sections/`: evaluar con `ds-code-to-specs` |
| Dos superficies cambiaron el mismo hecho **igual** | `convergente` | Nada |
| Dos superficies cambiaron el mismo hecho **distinto** | `conflicto` | Etiqueta `needs-decision`, informe con ambos valores; **no resuelve** |
| Valor suelto (`raw:`, hex, px) donde debía haber token | `violacion` | Reportar; nunca copiarlo al contrato |

### 5.3 Límites del agente
- No hace merge, no cierra conflictos y no edita archivos generados a mano.
- No acepta un primitivo dentro de un contrato de componente ni un semántico con valor crudo.
- Si un cambio de Figma falla un gate (por ejemplo el contraste), el gate manda y el cambio se devuelve a diseño con el motivo.

## 6. Consecuencias
- (+) El agente decide sin preguntar en los casos claros y escala solo los conflictos reales.
- (+) Las reglas están escritas y se pueden discutir en un PR, en lugar de vivir en la costumbre.
- (−) La medición de Figma exige una sesión con el plugin abierto; en CI solo se mide el lado repo y el informe marca Figma como "no medido".
- (−) La tabla 5.1 puede necesitar excepciones (por ejemplo, un ajuste de accesibilidad que obligue a cambiar un token); se documentan como ADR posteriores.

## 7. Otras consideraciones
- El agente es la skill `.claude/skills/ds-guardian`; su parte determinística es `npm run coherence`.
- Un informe de coherencia sin deriva no prueba que Figma esté al día: solo que lo medido coincide. Por eso el informe distingue ✔ (medido y coincide), ✖ (medido y difiere) y ○ (no medido o desactualizado).
