# PROGRESS.md — Estado real del proyecto

> Se actualiza al final de cada sesión de trabajo (paso 8 del protocolo de `CLAUDE.md`).
> Este archivo refleja el estado real del código, no el estado deseado — si algo no está
> hecho, dice 🔴 No iniciado, aunque haya PRD escrito para eso.

## Estado por etapa

| Etapa | Descripción | Estado |
|---|---|---|
| 0 | Setup: repo, estructura, variables de entorno | 🟢 Completo |
| 1 | Sitio web público (páginas + formularios + backend) | 🟡 En progreso |
| 2 | Panel de administración (Módulos 1-5 + primer corte de precios/Prestaciones + gestión de usuarios del Panel + Proceso de Incorporación + Certificado prestadora-original + rol Superadmin real + Módulo 8 Configuración) | 🟢 Desplegado a producción (2026-07-08): https://prestadora-original-panel.vercel.app — Módulos 6-7 pendientes (dependen de la PWA de Asistentes, Etapa 3) |
| 2B | Gestión de Personal (vínculo/cese/riesgo/cobertura) | 🟢 Completo — código listo y SQL aplicado/verificado contra Supabase real |
| 3 | PWA Asistentes (login, guardias, GPS, reporte + IA) | 🔴 No iniciado — desbloqueada: Etapa 2 ya está desplegada (regla de secuencia de `BUILD_ORDER.md`) |
| 4 | PWA Familias (login, reportes, alertas) | 🔴 No iniciado |
| 5 | Planillas IOMA (PDF) | 🔴 No iniciado |
| 6 | Perfil público del Asistente con QR | 🔴 No iniciado — el QR del Certificado prestadora-original (Módulo 4 del Panel) ya apunta a la URL futura de esta etapa |

Convención: 🔴 No iniciado · 🟡 En progreso · 🟢 Completo y en producción.

## Última tarea completada

Módulo 4 del Panel (Plantel de Asistentes) + `PRD_02B_Gestion_Personal.md` construidos
completos en código (trabajo nocturno autónomo, sin pausar a pedir permiso por instrucción
explícita del usuario). Incluye:

- `backend/src/db/schema_etapa2b.sql` (nuevo, **NO aplicado todavía contra Supabase real** —
  ver deuda técnica abajo): tabla `asistentes` (no existía, con todas las columnas duales
  monotributo/dependencia de PRD_02B), `aspirantes`, `verificaciones_asistente` (+ enum
  `etapa_filtro`), `escalas_legales` (+ seed de 15 filas explícitamente marcadas
  `'PLACEHOLDER — validar con abogado laboralista'`), `ausencias`, `guardias_cobertura`,
  `ceses` (+ enum `causal_cese` con las 13 causales), con RLS en cada tabla (Admin ve todo;
  Coordinador excluido de `escalas_legales`/`ceses` por `SECURITY.md`; Asistente/Familia sin
  acceso, regla 8 de `CLAUDE.md`).
- `panel/src/lib/calcularCese.js`: función pura con las 13 causales de PRD_02B, todo valor
  legal resuelto desde `escalas_legales` vigente a la fecha del hecho (regla 10), nunca
  hardcodeado. `panel/src/lib/scoreRiesgo.js`: score 0-100 con los 7 indicadores y pesos
  también desde `escalas_legales`. Ambas con tests (`vitest`, 18/18 pasando) usando fixtures
  fijas, según checklist explícito del PRD ("función pura y testeada").
- UI Módulo 4: `Asistentes.jsx` (lista) + `AsistenteDetalle.jsx` con 5 tabs (Perfil,
  Vínculo/Cese, Simulador de Vínculo, Score de Riesgo, Ausencias y Cobertura). Coordinador
  solo ve la pestaña Perfil (el resto es admin-only, coincide con la exclusión de
  `SECURITY.md`). La pestaña de Cese exige tildar "revisado por abogado" antes de confirmar
  cuando `calcularCese` devuelve `requiereRevisionAbogado: true`; el Simulador reutiliza
  `calcularCese` sin reimplementar la lógica (mandato explícito del PRD).
- i18n: claves nuevas agregadas simultáneamente en es-AR/en/pt-BR (regla 2), CSS solo con
  variables existentes del sistema (regla 6), botones deshabilitados durante guardado (regla
  5), confirmación explícita antes de registrar un cese (regla 4).
- `npm run build` del panel y `npx vitest run` verificados sin errores.

Etapa 2 (Módulos 1-3) sigue como quedó documentado abajo: primer corte del Panel de Administración (`PRD_02_Panel_Admin.md`), scope
acotado a lo que ya tiene datos reales de Etapa 1 — Módulo 1 (Dashboard), Módulo 2
(Postulaciones) y Módulo 3 (Solicitudes de Servicio). Quedan deliberadamente afuera de este
corte: Módulo 4 (Plantel de Asistentes) + `PRD_02B_Gestion_Personal.md` completo (vínculo/
cese/riesgo legal — merece sesión propia dada su sensibilidad legal), Módulos 5-8, y la
matriz completa de notificaciones automáticas.

Se creó `panel/` (Vite + React 18.3.1, `react-router-dom`, `@supabase/supabase-js`, sin
`vite-plugin-pwa` — es una herramienta interna, `<meta name="robots" content="noindex,
nofollow">`). Reutiliza el patrón i18n de Context+localStorage (no hace falta SEO acá) con
`T` es-AR/en/pt-BR completo desde el día uno. Login con Supabase Auth (email+password,
`AuthContext` resuelve el rol desde la tabla nueva `usuarios`). Componente `EstadoLista` +
hook `useSupabaseTable` implementan los 4 estados (regla 3) de forma reusable en las tres
pantallas. Cambios de estado con confirmación (`window.confirm`, regla 4) — en postulaciones
cualquier cambio, en solicitudes solo al pasar a `cancelada`. Botones deshabilitados mientras
guardan (regla 5). Postulaciones dispara un email automático al postulante en cambio de
estado vía un endpoint nuevo del backend (`POST /api/panel/notificar/postulante`, protegido
con `requiereRolPanel` — valida el JWT de Supabase Auth contra `usuarios.rol`).

SQL nuevo (`backend/src/db/schema_etapa2.sql`): tabla `usuarios` (extiende `auth.users`,
columna `rol` con Admin/Coordinador/Asistente/Familia), columnas `nota_interna` en
`postulaciones`/`solicitudes`, columna `estado` en `solicitudes`, y policies RLS para que
Admin/Coordinador lean y editen ambas tablas (sin distinción de zona todavía — se agrega
cuando el dato de zona de la familia/aspirante esté modelado). Aplicado contra la base
Supabase real de producción. **Bug encontrado y corregido durante la verificación**:
recursión infinita en una policy de `usuarios` que subconsultaba la misma tabla
(`admin_ve_todos_los_usuarios`) — Postgres reevalúa RLS dentro del `EXISTS` y entra en loop.
Se sacó esa policy (queda solo `usuario_ve_su_propia_fila`, suficiente para que `AuthContext`
resuelva el rol propio); gestión de otros usuarios (Módulo 8) se resuelve más adelante con
una función `SECURITY DEFINER`, no con una policy recursiva.

Verificado end-to-end contra Supabase real (no hay browser en este entorno, se simuló con
scripts): login real, lectura de `usuarios`/`postulaciones`/`solicitudes` por el mismo camino
que usa el panel (falla si no hay sesión, como corresponde), UPDATE de `postulaciones` con
la policy nueva, y el endpoint de notificación (autenticación por JWT funciona — devuelve 500
recién en el paso de enviar el email, por el mismo problema de certificado TLS local ya
registrado en la entrada de Etapa 1 más abajo, no un bug nuevo). `npm run build` del panel sin
errores. Primer usuario Admin real creado (`prestadora-original.salud@gmail.com`, credenciales en
`No hacer commit/claves y contraseñas.txt`).

Etapa 1 sigue 🟡 en progreso — completa y desplegada a producción (Railway + Vercel), solo
pendiente contenido real de imágenes/fotografía propia y dominio propio
(`prestadora-originalsalud.com.ar`, placeholder), que queda en el checklist de lanzamiento de
`PRD_01_Sitio_Web.md`.

## Decisiones tomadas durante el desarrollo

