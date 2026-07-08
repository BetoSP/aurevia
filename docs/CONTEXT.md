# CONTEXT.md — Contexto técnico de prestadora-original Salud

> Versión de trabajo para generación de código. Condensa `prestadora-original_CONTEXT_md_v2.md` y
> `prestadora-original_PROMPT_MAESTRO_v1.md`, quitando el contenido que no afecta decisiones de código
> (mercado, competidores, marketing). Para el análisis de negocio completo, ver los
> documentos originales en la raíz del proyecto — no hace falta releerlos para programar.

## Modelo de negocio (lo mínimo que el código necesita saber)

- Familias solicitan un servicio → prestadora-original asigna un Asistente Integral (empresa directa,
  fase actual) → evoluciona a marketplace (familia elige directamente) y B2B (obras
  sociales / prepagas, y coordinación de prestadoras terceras).
- Precio de referencia de lanzamiento: **nunca hardcodear** — se carga desde configuración
  (Módulo 8 del Panel Admin), no desde una constante en el código. Mientras no haya
  benchmark validado, la interfaz pública muestra "A consultar".
- Zona de cobertura inicial: CABA y GBA (norte, oeste, sur) y La Plata y alrededores —
  también configurable, no hardcodear la lista de zonas en componentes.
- **Principio de negocio (acordado en sesión, 2026-07-07): el modelo está pensado para
  operar con muy poca gente administrando.** Por lo tanto, toda tarea operativa que se
  pueda automatizar con IA sin comprometer el riesgo legal (ver `CLAUDE.md`) es deseable,
  no un extra opcional. Esto pesa a favor de priorizar antes de lo previsto algunos de los
  niveles de IA que `BUILD_ORDER.md` marca hoy como "Diferida" — a revisar caso por caso
  cuando se llegue a esa etapa, no se re-prioriza automáticamente sin evaluar cada nivel.

## Roles de usuario

| Rol | Dónde opera | Ve |
|---|---|---|
| Superadmin | Panel de administración (login propio, capa separada de Admin) | Todo lo de Admin, más acceso técnico: cambios profundos de configuración, alta/baja de cosas que no es prudente que un Admin sin ese nivel opere, interacción con IA para diagnóstico/corrección de errores |
| Admin | Panel de administración | Todo el negocio (sin el acceso técnico de Superadmin) |
| Coordinador | Panel de administración | Su zona asignada |
| Asistente | PWA de Asistentes | Sus propias guardias, su perfil, su certificado |
| Familia | PWA de Familias | Sus pacientes, reportes y alertas de sus pacientes |

Acordado en sesión (2026-07-07): Superadmin es un quinto rol real, con login propio,
distinto de Admin — no un simple flag sobre el mismo usuario. Antes no estaba en ningún
PRD original; se agrega por decisión explícita de negocio (necesidad de que alguien con
más permiso técnico pueda operar sin exponer ese poder a un Admin de negocio "neófito").

Ningún rol de Asistente/Familia debe tener acceso, ni siquiera de solo lectura, a
`escalas_legales`, `ceses`, `ausencias` ni a datos laborales internos de otros Asistentes.

## Stack por etapa

