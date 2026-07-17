# CONTEXT.md — Contexto técnico de Aurevia

> Versión de trabajo para generación de código. Condensa los documentos originales de contexto
> y prompt maestro (históricos), quitando el contenido que no afecta decisiones de código
> (mercado, competidores, marketing). Para el análisis de negocio completo, ver los
> documentos originales en la raíz del proyecto — no hace falta releerlos para programar.

## Modelo de negocio (lo mínimo que el código necesita saber)

- Familias solicitan un servicio → la prestadora asigna un Asistente Integral (empresa directa,
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
- **Cambio societario (2026-07-09): el software pasa a ser propiedad de Xeitra**, que
  lo licencia como SaaS a cualquier prestadora de cuidado domiciliario. Cada prestadora
  licenciataria sigue con su propio negocio de cuidado domiciliario, y puede sumar un
  servicio B2B de auditoría/certificación a otras prestadoras. El plan técnico completo (entidad
  `prestadoras`, aislamiento multi-tenant, roles nuevos, facturación dual Xeitra/prestadora,
  i18n y multi-moneda desde el arranque, residencia de datos a futuro) está definido en
  `docs/Prompt_Claude_Code_Xeitra_Multitenant.md` (dirección de arquitectura original) y su
  ejecución viva se sigue en `docs/PLAN_MULTITENANT_XEITRA.md` — ver también `CLAUDE.md`.
  **Estado real (actualizado 2026-07-10): ya NO es mono-tenant.** Los Bloques 1
  (aislamiento aditivo de datos: tabla `prestadoras` + `prestadora_id NOT NULL` en 15
  tablas), 2 (RLS centralizada vía `current_tenant()`/`es_superadmin()`, ~28 policies
  reescritas, rol `admin` renombrado a `admin_prestadora` en dato y código sin transición
  pendiente) y 3 (filtrado de tenant en rutas backend con Service Role Key) ya están
  aplicados y verificados contra Supabase real. Solo el Bloque 4 (`configuracion_prestadora`
  reemplazando la configuración singleton + eliminar hardcodeos de marca/branding) sigue sin
  arrancar — ver `docs/PROGRESS.md` para el detalle Bloque a Bloque.

## Roles de usuario

| Rol | Dónde opera | Ve |
|---|---|---|
| Superadmin | Panel de administración (login propio, capa separada de Admin_prestadora) | Todo lo de Admin_prestadora en todas las prestadoras, más acceso técnico: cambios profundos de configuración, alta/baja de cosas que no es prudente que un Admin_prestadora sin ese nivel opere, interacción con IA para diagnóstico/corrección de errores |
| Admin_prestadora | Panel de administración | Todo el negocio de su propia prestadora (sin el acceso técnico de Superadmin, cero visibilidad de otras prestadoras) |
| Coordinador | Panel de administración | Su zona asignada |
| Asistente | PWA de Asistentes | Sus propias guardias, su perfil, su certificado |
| Familia | PWA de Familias | Sus pacientes, reportes y alertas de sus pacientes |

Acordado en sesión (2026-07-07): Superadmin es un quinto rol real, con login propio,
distinto de Admin_prestadora — no un simple flag sobre el mismo usuario. Antes no estaba en
ningún PRD original; se agrega por decisión explícita de negocio (necesidad de que alguien
con más permiso técnico pueda operar sin exponer ese poder a un Admin_prestadora de negocio
"neófito").

Ningún rol de Asistente/Familia debe tener acceso, ni siquiera de solo lectura, a
`escalas_legales`, `ceses`, `ausencias` ni a datos laborales internos de otros Asistentes.

**Actualizado 2026-07-10:** el rol antes descripto acá como "Administrador de prestadora"
(futuro) ya está implementado — es el mismo rol de la tabla de arriba, renombrado de
`admin` a `admin_prestadora` (Bloque 2 de `docs/PLAN_MULTITENANT_XEITRA.md`), con acceso
acotado a los datos de su propia prestadora y cero visibilidad de otras, verificado contra
Supabase real. Lo único que sigue siendo futuro, no implementado, es un rol de solo lectura
agregada para financiadores (obras sociales/prepagas) — no diseñar código para ese rol sin
que se apruebe explícitamente.

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

  Estado (2026-07-08): Módulo 1 (Dashboard), Módulo 2 (Postulaciones), Módulo 3 (Solicitudes
  de Servicio) y Módulo 4 (Plantel de Asistentes) + `PRD_02B_Gestion_Personal.md` completo
  (vínculo dual monotributo/dependencia, motor `calcularCese` con las 13 causales, Simulador
  de Vínculo, Score de Riesgo de reclasificación, Ausencias y Cobertura) construidos en
  código y con `backend/src/db/schema_etapa2b.sql` ya aplicado y verificado (RLS activa y
  probada) contra la base Supabase real — ver `docs/PROGRESS.md`.

  Módulo 5 (Familias y Pacientes) completo: se resolvió un gap arquitectónico compartido
  con Asistentes (ninguna de las dos tablas puede poblarse sin una cuenta real de Supabase
  Auth previa) construyendo un mecanismo de creación de cuentas reutilizable
  (`backend/src/utils/cuentasPanel.js`, `POST /api/panel/cuentas/familia`), sin envío de
  invitación por email todavía (las PWA de Etapa 3/4 no existen). `schema_etapa2c.sql`
  (tablas `familias`/`pacientes`) ya aplicado y verificado contra Supabase real. La pantalla
  propia (`panel/src/pages/Familias.jsx` + `familias/FamiliaDetalle.jsx`) muestra contacto y
  Pacientes; guardias activas/historial de reportes/alertas activas quedan marcadas como "no
  disponible todavía" porque dependen de datos que solo genera la PWA de Asistentes (Etapa
  3, no construida). El lado Asistente del mecanismo de cuentas (depende de una UI del Proceso
  de Incorporación de Asistentes que no existe) sigue afuera.

  Módulo 6 (Guardias), estado 2026-07-10: solo el schema de datos está construido y
  verificado contra Supabase real (`backend/src/db/schema_modulo6_guardias.sql`, 8 tablas
  con RLS multi-tenant vía FKs compuestas — series_guardias, guardias,
  domicilios_temporales_paciente, personal_emergencia, incidentes_relevo,
  configuracion_escalada_relevo, excepciones_familiar_relevo, guardias_tracking_gps).
  Todavía **no existen** rutas backend (CRUD) ni pantallas de Panel para este módulo — ver
  `docs/PROGRESS.md` para el detalle. Módulo 7 queda para sesiones siguientes.

  Módulo 8 (Precios/Prestaciones), primer corte: `schema_etapa2d.sql` (tablas
  `lista_precios`, `prestaciones`, `paquetes_prestaciones`, `paquete_prestacion_items`) ya
  aplicado y verificado contra Supabase real. Regla de negocio central (confirmada con el
  usuario): ningún medio público habla de precios — la lista de precios es solo referencia
  interna, y cada Paciente tiene su propia Prestación con precio final ajustado a su caso.
  La Prestación guarda una foto del precio de lista al momento de armarse (no una
  referencia viva); si el precio de lista cambia después, un trigger marca las Prestaciones
  vigentes como "a revisar" para que el Coordinador decida — nunca se ajustan solas. Varias
  Prestaciones de un mismo Paciente pueden agruparse en un paquete con precio propio.
  Pantallas: `panel/src/pages/ListaPrecios.jsx` (Admin edita, Coordinador solo ve) y
  `panel/src/pages/familias/PrestacionesPaciente.jsx` (modal desde la ficha de Familia).
  Explícitamente marcado como esquema provisional, a evolucionar con el uso real — la
  política de cuánto trasladar de un aumento de precio a cada cliente queda diferida.

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