_Registrar acá cualquier decisión técnica tomada durante el desarrollo que no estaba en
ningún PRD original._

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-07-08 | Se agregó `vitest` como devDependency de `panel/` (no existía suite de tests en el panel hasta ahora) para poder testear `calcularCese`/`calcularScoreRiesgo` con fixtures fijas | El propio checklist de aceptación de `PRD_02B_Gestion_Personal.md` exige explícitamente que el motor de cálculo sea "función pura y testeada" dada su sensibilidad legal |
| 2026-07-08 | En `calcularIndemnizacionAntiguedad` (dentro de `calcularCese.js`), el piso mínimo (mejor remuneración × meses piso) se aplica **antes** que el tope indemnizatorio, no después — un test detectó que aplicarlo al revés permitía que el piso empujara el monto por encima del tope legal | Bug encontrado durante el desarrollo de los tests unitarios; corregido antes de tocar la UI para que la pestaña de Cese nunca muestre un monto que viola el tope legal |
| 2026-07-08 | La pestaña Vínculo y Cese, dentro del Módulo 4, y todo lo demás de `PRD_02B_Gestion_Personal.md` (Simulador, Score de Riesgo, Ausencias/Cobertura) quedan visibles solo para rol Admin — Coordinador solo ve la pestaña Perfil del Asistente | Coincide con la exclusión explícita de Coordinador de `escalas_legales`/`ceses`/datos laborales internos documentada en `SECURITY.md` |
| 2026-07-07 | Se incorporaron 4 patrones de UI/arquitectura de un análisis externo (brief de GlamourOS, ERP para salones de belleza — proyecto ajeno a prestadora-original, solo se tomaron ideas puntuales): (1) teléfono siempre como link `wa.me/` — `DESIGN_SYSTEM.md`; (2) listas largas agrupadas por categoría — `DESIGN_SYSTEM.md`; (3) checklist de onboarding con % de completitud para el Filtro prestadora-original — `PRD_03_Reclutamiento.md`; (4) colores automáticos por estado de guardia — `DESIGN_SYSTEM.md` + `PRD_02_Panel_Admin.md` Módulo 6. También se registró como nota de arquitectura a futuro (no built) la idea de módulos activables por configuración — `PRD_02_Panel_Admin.md` Módulo 8. | Ninguna de estas ideas viene de un PRD original de prestadora-original — se documentan para que quede claro el origen y no se pierdan en la próxima sesión |
| 2026-07-07 | Se descartó explícitamente la gamificación de Asistentes (niveles/rankings/puntos) vista en el mismo análisis externo | Contradice la regla anti-subordinación de `CLAUDE.md` (riesgo legal art. 23 LCT / precedente Cabify) — dejar registrado para que no se reproponga sin resolver antes el riesgo legal |
| 2026-07-07 | Se agrega un quinto rol, `Superadmin`, con login propio y acceso técnico por encima de `Admin` (configuración profunda, alta/baja de elementos sensibles, uso de IA para diagnóstico/corrección de errores) — actualizado en `CONTEXT.md`, `SECURITY.md` y `CLAUDE.md` (raíz) | Decisión de negocio explícita del dueño del proyecto, no estaba en ningún PRD original |
| 2026-07-07 | Se registra como principio de negocio que el modelo debe operar con muy poca gente administrando, por lo que automatizar con IA todo lo que no comprometa el riesgo legal es deseable — puede llevar a re-priorizar algunos niveles de IA que `BUILD_ORDER.md` marca como "Diferida", a evaluar caso por caso cuando se llegue a esa etapa | Decisión de negocio explícita — condiciona el alcance de futuras etapas de IA |
| 2026-07-07 | Se agregó a `DESIGN_SYSTEM.md` un benchmark estético (no solo de prestaciones) de EnCasa, Cuidarlos, Medincare y Cuidando en Casa, con recomendaciones concretas para diferenciarse visualmente (fondos de color completo, fotografía propia con dirección de arte, micro-interacciones, iconografía propia) — se detectaron además dos competidores no presentes en el corpus de negocio original: `Cuidarnos` (UTEP/Movimiento Evita) y `Cuidando en Casa` | Pedido explícito del usuario: superar ampliamente a los competidores desde lo estético, no solo desde las prestaciones |
| 2026-07-07 | Se amplió el benchmark estético con 14 sitios adicionales que aportó el usuario (Ver Salud, Casamed Salud, Situ Care, Home Care BA, Continuum, Cuidarte Argentina, InDom, +Vida Salud, API Cuidados Domiciliarios, Amparando Salud, Cuidar Buenos Aires, más perfiles de Instagram de Go Home y CuidArteBien) y se detectó un vacío: ningún PRD original define identidad visual para Instagram — se agregó una sección nueva en `DESIGN_SYSTEM.md` al respecto | El usuario señaló explícitamente que Instagram no se había tenido en cuenta hasta ahora |
| 2026-07-07 | Limitación técnica declarada: las herramientas de investigación de esta sesión no pueden evaluar Instagram con el mismo nivel de detalle que un sitio web (contenido JS-renderizado, sin acceso a grilla/calidad visual real) — el análisis de esos perfiles es superficial (cadencia, tipo de contenido), no un juicio de calidad visual completo | Transparencia sobre el alcance real del análisis, para que no se tome como definitivo sin revisión manual |
| 2026-07-07 | Un agente en segundo plano relevó ~15 competidores adicionales desde el ángulo de prestaciones/funcionalidades (no estético) mientras se trabajaba en Etapa 0; se guardó como `docs/COMPETIDORES_PRESTACIONES.md`. Hallazgo relevante: **CUIDARnos** (cooperativa impulsada por UTEP/Grobocopatel, lanzamiento 2026) es el primer competidor que reivindica públicamente GPS/geolocalización, aunque en fase piloto (~450 cuidadoras, AMBA) — matiza (sin invalidar) el claim de posicionamiento de prestadora-original de "nadie tiene GPS". También se detectó que `Cuidando en Casa` opera un Centro de Día físico en La Plata, coincidiendo directamente con la zona objetivo de prestadora-original | Pedido del usuario de investigar prestaciones de competidores como fuente de conocimiento para generación futura de contenidos |
| 2026-07-07 | Se inició Etapa 0 (setup): `git init` en `Workspace/`, `.gitignore` y `README.md` raíz, `sitio-web/` scaffolded con Vite + React (fijado a React 18 por ser el stack decidido en `CONTEXT.md`, no React 19 que es el default actual de create-vite), `vite-plugin-pwa@^1.3.0` (única versión compatible con Vite 8), variables CSS/i18n creados en `sitio-web/src/`, `backend/` scaffolded con Express (Node 22) y `nodemailer` fijado a `^9.0.3` por vulnerabilidades de severidad alta en la rama 6.x | Siguiente paso natural tras completar la documentación, ejecutado de forma autónoma por pedido explícito del usuario ("continúa solo sin detenerte a pedir permisos") |
| 2026-07-07 | Construida Etapa 1 completa (primera pasada): 8 páginas de `PRD_01_Sitio_Web.md`, i18n vía `LocaleContext` (React Context + localStorage, no prop-drilling), config centralizada de datos de contacto/precios (`config/siteConfig.js`, placeholders `[DEFINIR]` hasta que el negocio confirme), `vite-plugin-pwa` configurado en `vite.config.js` con manifest real, fuentes Playfair Display + DM Sans cargadas en `index.html`. Diseño aplicó las recomendaciones del benchmark estético de `DESIGN_SYSTEM.md`: bloques de sección con `--fondo-alt` y hero con fondo azul oscuro degradado (no fondo blanco corrido como todos los competidores relevados) | Ejecución del PRD_01, con las recomendaciones de diferenciación visual ya documentadas aplicadas desde el primer commit, no como retrofit posterior |
| 2026-07-07 | Se completaron los datos reales de `siteConfig.js` (teléfono/WhatsApp `+54 9 11 3787 4193`, email `prestadora-original.salud@gmail.com`, zona `AMBA`, dominio placeholder `prestadora-originalsalud.com.ar`), se sacó el campo "horario de atención" (ni el sitio ni el config lo muestran — decisión del usuario, la mayoría de competidores tampoco lo publica y comprometerse a un horario fijo de atención comercial no es sostenible con equipo chico) | Carga incremental de datos de negocio pedida por el usuario ("preguntame los datos y te voy diciendo") |
| 2026-07-07 | **Cambio de stack en Etapa 1**: se reemplazó MySQL/Railway por Supabase (Postgres) desde el arranque, en vez del plan original de `CONTEXT.md` (MySQL en Etapa 1, migración a Supabase recién en Etapa 2). Se actualizaron `CONTEXT.md` y `DATA_MODEL.md`, se reescribieron `backend/src/db/connection.js` (cliente Supabase con Service Role Key en vez de pool mysql2), `backend/src/db/schema.sql` (sintaxis Postgres + `ENABLE ROW LEVEL SECURITY` desde la creación de las tablas) y las dos rutas (`solicitudServicio.js`, `postulacionAsistente.js`) para insertar vía Supabase en vez de `pool.execute`. Se removió `mysql2` del `package.json` del backend y se agregó `@supabase/supabase-js`. Pendiente: crear el proyecto real en Supabase y cargar `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` en un `.env` local | El usuario notó que armar Railway/MySQL para migrar esos datos a Supabase apenas empiece Etapa 2 (Módulos 2 y 3 del panel de Admin trabajan sobre las mismas tablas `solicitudes`/`postulaciones`) era trabajo duplicado — se confirmó el cambio antes de tocar código |
| 2026-07-07 | Proyecto Supabase real creado (`prestadora-original-salud`, credenciales en `No hacer commit/claves y contraseñas.txt`, carpeta agregada a `.gitignore`); tablas `solicitudes`/`postulaciones` aplicadas contra la base real vía cadena de conexión directa, con RLS confirmada activa. Backend probado end-to-end contra Supabase real (insert OK), fila de prueba borrada después. Gmail app-password de `prestadora-original.salud@gmail.com` cargado en `backend/.env` local; el transporter de Nodemailer se ajustó a host/puerto explícitos + `family: 4` (forzar IPv4) porque el entorno de esta sesión no resuelve bien la IP IPv6 de Gmail — el envío de email falla acá por un error de verificación de certificado TLS local (entorno de desarrollo/sandbox), pero se confirmó por separado que la autenticación SMTP en sí funciona (`transporter.verify()` exitoso); debería funcionar sin problema una vez desplegado en Railway (Linux, sin ese interceptor) | Continuación de la carga incremental de credenciales reales para dejar Etapa 1 lista para producción |
| 2026-07-07 | Se documentó en `SECURITY.md` un principio de arquitectura: portabilidad de datos fuera de Supabase sin fricción si algún día hiciera falta migrar — lógica de negocio siempre en el backend Node propio (nunca en Supabase Edge Functions/triggers complejos), RLS en SQL estándar de Postgres, y backup propio (`pg_dump` periódico) independiente del backup nativo de Supabase, pendiente de implementar antes de tener datos reales de pacientes/Asistentes/familias en producción | El usuario pidió explícitamente estar cubierto ante la contingencia de tener que dejar Supabase en el futuro, sin que eso ponga en riesgo la seguridad de los datos ni implique una migración traumática |
| 2026-07-08 | **Migración completa del frontend de Etapa 1 de Vite+React Router a Next.js 15 (App Router)**, con usuarios cero (momento más barato para el cambio). Se reemplazó `LocaleContext` (React Context + localStorage) por rutas con prefijo de idioma reales (`app/[locale]/...`, `middleware.js` redirige `/` → `/es-AR`), cada página exporta `generateMetadata` con title/description/OpenGraph propios y `generateStaticParams` genera las 3 variantes de idioma como HTML estático en build. Los formularios (`SolicitaServicio`, `TrabajaConNosotros`) y el selector de idioma/menú del header pasaron a client components (`'use client'`), el resto (Footer, WhatsAppButton, páginas) quedó como server components. Se agregó `app/manifest.js` (reemplaza `vite-plugin-pwa`, sin service worker offline todavía). Se actualizó `CONTEXT.md`. El backend Express/Supabase no se tocó. Etapas 3-4 (PWA Asistentes/Familias) siguen en Vite | Mandato explícito y de negocio del usuario: "el seo es fundamental, si no nos ven no nos contactan, si no nos contactan no facturamos, si no facturamos todo esto no sirve para nada" — Vite nunca indexaba nada más que español porque el idioma se resolvía 100% client-side. Usuario también pidió, como criterio general para decisiones de arquitectura futuras, priorizar la opción más versátil a largo plazo por sobre la que "por ahora alcanza" |
| 2026-07-08 | Deploy real de Etapa 1 confirmado end-to-end: backend en Railway online (`/health` OK), frontend Next.js desplegado a producción en Vercel con `NEXT_PUBLIC_API_URL` real, y un POST de prueba contra `/api/solicitud-servicio` confirmó que el formulario público llega a Supabase a través de Railway (CORS abierto, sin fricción). Fila de prueba borrada después | Cierre del pendiente que había quedado abierto desde la sesión anterior cuando se priorizó la migración a Next.js sobre la verificación del deploy |
| 2026-07-08 | Service worker offline agregado a mano al sitio público (`public/sw.js` + `public/offline.html`, registrado desde un client component `ServiceWorkerRegister.jsx` en `app/[locale]/layout.jsx`, solo activo en producción): cachea assets estáticos (`_next/static`, íconos, favicon) y muestra `offline.html` con estilo de marca cuando falla la navegación sin red. Se optó por escribirlo directo en vez de una librería (`next-pwa`) para evitar depender de un paquete sin soporte confirmado para Next 15 App Router | Cierre de la deuda técnica registrada en la migración a Next.js; se priorizó una solución simple y sin dependencias nuevas dado que el sitio público no depende de esto para funcionar |
| 2026-07-08 | Etapa 2 (Panel de Administración) construida con React 18 + Vite (no Next.js) — es una herramienta interna, autenticada, que nunca debe indexarse; el SEO/SSR que justificó Next.js en Etapa 1 no aplica acá, coincide con el stack literal de `PRD_02_Panel_Admin.md` y con la decisión ya tomada para las PWA de Etapas 3-4 | Discutido explícitamente con el usuario ("porque en vite?" / "y cual seria ese costo a pagar?") antes de escribir código, para no repetir el mismo argumento de SEO de la migración de Etapa 1 sin justificación |
| 2026-07-08 | Primer corte de Etapa 2 acotado a Módulos 1-3 (Dashboard, Postulaciones, Solicitudes) — son los únicos con datos reales ya fluyendo desde Etapa 1. Módulo 4 + `PRD_02B_Gestion_Personal.md` (vínculo/cese/riesgo legal) quedan fuera deliberadamente, para una sesión propia dada la sensibilidad legal del motor de cálculo de indemnizaciones | Evitar construir sobre tablas (`asistentes`, `guardias`, `familias`, `pacientes`) que todavía no existen, y separar el motor legal (regla 10 de `CLAUDE.md`, mayor riesgo) del resto del panel |
| 2026-07-08 | Se corrigió una policy RLS recursiva (`admin_ve_todos_los_usuarios` en la tabla `usuarios`, subconsultaba la misma tabla dentro de un `EXISTS`) tanto en la base real de Supabase como en `backend/src/db/schema_etapa2.sql`. Se dejó documentado en el propio SQL como comentario para que no se reintroduzca | Postgres reevalúa RLS dentro del `EXISTS`, causando `infinite recursion detected in policy for relation "usuarios"` — descubierto durante la verificación end-to-end con el usuario Admin real recién creado |

