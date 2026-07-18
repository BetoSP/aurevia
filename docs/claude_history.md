# Historial de decisiones de CLAUDE.md

> Registra por qué cambió una regla vigente de `CLAUDE.md`. La regla vigente en sí vive solo en `CLAUDE.md` (§10) — este archivo guarda el "antes" y el motivo, no vuelve a describir el estado actual en detalle.

## Glosario: "Cumplimiento normativo" → "Documentación" (2026-07-18)

- **Decía antes:** "Cumplimiento normativo (documental, por Prestadora)".
- **Dice ahora:** "Documentación (vencimientos documentales de Asistentes, por Prestadora)".
- **Motivo:** el Desarrollador señaló que "Cumplimiento normativo" no es descriptivo del concepto real (el tablero de vencimientos de documentos de Asistentes — Monotributo, ART, Seguro, etc.), y pidió reemplazarlo por "Documentación" en el glosario y en todo el sistema.
- **Alcance del cambio:** término renombrado en el glosario de `CLAUDE.md`, en el código y textos del Panel (página, ruta, componente, claves de i18n en los 3 idiomas) y en el catálogo de módulos comerciales (`catalogo_modulos`, tabla y schema). El identificador técnico interno (`key = 'compliance'`) se mantuvo sin cambios — mismo criterio ya usado antes para el módulo de Guardias (`key = 'evv'` se mantuvo aunque su nombre visible pasó a "Verificación de Guardias"): el `key` es un identificador técnico estable, no un término de negocio visible.
- **No reintroducir:** "compliance" ni "cumplimiento normativo" como término visible o clave nueva para este concepto — usar siempre "Documentación".