```
Etapa 1 — Sitio web público
  Frontend:  Next.js 15 (App Router) + React 18 — SSR/SSG, no Vite (decisión 2026-07-08,
             ver nota abajo)
  Rutas:     /es-AR, /en, /pt-BR (locale-prefixed, vía app/[locale]/) — cada idioma tiene
             URL propia indexable, en vez del Context+localStorage anterior
  Estilos:   CSS custom con variables de marca (no Tailwind, no CSS-in-JS)
  Backend:   Node.js + Express (solo formularios) — sin cambios
  DB:        Supabase (PostgreSQL + RLS) — mismo proyecto que usará el panel en Etapa 2,
             el backend escribe con la Service Role Key (bypassea RLS por diseño, es server-only)
  Email:     Nodemailer + Gmail SMTP App Password
  PWA:       app/manifest.js (Next.js metadata API) — manifest básico; service worker
             offline completo queda pendiente (no bloquea, ver PROGRESS.md)
  Deploy:    Vercel (frontend) + Railway (backend Express)

  Nota (2026-07-08): el frontend de Etapa 1 migró de Vite+React Router a Next.js App
  Router. Motivo explícito del usuario: "el seo es fundamental, si no nos ven no nos
  contactan, si no nos contactan no facturamos". Vite servía todo el contenido client-side
  bajo una sola URL, con el idioma resuelto en el navegador (Context + localStorage) — Google
  solo indexaba español y nunca veía contenido pre-renderizado. Next.js da SSR/SSG real y
  URLs propias por idioma. Esta migración es solo de Etapa 1; las PWA de Asistentes/Familias
  (Etapas 3-4) siguen en Vite, que sigue siendo la mejor herramienta ahí (sin necesidad de
  SSR detrás de auth, plugin de PWA maduro).

Etapa 2 — Panel de administración
  Frontend:  React 18 + Vite, proyecto separado (`panel/`) — SPA detrás de auth, nunca
             indexable (<meta name="robots" content="noindex, nofollow">), mismo motivo por
             el que Etapa 1 sí necesitaba Next.js y esto no
  Auth:      Supabase Auth (email + password, sin magic link) — rol resuelto desde tabla
             `usuarios` (extiende `auth.users`), no desde metadata de Auth
  DB:        Supabase (PostgreSQL + RLS) — mismo proyecto ya creado en Etapa 1, sin migración.
             El panel lee/escribe directo con la anon key; RLS (no el backend) es el único
             límite de autorización sobre los datos
  Backend:   el Express de Etapa 1 gana un uso nuevo, acotado: acciones puntuales que el
             panel no puede hacer solo con RLS (ej. envío de email al cambiar estado de una
             postulación) van por `POST /api/panel/*`, protegidas con un middleware que
             valida el JWT de Supabase Auth contra `usuarios.rol`
  Nota: el sitio público sigue en Express como capa de validación/envío de email, pero
  ambos (sitio y panel) leen/escriben la misma base Supabase.

  Estado (2026-07-08): primer corte construido — Módulo 1 (Dashboard), Módulo 2
  (Postulaciones), Módulo 3 (Solicitudes de Servicio). Módulo 4 (Plantel de Asistentes) y
  `PRD_02B_Gestion_Personal.md` completo, y Módulos 5-8, quedan para sesiones siguientes
  (ver `docs/PROGRESS.md`).

Etapas 3 y 4 — PWA Asistentes / PWA Familias
  Framework: React 18 + Vite + Vite PWA Plugin
  Auth:      Supabase Auth (magic link o email/password)
  DB:        Supabase (PostgreSQL + RLS + Realtime)
  Storage:   Supabase Storage (fotos de reportes, documentos)
  GPS:       navigator.geolocation API (nativo del browser)
  Cámara:    MediaDevices API (nativo del browser)
  IA Nivel 1 (reporte inteligente) y Nivel 2 (alertas): Anthropic API — Claude Sonnet
  Push:      Web Push API + Service Worker (Android) / Apple Push (iOS 16.4+)
  PDF:       jsPDF o react-pdf (Planilla 3 IOMA y Resumen Mensual)

Etapa 5 — Planillas IOMA
  Generación de PDF desde datos ya existentes en `reportes` y `guardias` — no requiere
  stack nuevo.
```

## i18n — el objeto `T`

Todo texto visible vive en un objeto centralizado `T` con tres idiomas simultáneos.
Nunca un string literal en un componente. Estructura mínima:

```js
// src/i18n/translations.js
export const T = {
  'es-AR': { hero_title: 'Cuida tus afectos', /* ... */ },
  'en':    { hero_title: 'Care for your loved ones', /* ... */ },
  'pt-BR': { hero_title: 'Cuide de quem você ama', /* ... */ },
};
```

Nota de marca: el manual de identidad registra "Cuidamos tus afectos" en el logo, mientras
que la documentación de contexto usa "Cuida tus afectos". No está resuelto — usar
"Cuida tus afectos" como valor por defecto en el código hasta que Alberto/Inversor confirmen
cuál es el definitivo, pero mantenerlo como una sola clave de `T` (`hero_title`) para que el
cambio, cuando llegue, sea de un solo lugar.

## Identidad visual

Ver `DESIGN_SYSTEM.md` para la paleta de colores, tipografía y convenciones de CSS.
La identidad completa es **provisional** — no invertir tiempo puliendo detalles de logo o
color de divisiones que no están activas (Junior, Pets, Bienestar, Hogar, Legal). Solo
prestadora-original Salud tiene logo y paleta relevantes hoy.

## Modelo de datos

Ver `DATA_MODEL.md` para el schema completo consolidado de todas las etapas.

## IA — prompts de sistema

Ver `AI_PROMPTS.md` para los prompts exactos de Nivel 1 (reporte inteligente) y Nivel 2
(alertas por patrones), y los contratos JSON que ambos devuelven.

## Seguridad

Ver `SECURITY.md` para autenticación, RLS y manejo de datos sensibles.

## Riesgo legal que condiciona el producto

Ver `CLAUDE.md` (raíz de `Workspace/`) — sección "El riesgo legal que condiciona el diseño". No se repite acá.

## Gap identificado, no resuelto por ningún PRD original: cobro a las familias

Ningún documento original especificó **cómo prestadora-original cobra a las familias** (medio de pago,
facturación, retención de fondos). El "Modelo UPE" cubre la facturación a IOMA (obra
social) vía Planillas 3, pero no el cobro directo a familias particulares. Antes de
construir cualquier flujo de cobro, esto necesita una decisión de negocio explícita
(Mercado Pago, transferencia, ambos) — no asumir nada del documento no vinculante
"Prompt de Money Suite.md" sin validarlo con el equipo de negocio primero. Ver nota en
`SECURITY.md` y `BUILD_ORDER.md`.

## Changelog de este documento

- v1 (2026-07-07): primera versión, generada para poblar `Workspace/docs/` a partir de
  la lectura completa de la documentación del proyecto y separando lo vinculante de lo
  que no lo es.