## Actualización — Mecanismo de creación de cuentas + inicio de Módulo 5 (Familias)

Tras resolver las dos decisiones pendientes ("vayamos por una a la vez"): usuario eligió
avanzar primero con Login de Familias (Módulo 5), y confirmó construir primero un mecanismo
compartido de creación de cuentas (reutilizable para Asistentes más adelante) en vez de una
solución puntual solo para Familias, sin enviar todavía invitación por email (Etapa 3/4 — las
PWA donde se loguearían — no existen aún).

Se detectó y resolvió un gap arquitectónico no documentado: ni `asistentes` ni `familias`
pueden poblarse hoy porque ambas tablas exigen `id REFERENCES usuarios(id)` (una cuenta real
de Supabase Auth), y no existía ninguna UI que creara esa cuenta — afectaba tanto al Módulo 4
ya construido como al Módulo 5 pedido ahora.

Construido:

- `backend/src/db/schema_etapa2c.sql` (nuevo, **aplicado y verificado contra Supabase real**):
  tablas `familias` (`id REFERENCES usuarios(id)`, RLS: panel Admin/Coordinador gestiona todo
  + policy `familia_ve_su_propia_fila` ya lista para cuando exista la Etapa 4) y `pacientes`
  (datos de salud, RLS solo Admin/Coordinador por regla 7/8 de `CLAUDE.md`), y columna
  `solicitudes.familia_id`.
- `backend/src/utils/cuentasPanel.js`: `crearCuentaConPerfil({ email, nombre, telefono, rol })`
  mecanismo compartido (Asistentes/Familias) que crea la cuenta de Supabase Auth vía
  `admin.createUser` (nunca dispara email por sí solo) + la fila en `usuarios`; `borrarCuenta`
  para rollback.
- `backend/src/routes/panelCuentas.js`: `POST /api/panel/cuentas/familia`, restringido a rol
  Admin (más estricto que el resto del panel, que también admite Coordinador, por ser una
  operación de alto impacto y difícil de revertir). Convierte una `solicitud` en `familia` +
  `paciente` real, con rollback compensatorio manual (borra paciente → familia → cuenta) si
  falla cualquier paso posterior a la creación de la cuenta.
- `panel/src/pages/SolicitudDetalle.jsx`: botón "Convertir en Familia" (solo visible para
  Admin, con confirmación explícita — regla 4 — y deshabilitado mientras se ejecuta — regla 5).
- i18n de las 4 claves nuevas agregado simultáneamente en es-AR/en/pt-BR (regla 2).

Verificado: `schema_etapa2c.sql` aplicado contra Supabase real (RLS activa en ambas tablas
nuevas, columna `familia_id` agregada); `npm run build` y `npx vitest run` de `panel/` sin
errores (18/18 tests); `/api/panel/cuentas/familia` monta correctamente en el backend real
corriendo (responde 401 sin token, no 404).

El lado Asistente del mismo mecanismo ("convertir aspirante en Asistente") queda
deliberadamente afuera: requiere primero una UI para el pipeline de Filtro prestadora-original
(`aspirantes`/`verificaciones_asistente`), que no existe todavía.

## Actualización — Módulo 5 completo (pantalla de Familias y Pacientes)