**Regla de slogan (resuelta 2026-07-09): no hay una forma "definitiva" — conviven dos, según
contexto de uso**, siguiendo la guía de voz de marca (histórica, documento fuera del repo):
voz institucional en primera persona del plural ("Verificamos...", "Nuestros Asistentes..."):

- **"Cuida tus afectos"** (imperativo, segunda persona) — el sitio le habla directamente a
  quien lo visita: `hero_title` de la Home, titulares publicitarios, meta descriptions
  SEO/clic. Es la forma correcta en `T.hero_title` (`sitio-web/src/i18n/translations.js`) y
  en la meta description de `/` (`docs/PRD_01_Sitio_Web.md`).
- **"Cuidamos tus afectos"** (primera persona del plural, voz institucional) — la prestadora habla
  de sí misma: el logo/isotipo (manual de identidad, documento histórico fuera del repo, correcto así, no tocar),
  taglines de footer, la ficha de identidad de marca. Hoy el footer del sitio
  (`sitio-web/src/components/Footer.jsx`) no tiene ningún tagline — si se agrega uno a
  futuro, esta es la forma que le corresponde.

No son dos valores en pugna de una sola clave de `T`, son dos claves con función distinta.
Si en algún momento se agrega el tagline institucional al footer o a otra pieza de voz de
marca, evaluar entonces una clave separada (por ejemplo `brand_tagline`) en vez de reutilizar
`hero_title` fuera de su contexto de Home.

## Identidad visual

Ver `DESIGN_SYSTEM.md` para la paleta de colores, tipografía y convenciones de CSS.
La identidad completa es **provisional** — no invertir tiempo puliendo detalles de logo o
color de divisiones que no están activas (Junior, Pets, Bienestar, Hogar, Legal). Solo
la Prestadora Demo tiene logo y paleta relevantes hoy.

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

Ningún documento original especificó **cómo la prestadora cobra a las familias** (medio de pago,
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
- v2 (2026-07-09): se documenta el cambio societario Xeitra / prestadora licenciataria y la dirección
  de multi-tenancy futura (ver `docs/Prompt_Claude_Code_Xeitra_Multitenant.md`), sin
  implementar nada todavía.
- v3 (2026-07-10): barrido completo contra la realidad del código — Bloques 1-3 de
  multi-tenancy ya aplicados y verificados (rol `admin` renombrado a `admin_prestadora` en
  dato y código, RLS vía `current_tenant()`/`es_superadmin()`, filtrado de tenant en
  backend), solo el Bloque 4 sigue pendiente; se documenta el estado real de Módulo 6
  (Guardias): schema aplicado, sin rutas backend ni UI de Panel todavía.