Construida la pantalla propia de Módulo 5 (`PRD_02_Panel_Admin.md`: "Lista de familias
activas; por familia: contacto, pacientes, guardias activas, historial de reportes, alertas
activas"):

- `panel/src/pages/Familias.jsx`: lista con buscador (nombre/email/teléfono), columnas
  contacto + cantidad de Pacientes + fecha de alta, 4 estados (regla 3).
- `panel/src/pages/familias/FamiliaDetalle.jsx`: contacto, tabla de Pacientes (nombre, fecha
  de nacimiento, nivel de complejidad, domicilio), y tres secciones (guardias activas,
  historial de reportes, alertas activas) que muestran explícitamente "no disponible
  todavía" en vez de una lista vacía falsa — esos datos dependen de la PWA de Asistentes
  (Etapa 3), que no existe.
- Ambas pantallas hacen `select` embebido `familias → solicitudes → pacientes` vía
  Supabase/PostgREST. **Nota técnica no obvia**: `familias.solicitud_id → solicitudes(id)` y
  `solicitudes.familia_id → familias(id)` son dos FK cruzadas entre las mismas dos tablas —
  PostgREST no puede resolver el embed sin ambigüedad (`PGRST201`, confirmado en vivo contra
  Supabase real) a menos que se indique explícitamente qué relación usar:
  `solicitudes!familias_solicitud_id_fkey(...)`. Si se agrega otro embed entre estas dos
  tablas en el futuro, usar siempre el hint de FK, nunca el nombre de tabla a secas.
- `panel/src/App.jsx` (rutas `/familias` y `/familias/:id`), `panel/src/components/layout/Layout.jsx`
  (link de nav), `panel/src/i18n/translations.js` (bloque `familias` + `nav.familias` en
  es-AR/en/pt-BR).

Verificado: `npm run build` y `npx vitest run` sin errores (18/18); confirmado en vivo contra
Supabase real que el hint de FK evita el error de ambigüedad y que sin sesión autenticada
RLS bloquea la lectura (`[]`).

Con esto, Módulo 5 queda completo salvo por los datos que dependen de Etapa 3 (guardias/
reportes/alertas), documentados como pendientes explícitos, no como bugs.

## Actualización — Primer esquema de Precios y Prestaciones particulares por Paciente

Construido, aplicado y verificado contra Supabase real un primer esquema de trabajo para
Precios/Prestaciones (parte de lo que `BUILD_ORDER.md` llama Módulo 8), explícitamente
marcado como provisional: el usuario lo aprobó con "armemos un primer esquema de trabajo
así y veamos como lo hacemos evolucionar en la medida que lo usemos", no como diseño
cerrado.

Reglas de negocio confirmadas con el usuario que moldean este esquema:

- Ningún medio público (sitio, app, etc.) habla nunca de precios — eso queda privativo de
  la respuesta de contacto directa. La lista de precios es de uso interno, orientativa.
- Cada Familia/Paciente tiene una Prestación particular propia (días, horario, cantidad de
  guardias, feriados, viajes, internación, etc.), con su propio precio final ajustado —
  no todos los clientes tienen las mismas necesidades ni las mismas posibilidades
  económicas.
- La lista de precios y la Prestación particular están vinculadas: el operador arma la
  Prestación viendo el precio de lista y le aplica una bonificación ahí mismo (no son
  datos independientes).
- Si la lista general cambia, **no se ajusta solo** el precio ya pactado con una Familia —
  se marca la Prestación como "a revisar" para que el Coordinador a cargo de esa cuenta
  decida (la política de cuánto trasladar y cómo queda deliberadamente afuera de este
  corte, a definir en una sesión futura).
- Varias Prestaciones simultáneas de un mismo Paciente deben poder manejarse como un solo
  paquete económico (un precio propio, no la suma de las partes), además de operarse en
  forma conjunta.

Se investigaron (research de mercado, agencias de cuidado domiciliario y de personal de
enfermería comparables) los patrones de "precio de lista con bonificación negociada",
"paquete de prestaciones con precio propio" y "aviso al responsable de cuenta ante cambio
de precio, nunca ajuste automático" antes de diseñar el esquema, porque el usuario mismo
señaló que se estaba inventando el modelo sobre la marcha y pidió una referencia real.

**Esquema (`backend/src/db/schema_etapa2d.sql`, aplicado y verificado contra Supabase real):**

- `lista_precios`: referencia interna (tipo de servicio, modalidad, precio, vigencia,
  activo). Lectura Admin+Coordinador, edición solo Admin (políticas separadas por
  operación, primera vez que se usa este patrón en el proyecto en vez de un `FOR ALL`
  único).
- `prestaciones`: una por Paciente, con `configuracion` en JSONB (mismo patrón que
  `asistentes.disponibilidad`) para días/horario/cantidad de guardias/feriados/viajes/
  internación sin tener que migrar la tabla cada vez que aparece un caso nuevo.
  Guarda una **foto** del precio de lista al momento de armarla
  (`precio_lista_snapshot`) — no una referencia viva — más el tipo/valor de bonificación y
  el `precio_final` ya calculado. `requiere_revision` (booleano) es el aviso al
  Coordinador.
- `paquetes_prestaciones` + `paquete_prestacion_items`: agrupa Prestaciones del mismo
  Paciente bajo un precio propio, independiente de sumar las partes.
- Trigger `trigger_precio_lista_actualizado` (función `marcar_prestaciones_a_revisar()`,
  `SECURITY DEFINER`): al cambiar `lista_precios.precio`, marca `requiere_revision = true`
  en toda Prestación vigente que lo use — nunca toca `precio_final`.

Verificado con conexión directa (`pg`, scripts de un solo uso descartados después de
correrlos, sin hardcodear la contraseña — leída en runtime de
`No hacer commit/claves y contraseñas.txt`): las 4 tablas nuevas tienen
`relrowsecurity = true` con las policies esperadas, y el trigger fue probado de punta a
punta dentro de una transacción con `ROLLBACK` (sin dejar rastro en la base real) —
confirmó que `requiere_revision` pasa a `true` y `precio_final` no se toca cuando cambia el
precio de lista.

**UI construida:**

- `panel/src/pages/ListaPrecios.jsx` + `ListaPrecioDetalle.jsx`: pantalla de Lista de
  Precios. Admin puede crear/editar filas (con aviso explícito de que cambiar un precio no
  toca Prestaciones ya pactadas, solo las marca); Coordinador solo puede ver.
- `panel/src/pages/familias/PrestacionesPaciente.jsx`: modal accesible desde la ficha de
  Familia (`FamiliaDetalle.jsx`, botón nuevo por Paciente) que arma una Prestación nueva
  (elige servicio de la Lista de Precios, carga configuración y bonificación, muestra el
  precio final calculado en vivo), lista las Prestaciones vigentes con su estado ("a
  revisar" / "al día", con botón para que el Coordinador marque como revisado), y permite
  agrupar dos o más Prestaciones seleccionadas en un paquete con precio propio.
- `panel/src/App.jsx` (ruta `/lista-precios`), `panel/src/components/layout/Layout.jsx`
  (link de nav), `panel/src/i18n/translations.js` (bloques `lista_precios` y `prestaciones`
  + claves `nav.lista_precios`/`comun.editar` en es-AR/en/pt-BR).

Verificado: `npm run build` y `npx vitest run` de `panel/` sin errores (18/18 tests,
ninguno nuevo agregado todavía para este módulo — la lógica de cálculo de precio final es
simple y se prueba visualmente, no amerita todavía un archivo de test propio).

Queda explícitamente afuera de este corte (deuda conocida, no bug): la política de cuánto
de un aumento de precio de lista trasladar a cada Familia (el usuario la difirió a una
sesión futura, "ya veremos en su momento la política de formación de precios"); una
pantalla dedicada para gestionar `paquetes_prestaciones` existentes (hoy solo se listan,
no se editan/eliminan desde la UI); tests automatizados de `PrestacionesPaciente.jsx`.

## Actualización — `schema_etapa2b.sql` aplicado contra Supabase real

Con la contraseña de la base (provista por el usuario, ver
`No hacer commit/claves y contraseñas.txt`) se aplicó `backend/src/db/schema_etapa2b.sql`
contra el proyecto real de Supabase mediante conexión directa (`pg`, no había `psql` ni
`supabase` CLI enlazado disponibles en este entorno — se usó un script Node de un solo uso
con la librería `pg`, descartado después de correrlo). Verificado:

- Las 7 tablas nuevas (`aspirantes`, `asistentes`, `verificaciones_asistente`,
  `escalas_legales`, `ausencias`, `guardias_cobertura`, `ceses`) existen con
  `relrowsecurity = true` y la cantidad de policies esperada por tabla.
- 15 filas seed en `escalas_legales` y 13 valores del enum `causal_cese`, ambos coinciden
  con lo escrito en el SQL.
- Confirmación end-to-end de que la RLS bloquea de verdad (no solo que está "activada"):
  una consulta REST sin sesión (clave publicable, sin JWT de usuario autenticado) a
  `escalas_legales` devuelve `[]` en vez de las 15 filas reales — el dato sensible no se
  filtra a un cliente no autenticado.

Con esto, Etapa 2B queda completa (código + base real), y ya no es un bloqueante para
Etapa 3 según la regla de secuencia de `BUILD_ORDER.md`.

## Próximos pasos sugeridos (por qué se detuvo acá esta sesión)

Con Módulo 4 + `PRD_02B_Gestion_Personal.md` en código, evalué seguir de largo con los
Módulos 5-8 del panel (`PRD_02_Panel_Admin.md`) durante la misma sesión nocturna, pero decidí
no hacerlo sin confirmación, por una razón de secuencia de `BUILD_ORDER.md` (regla no
negociable: "no empezar una etapa de código sin que la anterior esté funcionando en
producción"):

- **Módulo 5 (Familias y Pacientes)**: la tabla `familias` en `DATA_MODEL.md` tiene
  `id UUID REFERENCES usuarios(id)` — es decir, una familia solo puede existir si ya tiene
  una cuenta de Supabase Auth. Crear ese login de familia es explícitamente alcance de
  Etapa 4 (PWA Familias), que todavía no arrancó. Construir Módulo 5 ahora implicaría
  decidir por mi cuenta cómo crear cuentas de familia antes de tiempo, o modelar una tabla
  distinta a la documentada — una decisión de arquitectura que prefiero no tomar sin el
  usuario.
- **Módulos 6 (Guardias) y 7 (Reportes y Alertas)**: dependen de datos que todavía no
  existen (`guardias`, `reportes`, `alertas` se generan desde la PWA de Asistentes, Etapa 3,
  que aún no se construyó). Cualquier UI acá sería una cáscara vacía sin datos reales que
  mostrar.
- **Módulo 8 (Configuración)**: no tiene tabla definida en `DATA_MODEL.md` (a diferencia de
  Módulo 4, que sí tenía spec completa en `PRD_02B_Gestion_Personal.md`). Money involucrado
  (precios por modalidad, regla 1 de `CLAUDE.md` — nunca hardcodear precios) amerita que el
  usuario confirme el esquema antes de escribir SQL nuevo sin PRD de respaldo.

Por eso el trabajo autónomo de esta sesión se acotó a Módulo 4 + Etapa 2B (que sí tenían PRD
completo y no dependían de etapas futuras), en vez de avanzar sobre módulos que requieren
decisiones de producto/arquitectura no tomadas todavía. El usuario ya aplicó la contraseña
de la base (ver sección de arriba), así que el único punto pendiente real es:
1. Decidir si Etapa 4 (login de familias) se adelanta para poder construir Módulo 5, o si
   Módulo 5 espera su turno natural en `BUILD_ORDER.md`.
2. Confirmar el esquema de precios/configuración de Módulo 8 antes de que se construya.

## Actualización — Afinado final de Etapa 2 antes del deploy (gestión de usuarios, dashboard, Proceso de Incorporación, Certificado prestadora-original)

El usuario pidió terminar de afinar todo lo posible del Panel antes de desplegarlo a
producción, y priorizó 4 gaps detectados contra `PRD_02_Panel_Admin.md` — "todas ellas y en
el orden más conveniente":

**1. Gestión de usuarios del Panel** (antes solo existía una cuenta Admin creada a mano):

- `backend/src/routes/panelUsuarios.js` (nuevo): CRUD-lite de cuentas admin/coordinador
  (GET lista, POST crea, PATCH edita, DELETE da de baja), admin-only, reusa
  `crearCuentaConPerfil`/`borrarCuenta` de `cuentasPanel.js` (mismo mecanismo ya construido
  para Familias). `crearCuentaConPerfil` ahora acepta `zonas` opcional.
- `panel/src/pages/UsuariosPanel.jsx` (nuevo): lista + alta de Coordinador + edición/baja,
  ruta `/usuarios-panel` visible solo para Admin en el nav.

**2. Métricas del Dashboard completas**: se agregaron "Asistentes disponibles" (`asistentes`
con `estado = 'activo'`) y "Familias activas" (`familias` sin `deleted_at`) a
`panel/src/pages/Dashboard.jsx`, que antes solo mostraba postulaciones/solicitudes.

**3. Proceso de Incorporación de Asistentes** (las 5 etapas de `verificaciones_asistente`,
tabla que ya existía en `schema_etapa2b.sql` sin ninguna UI):

- **Nota de terminología importante**: el usuario rechazó explícitamente el nombre "Filtro
  prestadora-original" para esta pantalla interna del Panel ("un nombre de mierda") — se renombró a
  **"Proceso de Incorporación de Asistentes"** solo para uso interno; "El Filtro prestadora-original"
  queda reservado para un eventual uso público/marketing, todavía no confirmado. Ver nota
  en `CLAUDE.md` (glosario) fechada 2026-07-08. **No reintroducir "Filtro prestadora-original" en el
  código/UI del Panel.**
- `backend/src/db/schema_etapa2e.sql` (nuevo, **no aplicado todavía**): agrega
  `postulaciones.asistente_id`.
- `backend/src/routes/panelCuentas.js`: nuevo `POST /api/panel/cuentas/asistente`
  (admin-only, mismo patrón de rollback que `/familia`) — convierte una postulación
  aprobada en cuenta real de Asistente (`estado: 'inactivo'` hasta completar el proceso) +
  crea las 5 filas de `verificaciones_asistente` (la etapa "postulacion" arranca aprobada,
  ya se cumplió).
- `panel/src/pages/PostulacionDetalle.jsx`: botón "Iniciar Proceso de Incorporación"
  (solo Admin, solo si `estado === 'aprobado'` y sin `asistente_id` todavía), navega al
  perfil del Asistente recién creado.
- `panel/src/pages/asistentes/VerificacionTab.jsx` (nuevo) + tab nueva en
  `AsistenteDetalle.jsx` (visible para Admin y Coordinador, a diferencia de Vínculo/Cese/
  Simulador/Score que son admin-only): permite avanzar cada una de las 5 etapas
  (pendiente/aprobada/rechazada) con notas.

**4. Certificado prestadora-original con QR** (Módulo 4, "botón generar/ver Certificado QR"):

- Se investigó el PRD (`PRD_03_Reclutamiento.md`, `PRD_04_05_App_Servicio.md`,
  `DATA_MODEL.md`) antes de construir: el certificado reusa `asistentes.qr_token` (ya
  existía en el schema, no se creó un segundo mecanismo), y el QR apunta a una página
  pública (`prestadora-originalsalud.com.ar/asistente/[qr_token]`) que es explícitamente Etapa 6 —
  todavía no existe (otra PWA/sitio).
- **Decisión de alcance confirmada con el usuario**: construir solo el lado Panel ahora
  (emitir/ver el certificado + generar el QR), no adelantar la página pública de Etapa 6.
- `backend/src/db/schema_etapa2f.sql` (nuevo, **no aplicado todavía**): tabla `certificados`
  tal cual está documentada en `DATA_MODEL.md` (`fecha_emision`, `fecha_vencimiento`,
  `activo`), RLS Admin+Coordinador.
- `panel/src/pages/asistentes/CertificadoTab.jsx` (nuevo) + tab nueva en
  `AsistenteDetalle.jsx` (visible para Admin y Coordinador): botón "Emitir Certificado"
  (solo si el Asistente ya está en estado Activo), genera el QR con la librería `qrcode`
  (nueva dependencia de `panel/package.json`) apuntando a
  `VITE_SITE_URL/asistente/{qr_token}` (nueva env var, con fallback al dominio placeholder
  ya usado en `sitio-web/src/config/siteConfig.js`), botón para descargarlo como PNG.

**Verificado**: `npm run build` de `panel/` sin errores tras cada uno de los 4 bloques;
`npx vitest run` 18/18 sin regresiones; `node --check` sobre los 4 archivos backend
tocados/creados (`panelCuentas.js`, `panelUsuarios.js`, `server.js`, `cuentasPanel.js`);
paridad de claves i18n verificada programáticamente entre es-AR/en/pt-BR (0 mismatches).
`schema_etapa2e.sql` y `schema_etapa2f.sql` corridos contra Supabase real y verificados
(columna `postulaciones.asistente_id`, tabla `certificados` con RLS y policy activas).

## Actualización — Deploy del Panel a producción

Desplegado en Vercel: **https://prestadora-original-panel.vercel.app** (proyecto `prestadora-original-panel`,
mismo team `betosps-projects` que `sitio-web`). `panel/vercel.json` agregado con rewrite
SPA (`/(.*)` → `/index.html`) para que las rutas de React Router no den 404 al refrescar.
Variables de entorno de producción cargadas en Vercel: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (apunta al backend real en Railway,
`https://prestadora-original-backend-production.up.railway.app`), `VITE_SITE_URL`. El backend ya
acepta requests del panel sin cambios (`cors()` sin restricción de origen en
`backend/src/server.js`). Meta `robots: noindex, nofollow` confirmada en producción
(`curl` sobre la URL real). Con esto, Etapa 3 (PWA Asistentes) queda desbloqueada según
la regla de secuencia de `BUILD_ORDER.md`.

**Bugs post-deploy encontrados y arreglados el mismo día (2026-07-08):**
- `panel/src/pages/Login.jsx` nunca navegaba a `/` tras un login exitoso (`ProtectedRoute`
  solo redirige *hacia* `/login`, nada te sacaba de ahí) — el botón quedaba en "Ingresando"
  para siempre. Fix: `navigate('/', { replace: true })` tras un login sin error.
- `panel/src/pages/Dashboard.jsx` llamaba `useSupabaseTable('asistentes')` y
  `useSupabaseTable('familias')` sin `orderBy`, y el default del hook es `creado_en` — pero
  ambas tablas usan `created_at` (igual que ya manejaba `Asistentes.jsx`). Rompía el
  Dashboard con "la columna no existe". Fix: pasar `{ orderBy: 'created_at' }` en ambos.
- El backend en Railway **no se redespliega solo con `git push`** — quedó corriendo una
  build vieja sin la ruta `/api/panel/usuarios` (nueva de esta sesión) hasta que se corrió
  `railway up` manualmente desde `backend/`. **Recordar**: después de cualquier cambio en
  `backend/`, además del commit/push hace falta `cd backend && railway up --detach` para
  que llegue a producción — a diferencia del panel (Vercel), que si se redespliega con
  cada `vercel --prod` manual pero al menos usa el código ya pusheado.

## Actualización — Módulo 8 completo (Configuración) + wiring del sitio público

Cierre del tercer y último ítem de la auditoría de Etapas 1-2 (i18n hardcodeado y rol
Superadmin ya cerrados en la actualización anterior). El PRD no tenía tabla definida para
este módulo (a diferencia del Módulo 4) — se diseñó un esquema nuevo, deliberadamente simple:

- `backend/src/db/schema_etapa2h.sql` (nuevo, **aplicado y verificado contra Supabase
  real**): `configuracion_empresa` (fila única, `id SMALLINT CHECK (id = 1)`, datos de
  contacto/dominio/zona), `zonas_cobertura` (código/nombre/categoría/activa/orden, con
  policy pública de solo-lectura `activa = true` además de la de gestión Admin/Superadmin —
  reemplaza la lista fija que vivía en `siteConfig.js`), `configuracion_notificaciones`
  (`emails TEXT[]` + `activo` por evento, dos eventos seed: nueva solicitud y nueva
  postulación).
- **Decisión de diseño no trivial**: se descartó explícitamente un esquema de
  `roles_destino` (resolver destinatarios de notificación por rol) porque la tabla
  `usuarios` no tiene columna de email (solo `auth.users` la tiene) — hubiera exigido N+1
  llamadas a `supabase.auth.admin.getUserById`. En su lugar, cada evento tiene un array
  plano de emails editable desde el Panel, con fallback a `SMTP_USER` si está vacío.
- `backend/src/routes/panelConfiguracion.js` (nuevo): CRUD de las 3 tablas, admin-only.
- `backend/src/routes/configuracionPublica.js` (nuevo): endpoint público sin autenticación
  (`GET /api/configuracion-publica`) que expone solo datos públicos de la empresa + zonas
  activas — nunca nada de `escalas_legales`/datos laborales internos (regla 7/8).
- `backend/src/utils/email.js`: `enviarEmailCoordinador` ahora resuelve destinatarios desde
  `configuracion_notificaciones` por evento en vez de mandar siempre a `SMTP_USER` fijo.
  `postulacionAsistente.js`/`solicitudServicio.js` pasan el `evento` correspondiente.
- `panel/src/pages/Configuracion.jsx` (nuevo): 3 tabs (Empresa, Zonas de cobertura,
  Notificaciones), ruta `/configuracion` visible solo para Admin/Superadmin.
- **Sitio público conectado al dato real** (antes hardcodeado en `siteConfig.js`, regla 1):
  `sitio-web/src/lib/configuracionPublica.js` (nuevo) hace `fetch` server-side con
  `revalidate: 300` al endpoint público, con fallback a los valores estáticos de
  `siteConfig.js` si el backend no responde (build sin red, caída puntual) — nunca rompe el
  build ni deja una página vacía. Conectado en `layout.jsx` (WhatsApp flotante),
  `contacto/page.jsx` (teléfono/WhatsApp/email/zona) y `trabaja-con-nosotros/page.jsx` (las
  zonas de cobertura del formulario de postulación, antes una lista fija). Los códigos de
  zona que no tengan traducción en `t.trabaja.zonas` (por ejemplo una zona nueva que un
  Admin agregue desde el Panel sin actualizar el i18n) muestran el código crudo en vez de
  romper — degradación aceptada conscientemente, no un bug.

**Verificado**: `npm run build` de `panel/` sin errores; `npm run build` de `sitio-web/`
sin errores con `NEXT_PUBLIC_API_URL` real (las 25 páginas estáticas se generaron trayendo
datos reales del backend/Supabase en build time). Migración aplicada contra Supabase real
(conexión directa con `pg`, script descartado después de correrlo). Los 3 servicios
redesplegados: backend (Railway, `/health` y `/api/configuracion-publica` verificados con
`curl` tras el deploy), panel y sitio-web (Vercel `--prod` + re-alias a los subdominios de
siempre).

## Actualización — Cierre de hallazgos médios/menores de la auditoría de Etapa 2 (RLS por zona, i18n, estados faltantes)

Continuación de la auditoría completa de 34 ítems mencionada arriba (2026-07-08): tras
cerrar el crítico #2 (rol Superadmin) y las 2 brechas de i18n hardcodeado ya documentadas,
se resolvieron iterativamente el resto de los hallazgos médios/menores, hasta que una nueva
pasada de auditoría no encontró nada más para corregir:

- **RLS por zona para Coordinador** (`backend/src/db/schema_etapa2i.sql`, aplicado y
  verificado contra Supabase real): ver detalle y alcance real (incluye lo que queda
  deliberadamente sin resolver) en `docs/SECURITY.md`, sección RLS. También se agregó una
  vista `asistentes_coordinador` (`security_invoker=true`) para que Coordinador nunca lea
  columnas de sueldo/vínculo laboral vía `AsistenteDetalle.jsx` — RLS es row-level, no
  column-level, así que la restricción de columnas se resuelve con la vista, no solo
  ocultando tabs en el frontend. Se corrigió de paso un bug encontrado durante este trabajo:
  `asistentes` no tenía ninguna policy de `UPDATE` para Coordinador (`PerfilTab.jsx` asumía
  que sí podía editar, y fallaba en silencio).
- **Postulaciones guardaba texto ya traducido en vez de códigos estables**
  (`sitio-web/.../TrabajaConNosotrosForm.jsx`): una postulación en portugués guardaba
  `especialidades`/`zonas`/`disponibilidad` en portugués, rompiendo cualquier filtro o
  comparación en el Panel. Corregido para guardar siempre el código (`asistente_integral`,
  `manana`, etc.), nunca el label ya traducido. Como el Panel necesitaba entonces traducir
  esos códigos para mostrarlos, se construyó la infraestructura completa: helpers
  `panel/src/lib/postulacionCodigos.js`, mapas de labels en las 3 locales
  (`postulaciones.especialidades_labels`/`zonas_labels`/`disponibilidad_labels`/
  `situacion_fiscal_labels`), y filtros por especialidad/zona/disponibilidad en
  `Postulaciones.jsx` (hallazgo separado del mismo audit, relacionado).
- **Rutas admin-only navegables por URL directa por Coordinador**: `/usuarios-panel` y
  `/configuracion` solo estaban ocultas del nav (`Layout.jsx`), no bloqueadas por ruta.
  `panel/src/components/layout/ProtectedRoute.jsx` ahora acepta un prop `soloAdmin`,
  aplicado a ambas rutas en `App.jsx`.
- **Simulador de Vínculo con fallback de sueldo inventado**
  (`SimuladorVinculoTab.jsx`): si al Asistente le faltaba `valor_hora`/`sueldo_basico`, el
  simulador completaba con un número de referencia hardcodeado (contradice el espíritu de
  la regla 1/10 — es un monto monetario que alimenta una proyección de riesgo legal). Ahora
  la fila muestra explícitamente "Falta cargar el dato en Perfil" en vez de un monto
  inventado.
- **Estado "no encontrado" ausente** en `FamiliaDetalle.jsx` y `AsistenteDetalle.jsx`: un
  ID inexistente mostraba el mismo error genérico que una falla de red real. Se distingue
  ahora el código `PGRST116` de PostgREST ("no rows") de un error genuino, con un estado
  `no_encontrado` propio (regla 3).
- **Botones sin deshabilitar durante operación en curso** (regla 5): el checkbox "activa"
  de Zonas en `Configuracion.jsx` y el botón "marcar revisado" por Prestación en
  `PrestacionesPaciente.jsx` permitían doble click/doble submit.
- **Teléfonos como `tel:` en vez de `wa.me`**: `SolicitudDetalle.jsx`, `Solicitudes.jsx`,
  `FamiliaDetalle.jsx` usaban links `tel:` — convención documentada de `DESIGN_SYSTEM.md`
  exige siempre WhatsApp. Nuevo helper `panel/src/lib/telefono.js` (`linkWhatsapp`).
- **Falta la clase CSS `.panel-explicacion`**: usada en varias pantallas, nunca definida en
  `index.css` — agregada (solo variables del sistema, regla 6).
- **`<html lang="en">` en el Panel**: corregido a `lang="es-AR"` (regla 11/accesibilidad).
- **Tab "Ausencias y Cobertura" vetada a Coordinador sin motivo real**: no tiene datos
  laborales sensibles y ya tiene RLS de zona (ver arriba) — se agregó a
  `TABS_COORDINADOR` en `AsistenteDetalle.jsx`, cerrando la inconsistencia entre lo que el
  backend ya permitía y lo que el frontend mostraba.
- **`SolicitaServicioForm.jsx` alineaba el label del tipo de servicio por índice posicional**
  contra `t.servicios.items[i]` en vez de por código — si algún día se reordena uno de los
  dos arrays (el de códigos del formulario o el de `items` de `translations.js`) sin tocar
  el otro, el label mostrado quedaría desalineado con el valor real enviado, en silencio. Se
  agregó un campo `codigo` a cada entrada de `servicios.items` (3 locales,
  `sitio-web/src/i18n/translations.js`) y el formulario ahora busca por
  `items.find(item => item.codigo === tipo)` en vez de por índice.
- **Bug de regresión detectado durante la verificación de esta sesión**: al agregar
  `fraccion_computable_antiguedad` a `escalas_legales` (parte del trabajo de RLS de zona
  de más arriba), el fixture congelado de `calcularCese.test.js`
  (`panel/src/lib/__tests__/calcularCese.test.js`) no se actualizó con la fila nueva —
  `npx vitest run` empezó a fallar (redondeo de antigüedad LCT art. 245 daba 3 años en vez
  de 4, porque `obtenerValorEscala` devolvía `null` para el umbral y la función salteaba el
  redondeo por fracción). Se agregó la fila faltante al fixture (valor 90 días, igual que el
  seed real de `schema_etapa2i.sql`); los 18 tests vuelven a pasar.
- **Auditoría de claves i18n huérfanas del Panel**: comparación programática de las 326
  claves hoja de `T['es-AR']` contra su uso en `panel/src/**`. La mayoría de los "sin uso"
  detectados por grep literal resultaron ser falsos positivos (acceso dinámico por template
  string, ej. `t.postulaciones[\`estado_${estado}\`]`, `t.asistentes.ausencias[\`tipo_${tipo}\`]`)
  — se verificaron uno por uno antes de tocar nada. Se confirmaron y eliminaron 3 claves
  realmente muertas (sin ningún uso, ni literal ni dinámico) en las 3 locales:
  `postulaciones.cambiar_estado`, `postulaciones.email_enviado`, `solicitudes.cambiar_estado`
  (`PostulacionDetalle.jsx`/`SolicitudDetalle.jsx` ya usan `t.postulaciones.confirmar_cambio_estado`
  y notifican por email sin mostrar un mensaje de confirmación aparte).

**Deliberadamente fuera de alcance de esta sesión (deuda técnica documentada, no bugs)**:

- **"Vista mapa" de Postulaciones** (`PRD_02_Panel_Admin.md`, Módulo 2: "Vista mapa con
  Asistentes del plantel activo agrupados por zona"): requiere infraestructura de
  geolocalización/mapas que no existe hoy en el Panel. Confirmado como requisito real de
  PRD, no un falso positivo de auditoría — queda pendiente para cuando se defina esa
  infraestructura (probablemente junto con GPS de la PWA de Asistentes, Etapa 3).
- **"Asignar Asistente" desde Solicitudes** (`PRD_02_Panel_Admin.md`, Módulo 3): confirmado
  vía grep que `solicitudes` no tiene columna `asistente_id` en ningún schema — asignar un
  Asistente a una Solicitud (por zona + especialidad + disponibilidad) requiere una decisión
  de modelo de datos (¿se asigna a nivel Solicitud, o recién al convertirse en Guardia real
  en el futuro Módulo 6?) que no corresponde tomar sin el usuario. Mismo criterio que el
  gap de zona de `solicitudes`/`familias` de `SECURITY.md`.
- **Módulo 8 (Configuración) construido con una estructura distinta a la enumerada en
  `PRD_02_Panel_Admin.md`** (el PRD no traía tabla de datos definida para este módulo, a
  diferencia del Módulo 4 — ver la entrada "Módulo 8 completo" más arriba, que ya documenta
  que se diseñó un esquema nuevo desde cero por decisión explícita). Se revisó de nuevo en
  esta auditoría y se confirma que la reorganización (3 tabs: Empresa/Zonas/Notificaciones,
  en vez de una lista plana de settings) es una decisión de diseño ya tomada y funcional,
  no una desviación accidental — no amerita más cambio que dejarlo señalado acá para que
  quede claro que se revisó a propósito.

**Verificado**: `npm run build` de `panel/` y `sitio-web/` sin errores; `npx vitest run`
18/18 (tras el fix del fixture); paridad de claves i18n entre es-AR/en/pt-BR revisada a
mano en cada bloque tocado.

## Actualización — Intento de automatizar el deploy de Railway (resultado: se descartó, sigue siendo manual)

Se intentó (2026-07-09) automatizar el deploy del backend conectando el servicio
`prestadora-original-backend` al repo de GitHub (`BetoSP/prestadora-original`, rama `main`) vía la API GraphQL de
Railway, con la idea de que un `git push` disparara el build solo, sin correr `railway up` a
mano. Resultado real, tras probarlo a fondo:

- Conectar el `source.repo` vía API (`service source connect` del CLI) **no instala ningún
  webhook ni GitHub App** en el repo — se confirmó con `gh api repos/BetoSP/prestadora-original/hooks`
  devolviendo `[]`. Ese paso requiere una autorización OAuth desde el dashboard de Railway
  (un humano aprobando el acceso en GitHub), que no se puede scriptear por API/CLI. Por eso
  el push a `main` de este mismo día nunca disparó un deploy.
- Además, setear `rootDirectory: "backend"` en el servicio (necesario si algún día se logra
  el trigger por GitHub, porque ese flujo clona el repo completo) **rompe los deploys
  manuales por CLI** (`railway up` desde `backend/`): el CLI ya sube solo el contenido de
  `backend/` como raíz, así que Railway termina buscando `backend/backend/` adentro y el build
  falla en el paso de "scheduling" sin logs útiles. Pasó con 3 intentos seguidos.
- Al intentar correr `railway up` desde la raíz del repo en vez de `backend/` (para evitar el
  problema anterior), el CLI, al no tener esa carpeta vinculada a ningún proyecto local, creó
  un **proyecto nuevo huérfano** en la cuenta de Railway en vez de usar `prestadora-original-backend`. Se
  detectó y se borró (`projectDelete` vía API) antes de que quedara ocupando recursos.
- Se revirtió `rootDirectory` a vacío (`""` — pasar `null` en la mutación no lo limpia,
  GraphQL lo interpreta como "no cambiar", hace falta string vacío) y `watchPatterns` a `[]`,
  volviendo el servicio al estado funcional anterior. El commit pendiente del punto anterior
  (tabla `aspirantes`, notificaciones de vencimiento, docs de marca) **se deployó igual, a
  mano, con `railway up --detach` desde `backend/`** — deploy confirmado `SUCCESS`, backend
  corriendo el código nuevo sin errores en el arranque.

**Conclusión para sesiones futuras:** el deploy de `backend/` sigue siendo manual
(`cd backend && railway up --detach` después de cada push). Automatizarlo de verdad requiere
que el usuario instale la GitHub App de Railway desde el dashboard (Project Settings →
Source → conectar GitHub), un paso que no se puede hacer por API. Si se hace ese paso a mano
en el futuro, ahí sí conviene volver a setear `rootDirectory: "backend"` — pero recordar que
mientras esté seteado, cualquier deploy manual por CLI debe correrse desde la raíz del repo
(`Workspace/`) con `--service prestadora-original-backend` estando esa carpeta ya vinculada al proyecto
correcto, nunca desde `backend/` directamente, para no repetir el error de este intento.

## Actualización — Auditoría exhaustiva de todo el código (backend + panel + sitio-web) y cierre de los 2 hallazgos arquitectónicos pendientes

Continuación literal, archivo por archivo, de la auditoría de arriba (a pedido explícito del
usuario: "absolutamente TODO el código", no una muestra). Se revisó `backend/src` completo
(incluye los 2 archivos de schema que faltaban, `schema_etapa2h.sql` y `schema_etapa2i.sql`),
y se delegó la revisión exhaustiva de `panel/src` y `sitio-web/src`. Hallazgos y cierres
(2026-07-09):

- **RLS de `asistentes` sin restricción por columna para Coordinador** (crítico):
  `schema_etapa2i.sql` le da a Coordinador `UPDATE` sobre los Asistentes de su zona a nivel de
  fila, pero Postgres RLS es row-level, no column-level — nada impedía que un Coordinador
  editara `sueldo_basico`, `valor_hora`, `causal_baja`, vencimientos, etc. desde una llamada
  directa a la API de Supabase (el frontend, `PerfilTab.jsx`, ya ocultaba esos campos, pero
  eso es UI, no seguridad). Cerrado con `backend/src/db/schema_etapa2j.sql` (nuevo, aplicado
  y verificado contra Supabase real): trigger `BEFORE UPDATE` que rechaza el UPDATE si
  un Coordinador intenta tocar cualquiera de las columnas laborales sensibles (regla 8 de
  `CLAUDE.md`).
- **Label "Email" hardcodeado** en `panel/src/pages/UsuariosPanel.jsx` (regla 1) — corregido a
  `t.usuarios_panel.col_email` (clave nueva en es-AR/en/pt-BR).
- **Botón "Borrar" de Zonas sin `disabled` durante la operación** en
  `panel/src/pages/Configuracion.jsx` (regla 5) — corregido.
- **Glosario**: 14 ocurrencias de "Caregiver" sobrevivían en el locale `en` de
  `panel/src/i18n/translations.js` (pt-BR ya estaba limpio); 7 ocurrencias de
  "caregiver"/"cuidador" en `en`/`pt-BR` de `sitio-web/src/i18n/translations.js` (es-AR ya
  estaba limpio) — corregidas a "Integral Assistant" / "Assistente Integral". Verificado con
  grep, cero ocurrencias remanentes.
- **Service worker del sitio público nunca instalaba**: `sitio-web/src/middleware.js`
  redirigía `/offline.html` a `/es-AR/offline.html` (404), y `public/sw.js` hace
  `cache.addAll()` de esa URL en el evento `install` — cualquier fallo en `addAll` aborta la
  instalación completa del SW. Se agregó `sw.js` y `offline.html` al matcher de exclusión del
  middleware.
- **CSS muerto**: bloque `.filtro-timeline`/`.filtro-etapa`/etc. en
  `sitio-web/src/styles/components.css`, remanente de cuando se sacó "El Filtro prestadora-original" del
  sitio público (sesión anterior) — eliminado, confirmado por grep que ningún componente lo
  usaba.
- **Tabla `aspirantes` muerta** (hallazgo arquitectónico): `docs/DATA_MODEL.md` documentaba el
  flujo `postulaciones → aspirantes → asistentes`, pero ningún endpoint del backend leía ni
  escribía `aspirantes` — el flujo real siempre fue directo
  (`POST /api/panel/cuentas/asistente` crea el Asistente desde la `postulacion_id`, sin paso
  intermedio). Se eliminó la tabla (y la columna `asistentes.aspirante_id`) en
  `backend/src/db/schema_etapa2k.sql` (nuevo, aplicado y verificado contra Supabase real —
  incluyó redefinir la vista `asistentes_coordinador`, que seleccionaba `aspirante_id`
  explícitamente y no dejaba dropear la columna sin antes hacer `DROP VIEW` +
  `CREATE VIEW`), y se corrigió `docs/DATA_MODEL.md`/`docs/SECURITY.md` para documentar el
  flujo real en vez del flujo nunca implementado.
- **Notificaciones de vencimiento no implementadas** (hallazgo arquitectónico):
  `docs/PRD_02B_Gestion_Personal.md` función 9 ("Notificaciones de vencimientos: monotributo,
  ART, seguro") estaba documentada pero `configuracion_notificaciones` solo tenía 2 de los
  eventos esperados, y no existía ningún cron/scheduler en el backend pese a que
  `asistentes.vencimiento_monotributo/vencimiento_art/vencimiento_seguro` existen desde
  Etapa 2B. Se implementó `backend/src/utils/vencimientos.js` (revisa diariamente, vía
  `setInterval` en `server.js` + corrida al arrancar, sin agregar dependencia nueva de cron)
  Asistentes activos con alguno de los 3 vencimientos ya vencido o dentro de 30 días, y avisa
  por `enviarEmailCoordinador` con un evento por tipo. Se agregó
  `backend/src/db/schema_etapa2l.sql` (nuevo, aplicado y verificado contra Supabase real)
  para sembrar los 3 eventos nuevos en `configuracion_notificaciones`, con sus labels en las 3
  locales del Panel. Deliberadamente sin deduplicación de avisos ya enviados (se re-avisa en
  cada corrida diaria mientras el vencimiento siga en la ventana) — el PRD no pide lo
  contrario y una tabla de "ya avisado" hubiera sido una abstracción no pedida.
- **Nuevo documento agregado por el usuario**: `docs/prestadora-original_PRD_Reclutamiento_v1.pdf` — PRD
  mucho más rico para el proceso de Reclutamiento (6 etapas en vez de 5, formulario con
  DNI/CUIL/foto con detección facial/experiencia clínica detallada/Maps, panel con mapa
  geolocalizado, capacitación con examen de 20 preguntas y certificado QR, infra nueva:
  Twilio SMS, Resend/SendGrid). Usa terminología que viola el glosario ("Cuidadora" en vez de
  "Asistente Integral") y menciona nombres reales (mismo tipo de conflicto ya documentado para
  `Prompt de Money Suite.md` en `CLAUDE.md`). Decisión del usuario: adoptar su contenido más
  adelante corrigiendo la terminología, en una sesión dedicada de rediseño de Etapa 3 — no
  ahora. **No se tocó ningún PRD ni se implementó nada de este documento en esta sesión.**

`schema_etapa2j.sql`, `schema_etapa2k.sql` y `schema_etapa2l.sql` se aplicaron y verificaron
contra Supabase real en esta misma sesión (conexión directa vía cadena de conexión Postgres,
no vía SQL Editor manual — script de una sola vez, borrado después de usarse).

**Verificado**: `npm run build` de `panel/` y `sitio-web/` sin errores; `npx vitest run`
18/18 en `panel/`; las 3 migraciones nuevas corrieron sin error contra la base real.

## Problemas conocidos / deuda técnica

_Registrar acá bugs conocidos o deuda técnica para la próxima sesión._

- **Zona de `solicitudes`/`familias`/`pacientes`/`prestaciones` no filtrada por Coordinador**
  (ver `docs/SECURITY.md`, sección RLS) — no hay columna de zona real en estas tablas
  (`solicitudes.localidad` es texto libre). Pendiente de una decisión de producto sobre cómo
  derivar la zona antes de poder escribir la policy.
- **"Vista mapa" (Postulaciones) y "Asignar Asistente" (Solicitudes)** — ver detalle arriba,
  ambos son requisitos reales de `PRD_02_Panel_Admin.md` no construidos en este corte,
  requieren infraestructura/decisiones de modelo de datos que no corresponde tomar sin el
  usuario.

- Las 15 filas seed de `escalas_legales` en `schema_etapa2b.sql` están marcadas
  explícitamente `'PLACEHOLDER — validar con abogado laboralista'` — son valores de ejemplo
  para poder testear `calcularCese`/`calcularScoreRiesgo`, no valores legales reales.
  **No usar en producción sin revisión de un abogado laboralista.**
- Del PRD_02B quedan deliberadamente afuera de este corte (no bloquean el resto): el
  generador de documentación (PDF de liquidación de cese, función 7 de 9 del PRD).
- El diseño visual/formato del certificado (PDF descargable con membrete, etc.) no está
  definido en ningún PRD — el corte actual solo genera el QR como imagen PNG descargable,
  sin un layout de certificado imprimible. Queda para cuando haya spec de diseño.
- ~~`docs/prestadora-original_PRD_Reclutamiento_v1.pdf`: adoptar su contenido en `PRD_03_Reclutamiento.md`~~
  **Resuelto (2026-07-09)**: se comparó sección por sección contra `PRD_03_Reclutamiento.md`
  existente. La mayoría del contenido ya estaba condensado y corregido de una pasada
  anterior; faltaba solamente la sección de landing page pública (perfiles buscados,
  beneficios, zonas) y quedaba sin corregir un uso de "Cuidadora Domiciliaria" en el catálogo
  de especialidades de la Sección C del formulario. Ambos corregidos directamente en
  `PRD_03_Reclutamiento.md` — ver su nota de cabecera para el detalle completo de las 5
  correcciones aplicadas. Sección 8 del original ("prestadora-original vs. CUIDARLOS") y alianza
  institucional con terceros quedan fuera de alcance (decisión de negocio/marketing).
- **TAREA ASIGNADA AL USUARIO — "El Filtro prestadora-original" usado como si fuera público en
  `docs/prestadora-original_Fundacional_v3.pdf`** (detectado 2026-07-09): el PDF lo propone como ejemplo
  de post de Instagram (sección 5.3), lo cual contradice la corrección ya aplicada en
  `CLAUDE.md` el 2026-07-08. Aclaración (no es un cambio de nombre, son dos términos que
  conviven según el contexto — ver glosario en `CLAUDE.md`): "El Filtro prestadora-original" sigue siendo
  el nombre correcto para la referencia interna general al concepto (nunca público); dentro
  del Panel, esa misma pantalla se llama "Proceso de Incorporación de Asistentes" (no "Filtro
  prestadora-original" ahí). En el HTML (`prestadora-original_Manual_Identidad_v1.html`) ya se corrigió la tabla de
  terminología para reflejar ambos términos correctamente. **El usuario se encarga
  personalmente de** corregir el ejemplo de post de Instagram en
  `docs/prestadora-original_Fundacional_v3.pdf` (no editable por Claude) para que no proponga "Filtro
  prestadora-original" como contenido público.
- **TAREA ASIGNADA AL USUARIO — conflicto de tipografía entre `prestadora-original_Fundacional_v3.pdf` y
  `prestadora-original_Manual_Identidad_v1.html`** (detectado 2026-07-09): el PDF (pág. 2) dice
  "Tipografía: Arial"; el HTML y `docs/DESIGN_SYSTEM.md` (ya implementado en panel/sitio-web)
  usan Playfair Display + DM Sans. Se definió que **el HTML tiene preeminencia sobre el PDF**
  en todo lo referido a identidad de marca — el PDF quedó desactualizado en ese punto. El
  usuario se encarga de corregir la tabla de tipografía en `docs/prestadora-original_Fundacional_v3.pdf`
  (no editable por Claude) para que no quede como fuente contradictoria en futuras sesiones.

## Archivos creados/modificados por sesión

_Una entrada por sesión de trabajo, más reciente primero._

| Fecha | Sesión | Archivos |
|---|---|---|
| 2026-07-09 | Auditoría exhaustiva de TODO el código (backend + panel + sitio-web, archivo por archivo) y cierre de los 8 hallazgos encontrados (RLS por columna en `asistentes`, label hardcodeado, botón sin disabled, glosario en panel y sitio-web, service worker roto, CSS muerto, tabla `aspirantes` muerta, notificaciones de vencimiento faltantes), con las 3 migraciones nuevas aplicadas y verificadas contra Supabase real, + nota sobre `prestadora-original_PRD_Reclutamiento_v1.pdf` (input para una futura Etapa 3, no implementado ahora) | `backend/src/db/schema_etapa2j.sql` (nuevo, aplicado — trigger RLS columnas laborales), `schema_etapa2k.sql` (nuevo, aplicado — DROP TABLE aspirantes + redefinición de vista `asistentes_coordinador`), `schema_etapa2l.sql` (nuevo, aplicado — seed 3 eventos de vencimiento); `backend/src/utils/vencimientos.js` (nuevo); `backend/src/server.js` (revisión diaria de vencimientos); `panel/src/pages/UsuariosPanel.jsx`, `panel/src/pages/Configuracion.jsx`, `panel/src/i18n/translations.js` (glosario en + labels de vencimiento en es-AR/en/pt-BR); `sitio-web/src/middleware.js`, `sitio-web/src/i18n/translations.js` (glosario en/pt-BR), `sitio-web/src/styles/components.css` (CSS muerto); `docs/DATA_MODEL.md`, `docs/SECURITY.md` (flujo real sin `aspirantes`); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-08 | Cierre iterativo de hallazgos médios/menores de la auditoría de Etapa 2 (RLS por zona, códigos estables de postulación, rutas admin-only, estados faltantes, botones sin disabled, wa.me, tab de Ausencias para Coordinador, fix de índice posicional en formulario público, fix de fixture de test, i18n huérfano) | `backend/src/db/schema_etapa2i.sql` (nuevo, aplicado y verificado contra Supabase real — vista `asistentes_coordinador` + RLS de zona en 6 tablas); `backend/src/db/schema_etapa2d.sql` (comentario, glosario); `panel/src/lib/{telefono,postulacionCodigos,roles}.js`, `panel/src/index.css`, `panel/index.html`, `panel/src/i18n/translations.js`, `panel/src/pages/{Postulaciones,PostulacionDetalle,SolicitudDetalle,Solicitudes}.jsx`, `panel/src/pages/familias/{FamiliaDetalle,PrestacionesPaciente}.jsx`, `panel/src/pages/asistentes/{AsistenteDetalle,SimuladorVinculoTab,AusenciasCoberturaTab}.jsx`, `panel/src/pages/Configuracion.jsx`, `panel/src/components/layout/ProtectedRoute.jsx`, `panel/src/App.jsx`, `panel/src/lib/__tests__/calcularCese.test.js` (fixture); `sitio-web/src/i18n/translations.js` (campo `codigo` en `servicios.items`), `sitio-web/src/app/[locale]/trabaja-con-nosotros/TrabajaConNosotrosForm.jsx` (códigos estables), `sitio-web/src/app/[locale]/solicita-servicio/SolicitaServicioForm.jsx` (fix índice posicional); `docs/SECURITY.md` (estado real de RLS de zona); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-08 | Módulo 8 completo (Configuración: empresa, zonas de cobertura, notificaciones) + sitio público conectado al dato real | `backend/src/db/schema_etapa2h.sql` (nuevo, aplicado y verificado contra Supabase real); `backend/src/routes/{panelConfiguracion,configuracionPublica}.js` (nuevos); `backend/src/utils/email.js` (destinatarios por evento); `backend/src/routes/{postulacionAsistente,solicitudServicio}.js` (pasan `evento`); `backend/src/server.js` (2 rutas montadas); `panel/src/pages/Configuracion.jsx` (nuevo); `panel/src/App.jsx` (ruta `/configuracion`); `panel/src/components/layout/Layout.jsx` (link de nav); `panel/src/i18n/translations.js` (bloque `configuracion` + `nav.configuracion` + `comun.borrar` en es-AR/en/pt-BR); `sitio-web/src/lib/configuracionPublica.js` (nuevo); `sitio-web/src/app/[locale]/layout.jsx`, `sitio-web/src/app/[locale]/contacto/page.jsx`, `sitio-web/src/app/[locale]/trabaja-con-nosotros/{page,TrabajaConNosotrosForm}.jsx`, `sitio-web/src/components/WhatsAppButton.jsx` (consumen el endpoint público en vez de `siteConfig.js`) |
| 2026-07-08 | Auditoría completa de Etapas 1 y 2 contra sus PRD (a pedido explícito del dueño del proyecto antes de arrancar Etapa 3) y cierre de las 3 brechas encontradas: (1) textos hardcodeados en el formulario de postulación de Asistentes, (2) rol Superadmin implementado de punta a punta (antes solo documentado), (3) creación de 4 cuentas de prueba con un rol cada una (Superadmin, Admin, Familia="Alberto", Asistente="Beto"), todas con la misma contraseña. También se sacó "El Filtro prestadora-original" del sitio público (nav, home, página `/el-filtro`) y se simplificó la copy de zona de cobertura del hero a "AMBA" | `sitio-web/src/config/siteConfig.js`, `sitio-web/src/i18n/translations.js`, `sitio-web/src/app/[locale]/trabaja-con-nosotros/TrabajaConNosotrosForm.jsx` (fix i18n); `backend/src/db/schema_etapa2g.sql` (nuevo, aplicado contra Supabase real — agrega `superadmin` al CHECK de `usuarios.rol` y a todas las policies RLS que exigían `admin`); `backend/src/middleware/requiereRolPanel.js`, `backend/src/routes/panelUsuarios.js` (Superadmin gestiona cuentas de Admin/Superadmin, Admin sigue limitado a Coordinador); `panel/src/lib/roles.js` (nuevo, helper `esAdminOSuperior`); `panel/src/components/layout/{Layout,ProtectedRoute}.jsx`, `panel/src/pages/{ListaPrecios,PostulacionDetalle,SolicitudDetalle,UsuariosPanel,asistentes/AsistenteDetalle,asistentes/PerfilTab}.jsx`, `panel/src/i18n/translations.js` (claves `rol_superadmin`, `nuevo_usuario`, `campo_rol` en es-AR/en/pt-BR) |
| 2026-07-08 | Aplicar SQL contra Supabase real y deploy del Panel a producción | `backend/src/db/{schema_etapa2e,schema_etapa2f}.sql` (aplicados y verificados contra Supabase real); `panel/vercel.json` (nuevo, rewrite SPA); `panel/.gitignore` (excluye `.vercel`) |
| 2026-07-08 | Afinado final de Etapa 2: usuarios del Panel, métricas de Dashboard, Proceso de Incorporación, Certificado prestadora-original | `CLAUDE.md` (glosario actualizado); `backend/src/db/{schema_etapa2e,schema_etapa2f}.sql` (nuevos, no aplicados aún); `backend/src/routes/panelUsuarios.js` (nuevo); `backend/src/routes/panelCuentas.js` (endpoint `/asistente`); `backend/src/utils/cuentasPanel.js` (`zonas` opcional); `backend/src/server.js` (ruta montada); `panel/src/pages/UsuariosPanel.jsx` (nuevo); `panel/src/pages/Dashboard.jsx` (2 métricas nuevas); `panel/src/pages/PostulacionDetalle.jsx` (botón iniciar incorporación); `panel/src/pages/asistentes/{VerificacionTab,CertificadoTab}.jsx` (nuevos); `panel/src/pages/asistentes/AsistenteDetalle.jsx` (2 tabs nuevas); `panel/src/App.jsx` (ruta `/usuarios-panel`); `panel/src/components/layout/Layout.jsx` (link de nav); `panel/src/index.css` (clase `.panel-card-verificacion`); `panel/src/i18n/translations.js` (claves nuevas en es-AR/en/pt-BR); `panel/package.json` (agregado `qrcode`); `panel/.env`/`.env.example` (`VITE_SITE_URL`) |
| 2026-07-08 | Primer esquema de Precios y Prestaciones particulares por Paciente | `backend/src/db/schema_etapa2d.sql` (nuevo, aplicado y verificado); `panel/src/pages/ListaPrecios.jsx` + `ListaPrecioDetalle.jsx` (nuevos); `panel/src/pages/familias/PrestacionesPaciente.jsx` (nuevo); `panel/src/pages/familias/FamiliaDetalle.jsx` (botón "Prestaciones" por Paciente); `panel/src/App.jsx` (ruta `/lista-precios`); `panel/src/components/layout/Layout.jsx` (link de nav); `panel/src/i18n/translations.js` (bloques `lista_precios` y `prestaciones` + `nav.lista_precios`/`comun.editar` en es-AR/en/pt-BR) |
| 2026-07-08 | Módulo 5 completo: pantalla de Familias y Pacientes | `panel/src/pages/Familias.jsx` (nuevo); `panel/src/pages/familias/FamiliaDetalle.jsx` (nuevo); `panel/src/App.jsx` (rutas `/familias` y `/familias/:id`); `panel/src/components/layout/Layout.jsx` (link de nav); `panel/src/i18n/translations.js` (bloque `familias` + `nav.familias` en es-AR/en/pt-BR) |
| 2026-07-08 | Mecanismo de creación de cuentas (compartido) + inicio Módulo 5 (Familias) | `backend/src/db/schema_etapa2c.sql` (nuevo, aplicado y verificado); `backend/src/utils/cuentasPanel.js` (nuevo); `backend/src/routes/panelCuentas.js` (nuevo); `backend/src/server.js` (ruta montada); `panel/src/pages/SolicitudDetalle.jsx` (botón "Convertir en Familia"); `panel/src/i18n/translations.js` (4 claves nuevas en es-AR/en/pt-BR) |
| 2026-07-08 | Módulo 4 del Panel (Plantel de Asistentes) + `PRD_02B_Gestion_Personal.md` completo | `backend/src/db/schema_etapa2b.sql` (nuevo, no aplicado aún); `panel/src/lib/{calcularCese,escalasLegales,scoreRiesgo}.js` (nuevos) + `panel/src/lib/__tests__/{calcularCese,scoreRiesgo}.test.js` (nuevos); `panel/src/hooks/useEscalasLegales.js` (nuevo); `panel/src/pages/Asistentes.jsx` (nuevo); `panel/src/pages/asistentes/{AsistenteDetalle,PerfilTab,VinculoCeseTab,SimuladorVinculoTab,ScoreRiesgoTab,AusenciasCoberturaTab}.jsx` (nuevos); `panel/src/App.jsx` (rutas `/asistentes` y `/asistentes/:id`); `panel/src/components/layout/Layout.jsx` (link de nav); `panel/src/index.css` (clases nuevas del Módulo 4, solo variables existentes); `panel/src/i18n/translations.js` (claves `nav.asistentes` + bloque `asistentes` completo en es-AR/en/pt-BR); `panel/package.json` (agregado `vitest`) |
| 2026-07-08 | Etapa 2: primer corte del Panel de Administración (Módulos 1-3) | `panel/` (app nueva completa: `package.json`, `index.html`, `src/{App,main,index.css}`, `src/styles/variables.css`, `src/components/ui/{Button,FormField,Alert}.jsx`, `src/lib/supabaseClient.js`, `src/i18n/{translations,LocaleContext}.jsx`, `src/context/AuthContext.jsx`, `src/hooks/useSupabaseTable.js`, `src/components/layout/{Layout,ProtectedRoute,EstadoLista}.jsx`, `src/pages/{Login,Dashboard,Postulaciones,PostulacionDetalle,Solicitudes,SolicitudDetalle}.jsx`, `.env.example`, `.gitignore`); `backend/src/db/schema_etapa2.sql` (nuevo), `backend/src/middleware/requiereRolPanel.js` (nuevo), `backend/src/routes/panelNotificaciones.js` (nuevo), `backend/src/utils/email.js` (agregado `enviarEmail`), `backend/src/server.js` (rutas del panel montadas) |
| 2026-07-08 | Migración de Etapa 1 de Vite a Next.js 15 (App Router) | `sitio-web/package.json`, `sitio-web/next.config.mjs` (nuevos), `sitio-web/src/middleware.js`, `sitio-web/src/lib/i18n.js` (nuevos), `sitio-web/src/app/[locale]/{layout.jsx,page.jsx,servicios,el-filtro,solicita-servicio,trabaja-con-nosotros,contacto,privacidad,terminos}/*`, `sitio-web/src/app/manifest.js` (nuevos), `sitio-web/src/components/{Header,Footer,WhatsAppButton,LanguageSelector}.jsx` (reescritos como server/client components de Next.js), `sitio-web/src/hooks/useFormSubmit.js` (env var `NEXT_PUBLIC_API_URL`), `sitio-web/src/styles/global.css` (ajuste `#root`→`body`), `sitio-web/.env.example`, `sitio-web/.gitignore` (`.next`); eliminados: `sitio-web/index.html`, `sitio-web/vite.config.js`, `sitio-web/src/App.jsx`, `sitio-web/src/main.jsx`, `sitio-web/src/i18n/LocaleContext.jsx`, `sitio-web/src/pages/*` (8 archivos); actualizado `docs/CONTEXT.md` |
| 2026-07-07 | Etapa 1: sitio web público completo (primera pasada) | `sitio-web/src/pages/*` (8 páginas), `sitio-web/src/components/*` (Header, Footer, WhatsAppButton, LanguageSelector, ui/{Button,FormField,Alert}), `sitio-web/src/i18n/LocaleContext.jsx`, `sitio-web/src/config/siteConfig.js`, `sitio-web/src/hooks/useFormSubmit.js`, `sitio-web/vite.config.js` (PWA), `sitio-web/index.html` (fuentes + meta), `sitio-web/src/styles/{global,components}.css` (reescritos), `backend/src/routes/{solicitudServicio,postulacionAsistente}.js`, `backend/src/db/{connection,schema}.sql`, `backend/src/utils/email.js`, `backend/src/server.js` (rutas conectadas) |
| 2026-07-07 | Etapa 0: setup inicial de repo y estructura | `CLAUDE.md` (movido a raíz), `.gitignore`, `README.md`, `docs/COMPETIDORES_PRESTACIONES.md`, `sitio-web/` (scaffold Vite+React+Router, `src/styles/{variables,global,components}.css`, `src/i18n/translations.js`, `.env.example`), `backend/` (scaffold Express, `src/server.js`, `.env.example`, `.gitignore`) |
| 2026-07-07 | Generación de documentación técnica en `Workspace/docs/` (sin código todavía) | `CLAUDE.md`, `CONTEXT.md`, `DESIGN_SYSTEM.md`, `DATA_MODEL.md`, `AI_PROMPTS.md`, `SECURITY.md`, `PRD_01_Sitio_Web.md`, `PRD_02_Panel_Admin.md`, `PRD_02B_Gestion_Personal.md`, `PRD_03_Reclutamiento.md`, `PRD_04_05_App_Servicio.md`, `BUILD_ORDER.md`, `PROGRESS.md` |
