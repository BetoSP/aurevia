# PROGRESS.md — Estado real del proyecto

> Se actualiza al final de cada sesión de trabajo (paso 8 del protocolo de `CLAUDE.md`).
> Este archivo refleja el estado real del código, no el estado deseado — si algo no está
> hecho, dice 🔴 No iniciado, aunque haya PRD escrito para eso.

## Estado por etapa

| Etapa | Descripción | Estado |
|---|---|---|
| 0 | Setup: repo, estructura, variables de entorno | 🟢 Completo |
| 1 | Sitio web público (páginas + formularios + backend) | 🟡 En progreso |
| 2 | Panel de administración (Módulos 1-5 + primer corte de precios/Prestaciones + gestión de usuarios del Panel + Proceso de Incorporación + Certificado de Aptitud + rol Superadmin real + Módulo 8 Configuración) | 🟢 Desplegado a producción (2026-07-08): https://aurevia-panel.vercel.app — Módulo 6 Parte 1 (Guardias core) construida 2026-07-10, desplegada y probada en navegador real 2026-07-11 (ver pendiente #6 en `PENDIENTES.md`); Módulo 6 Parte 2 (Continuidad de guardia) construida y probada en navegador real (ver fila 2026-07-12 de la tabla en `docs/PROGRESS.md`, sección "Archivos creados/modificados por sesión"), **todavía no commiteada ni desplegada a Vercel**; Módulo 6 Parte 3 y Módulo 7 pendientes |
| 2B | Gestión de Personal (vínculo/cese/riesgo/cobertura) | 🟢 Completo — código listo y SQL aplicado/verificado contra Supabase real |
| 3 | PWA Asistentes (login, guardias, GPS, reporte + IA) | 🟡 En progreso — primer corte construido, verificado en navegador real y **desplegado a producción** (`https://pwa-asistentes.vercel.app`, backend real de Railway); push notifications, alertas tempranas de ausencia y WebAuthn quedaron fuera de este primer corte a pedido del Desarrollador |
| 4 | PWA Familias (login, reportes, alertas) | 🟢 Desplegado a producción (2026-07-21): `https://pwa-familias.vercel.app`, backend real de Railway (`https://aurevia-backend-production-e7ee.up.railway.app`) — verificado en navegador real contra producción tras el deploy, no solo en local |
| 5 | Informe para Obra Social (informe virtual con validación y snapshot inmutable, sin PDF — ver `docs/claude_history.md` 2026-07-21) | 🟢 Completo — construido y verificado en navegador contra datos de Prestadora Demo (commit `cffc198`, 2026-07-21): schema `backend/src/db/schema_informes_obra_social.sql` aplicado contra Supabase real, `backend/src/routes/panelInformesObraSocial.js`, `panel/src/pages/InformesObraSocial.jsx`. Pendiente de confirmar deploy explícito a Vercel/Railway tras este commit (ver nota de despliegue más abajo) |
| 6 | Escaneo de Asistente con QR desde la PWA Familias (rediseñada 2026-07-22, ver `docs/claude_history.md` — ya no es una página pública sin login) | 🟢 Completo — construida y verificada end-to-end 2026-07-22 (script de regresión contra Supabase real + Playwright), pendiente #73 en `docs/PENDIENTES.md` 🟢 Resuelto |

Convención: 🔴 No iniciado · 🟡 En progreso · 🟢 Completo y en producción.

## Última tarea completada

**2026-07-23: Pendiente #75 — flujo de "primera contraseña" (activación de cuenta por
email) para Familia/Asistente/Círculo de cuidado, construido y verificado en navegador
real contra Prestadora Demo, pendiente de commit/push/deploy.** Mecanismo elegido por el
Desarrollador: token propio (no `admin.inviteUserByEmail` de Supabase) + email por el SMTP
ya existente (`backend/src/utils/email.js`). Nuevo: tabla `tokens_activacion_cuenta` (RLS
sin policies — solo accesible con la service role key del backend), `backend/src/utils/
activacionCuenta.js` (genera token de 7 días + email multi-idioma), endpoint público
`POST /api/activar-cuenta` (`backend/src/routes/activarCuenta.js`), integrado en
`crearCuentaConPerfil` (`backend/src/utils/cuentasPanel.js`) para las 3 rutas que crean
Familia/Asistente/Círculo — si el envío del email falla, la cuenta ya creada no se revierte
(queda recuperable con "Reenviar invitación"), endpoint y botón "Reenviar invitación" en el
Panel (`panel/src/pages/familias/FamiliaDetalle.jsx`, `panel/src/pages/asistentes/
PerfilTab.jsx`, solo visible para Admin), pantalla `ActivarCuenta.jsx` nueva en
`pwa-familias` y `pwa-asistentes` (ruta pública `/activar-cuenta`, i18n ×3, 4 estados).
**Verificado con Playwright contra Prestadora Demo real** (cuenta de prueba creada vía el
código real de `crearCuentaConPerfil`, luego eliminada de Supabase Auth + `usuarios` +
`tokens_activacion_cuenta` al cerrar la verificación): activación exitosa con contraseña
nueva → pantalla de éxito con link a `/login`; token reutilizado, token inexistente y sin
token en la URL → los 3 casos muestran correctamente el mensaje de link inválido/vencido.
0 errores de consola nuevos. `npm run build`/`npm run lint` limpios en las 3 apps. **No se
pudo verificar el envío real de email por SMTP en este entorno** (sandbox de desarrollo sin
salida de red hacia Gmail SMTP, `ECONNREFUSED`) — el token se inserta en la base *antes* del
envío del email dentro de `invitarActivacionCuenta`, así que ese fallo no impidió probar la
pantalla de activación, pero la entrega real del email queda sin confirmar hasta producción.
Falta: sumar `PWA_FAMILIAS_URL`/`PWA_ASISTENTES_URL` a las variables de entorno de Railway
(backend de producción, hoy solo están en el `.env` local) antes del deploy, y commit + push
+ deploy explícito — pendiente de permiso del Desarrollador.

**2026-07-23: Verificación retroactiva de las Fases 1 y 2 del plan de rediseño de frontend
(`C:\Users\Usuario\.claude\plans\distributed-scribbling-wirth.md`) — ya estaban completas,
sin haber quedado registradas como tales en este documento.** El Desarrollador pidió
confirmar contra el código real, no solo contra la documentación (principio "Estado real
por encima del documentado", `CLAUDE.md` §12). Verificado con lectura directa de código:
Fase 1 (diccionario de traducción de valores / capa anti-crudo) — `window.prompt()` ya no
existe en `InformesObraSocial.jsx` (usa `confirmarDestructivo`, `panel/src/pages/
InformesObraSocial.jsx:277`); el `JSON.stringify` crudo de `VinculoCeseTab.jsx` ya no
existe (reemplazado por `humanizarClave`/`formatearValorCalculo`, `panel/src/pages/
asistentes/VinculoCeseTab.jsx:20-29,197-198`). Fase 2 (selectores táctiles con respaldo
clínico del Reporte Diario) — signos vitales con color por rango normal/alerta y escala de
ánimo con caritas (Wong-Baker) ya construidos en `pwa-asistentes/src/pages/
ReporteDiario.jsx:34-39,246-266,270-286`. No se identificó en qué sesión/commit se hizo
este trabajo (posiblemente disuelto dentro de otras fases sin registrarse con este nombre);
no requiere código nuevo, solo esta corrección de registro. Con esto, de las 12 fases del
plan no queda ninguna sin empezar — lo único abierto es la vuelta de Guardias de la Fase 12
(pendiente #83) y los pendientes sueltos ya registrados aparte (#75, #76, #77, #56). Sin
archivos de código modificados en esta entrada.

**2026-07-24: Fase 12 del plan de rediseño de frontend — Maquetación general del Panel,
primer corte (Dashboard + Asistentes + Familias), construida y verificada en navegador
real.** Alcance acordado explícitamente con el Desarrollador antes de programar (dos
preguntas resueltas con `AskUserQuestion`, sin adivinar): este corte cubre solo
Dashboard/Asistentes/Familias — Guardias (`GuardiasGrid.jsx`) queda pendiente para una
vuelta futura, registrado como pendiente #83 en `docs/PENDIENTES.md`; el formato elegido
por el Desarrollador para los listados fue tarjeta por fila, no la opción de menor riesgo
recomendada (mantener la tabla y mejorar solo el contenedor). `Dashboard.jsx` agrupa las
métricas sueltas en dos secciones con encabezado título+subtítulo ("Actividad de esta
semana", "Alertas y continuidad"). `Asistentes.jsx` y `Familias.jsx` pasan de
`<table className="panel-tabla">` a una grilla de tarjetas (clases nuevas `lista-tarjetas`/
`lista-tarjeta` en `index.css`), sin tocar la paleta ni la tipografía de
`DESIGN_SYSTEM.md`. Verificado en navegador real (Playwright) contra Prestadora Demo en
local (38 Asistentes, 17 Familias reales de prueba) y los 3 locales del Dashboard
(es-AR/en/pt-BR). `npm run build` y `npm run lint` (oxlint) del Panel limpios, sin
warnings nuevos. Commiteado (`9dc47ae`), pusheado a `origin/main` y desplegado a
producción (`https://aurevia-panel.vercel.app`, deploy `dpl_8MC4cTaT98ppT4Y5cYNxs4UL5C2v`),
verificado en navegador real contra producción tras el deploy. Pendiente #83 registrado
🟡 Resuelto para el corte acordado — falta decidir cuándo se hace la vuelta de Guardias.

**2026-07-23: Fase 11 del plan de rediseño de frontend — WhatsApp reforzado para alertas
críticas, construida, verificada end-to-end en producción real, commiteada, pusheada y
desplegada.** Configurabilidad por Prestadora de a quién avisar además del Coordinador
(`configuracion_notificaciones.notificar_familia`, apagado por defecto — CLAUDE.md §2,
"configuración sobre programación"): la Familia recibe push + WhatsApp simultáneos solo si
la Prestadora lo activa para el evento "Ausente sin relevo previo"; los avisos de rutina a
la Asistente siguen solo por push, con WhatsApp de respaldo únicamente si el push falla.
Migración `schema_whatsapp_familia_asistente_01.sql` también sembró filas de configuración
que faltaban para las prestadoras reales (`alerta_temprana_guardia`/
`incidente_relevo_sin_resolver` estaban sin fila, es decir apagados de hecho aunque el
código ya los soportaba). Verificado en navegador real (Playwright) contra el Panel y
Supabase de producción: columna y checkbox nuevos confirmados en los 3 locales
(es-AR/en/pt-BR), guardado real de `notificar_familia=true` contra la base en vivo
confirmado por API y revertido a `false` al cerrar para no dejar un toggle activado sobre
datos de prueba. `npm run build` del panel limpio. Ver pendiente #82 en
`docs/PENDIENTES.md` — incluye una aclaración honesta: el plan mencionaba también una
columna `notificar_asistente` que se descartó durante la implementación por no tener
consumidor concreto todavía, recorte que no se había comunicado como mensaje aparte antes
de esta entrada.

**2026-07-23: Fase 9 del plan de rediseño de frontend — Offline-first en PWA Asistentes,
construida y verificada end-to-end en navegador real.** Cola local en IndexedDB
(`pwa-asistentes/src/lib/colaOffline.js`, escrita a mano, sin librería nueva) con reintento
automático al volver la señal vía evento `online`/`visibilitychange`
(`pwa-asistentes/src/lib/sincronizarCola.js`, sin Background Sync API por no estar soportada
en Safari/iOS), disparado una sola vez desde `Layout.jsx`. Identificador `clienteUuid`
generado en el dispositivo antes de encolar, para evitar duplicados al sincronizar —
reutiliza el guard de idempotencia que ya existía en `backend/src/routes/appAsistentes.js`
(400 cuando `checkin_at`/`checkout_at` ya estaban seteados), sumándole el flag
`yaRegistrado: true` para que el cliente pueda distinguir "esto ya se había sincronizado
antes" de un error real. Estado visual explícito (ícono ⏳ + texto, nunca solo color) en
`GuardiaActiva.jsx`, `ReporteDiario.jsx` y el listado `MisGuardias.jsx`. Se agregó además un
botón "Completar a mano" en Reporte Diario para cuando no hay señal, porque "Analizar con
IA" necesita conexión y sin ese atajo el Asistente hubiera quedado sin forma de llegar a la
pantalla de confirmación estando offline — no estaba en el plan original, se identificó como
hueco de diseño durante la implementación. Verificado en navegador real (Playwright) contra
la Prestadora Demo, simulando corte de señal a nivel de `fetch`: check-in offline se encoló
y sincronizó solo al simular la reconexión (`checkin_at` confirmado por SQL directo);
Reporte Diario offline deshabilitó IA y foto (con texto explicativo), permitió completar a
mano, encoló la confirmación, mostró la insignia "pendiente de enviar" en `MisGuardias.jsx`
y esta desapareció sola al reconectar — confirmado por SQL que el reporte quedó insertado y
la guardia pasó a `estado='completada'` con `checkout_at` seteado. 0 errores de consola
nuevos. Ver pendiente #81 en `docs/PENDIENTES.md`. Pendiente: commit/push/deploy explícito.

**2026-07-23: Fase 8 del plan de rediseño de frontend — Onboarding diferenciado por rol,
verificación visual completa en la Organización Sandbox real, cerrando la limitación
registrada el 2026-07-22.** La contraseña de la cuenta `superadmin` (única vía de acceso a
Sandbox) estaba desactualizada — reseteada vía Admin API de Supabase y actualizada en
`No hacer commit/claves y contraseñas.txt`. Con Sandbox realmente vacía de Asistentes: el
checklist del Dashboard mostró "2/3 completados" (paso de Asistente pendiente con su CTA,
Familia y Equipo con badge "Completado", coincidiendo con los datos reales ya cargados en
Sandbox), y `/asistentes` mostró el estado vacío nuevo con el botón "Nuevo Asistente" en
vez del texto genérico. 0 errores de consola nuevos. Ver pendiente #80 en
`docs/PENDIENTES.md`, ahora 🟢 Resuelto.

**2026-07-22: Fase 8 del plan de rediseño de frontend — Onboarding diferenciado por rol
para Prestadora nueva, construida, verificada en navegador real, commiteada, pusheada y
desplegada.** Checklist de 3 pasos (Asistente → Familia → invitar equipo) en el Dashboard,
derivado en vivo sin tabla nueva; variante informativa sin CTA para Admin_plataforma en
modo tenant; estados vacíos con CTA único en Asistentes/Familias. Ver fila 2026-07-22 (Fase
8) de "Archivos creados/modificados por sesión" más abajo para el detalle completo. Commit
`b61df1b` en `origin/main`; Panel desplegado a `https://aurevia-panel.vercel.app`.

**2026-07-22: Fase 6 del plan de rediseño de frontend — Estado de Hospitalización y
causales de Cese de servicio, construida, verificada en navegador real contra Sandbox/Demo,
commiteada, pusheada y desplegada a producción** (ver fila 2026-07-22 de "Archivos
creados/modificados por sesión" más abajo y pendiente #78 de `docs/PENDIENTES.md` para el
detalle completo). Verificado en navegador: alta/cierre reversible de Hospitalización,
alerta de contingencia por convivencia (generación y resolución), y `TabAvisoCese` en
Configuración → Notificaciones — todo sin errores de consola; datos de prueba ya
eliminados de Supabase real. Commit `8b770ed` en `origin/main`; Panel desplegado a
`https://aurevia-panel.vercel.app`. Sin verificar en navegador: el disparo automático del
aviso de Cese tras vencer el plazo (cron ya construido, sin evidencia de ejecución real) —
queda anotado en pendiente #78.

**2026-07-22: Fase 4 del plan de rediseño de frontend — Accesibilidad base (WCAG 2.1/2.2
AA) completa** (contraste de la paleta oklch, targets táctiles ≥44×44px, alternativa de
teclado/botón al arrastre en Guardias, alt-text de íconos). Ver fila 2026-07-22 de
"Archivos creados/modificados por sesión" más abajo para el detalle completo. Verificado en
navegador real con Playwright contra Sandbox (Prestadora Demo), `npm run build` de las 3
apps limpio. Commit `eafe015` pusheado a `main`; deploy explícito a Vercel confirmado para
las 3 apps (`panel`, `pwa-asistentes`, `pwa-familias` — sus `index.css`/`variables.css`
también se tocaron en esta fase).

**2026-07-21 (posterior al cierre de Etapa 4 abajo), tres tandas de trabajo no reflejadas
antes en esta sección — corregido ahora tras detectar el desfasaje entre `git log` y este
archivo:**

1. Commit `cffc198`: fix de recursión infinita RLS entre `asistentes`/`guardias` (pendiente
   #71, 🟢 Resuelto — función `zonas_de_asistente()` `SECURITY DEFINER`, aplicada contra
   Supabase real) + cierre de la Fase 1 del rediseño de frontend (diccionario de traducción
   de valores, desglose legible de `calcularCese.js`, modal propio de anulación de informes
   de obra social) + **Etapa 5 completa** (Informe para Obra Social — ver fila de la tabla
   de arriba).
2. Commit `a35b090`: Fase 2 del rediseño de frontend (selectores táctiles de signos
   vitales con gate de autorización previa, selector de caras para ánimo en Reporte
   Diario — `pwa-asistentes/src/pages/ReporteDiario.jsx` y su espejo de lectura
   `pwa-familias/src/pages/ReporteDetalle.jsx`).
3. Commit `be8fd8f`: fix de bug reportado por el Desarrollador — al reasignar un cuidador a
   una guardia sin cobertura (`estado='ausente'`) desde `Guardias.jsx` (drag-and-drop) o
   desde el botón "Resolver" de `Continuidad.jsx`, la guardia no volvía a `estado
   ='programada'` y el incidente de relevo (`incidentes_relevo.resuelto_at`) quedaba abierto
   — las alarmas de escalada seguían disparando aunque ya hubiera cuidador asignado.
   Verificado con script descartable contra Sandbox antes de commitear.

Los tres commits están pusheados a `main` y desplegados: Panel/PWA Asistentes/PWA Familias
redeployados a Vercel, backend redeployado a Railway (auto-deploy confirmado por
`createdAt` del deployment activo posterior al push). Pendiente de verificación en
navegador real de los puntos 1 y 2 en producción (se verificaron contra datos de Prestadora
Demo en el momento de cada commit, no re-verificados post-deploy en esta sesión).

Etapa 4 (PWA Familias) — backend completo (middleware `requiereRolFamilia`, rutas
`appFamilias.js`, push generalizado, IA Nivel 2 de alertas `alertasIA.js` +
`revisarAlertasIA.js` con cron, migración `schema_pwa_familias_01.sql` aplicada contra
Supabase real) y frontend completo (7 pantallas: MisPacientes, PacienteDetalle, Reportes,
ReporteDetalle, Alertas, AsistenteAsignado, MiPerfil; i18n 3 locales completo). Verificado de
punta a punta con Playwright contra Supabase real, con una cuenta de prueba de Familia real
(ver `No hacer commit/claves y contraseñas.txt`) — las 7 pantallas, incluida la suscripción
Realtime del mapa en vivo, la calificación al Asistente (POST real, fila confirmada en
`calificaciones_asistente`) y el flujo de opt-in de notificaciones push hasta el punto del
permiso del navegador. Un bug real encontrado y corregido durante esta verificación: ver
fila 2026-07-21 de "Archivos creados/modificados por sesión" más abajo para el detalle
completo (bug de renderizado JSONB en `ReporteDetalle.jsx`, endpoint nuevo
`GET /pacientes/:id/asistente`).
Commit `2a30852` + push a `main` hecho. Backend redesplegado en Railway (auto-deploy,
`https://aurevia-backend-production-e7ee.up.railway.app`, confirmado con `npx railway status`
en vez de asumir una URL vieja — ver pendiente #66). Proyecto Vercel nuevo `pwa-familias`
creado y desplegado a producción (`https://pwa-familias.vercel.app`, con `vercel.json` de
rewrite SPA agregado desde el vamos para no repetir el bug del pendiente #68). Verificado en
navegador real contra la URL de producción real (no local): login con la cuenta de prueba de
Familia, redirect automático a PacienteDetalle, datos reales de Supabase renderizados
correctamente, 0 errores de consola. Con esto, Etapa 4 queda completa y en producción.
Próximo paso: continuar con Etapa 5 (Planillas IOMA), según la instrucción permanente del
Desarrollador de completar todas las etapas del roadmap.

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
errores. Primer usuario Admin real creado (`prestadora.demo@gmail.com`, credenciales en
`No hacer commit/claves y contraseñas.txt`).

Etapa 1 sigue 🟡 en progreso — completa y desplegada a producción (Railway + Vercel), solo
pendiente contenido real de imágenes/fotografía propia y dominio propio
(`prestadorademo.com.ar`, placeholder), que queda en el checklist de lanzamiento de
`PRD_01_Sitio_Web.md`.

## Decisiones tomadas durante el desarrollo

_Registrar acá cualquier decisión técnica tomada durante el desarrollo que no estaba en
ningún PRD original._

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-07-08 | Se agregó `vitest` como devDependency de `panel/` (no existía suite de tests en el panel hasta ahora) para poder testear `calcularCese`/`calcularScoreRiesgo` con fixtures fijas | El propio checklist de aceptación de `PRD_02B_Gestion_Personal.md` exige explícitamente que el motor de cálculo sea "función pura y testeada" dada su sensibilidad legal |
| 2026-07-08 | En `calcularIndemnizacionAntiguedad` (dentro de `calcularCese.js`), el piso mínimo (mejor remuneración × meses piso) se aplica **antes** que el tope indemnizatorio, no después — un test detectó que aplicarlo al revés permitía que el piso empujara el monto por encima del tope legal | Bug encontrado durante el desarrollo de los tests unitarios; corregido antes de tocar la UI para que la pestaña de Cese nunca muestre un monto que viola el tope legal |
| 2026-07-08 | La pestaña Vínculo y Cese, dentro del Módulo 4, y todo lo demás de `PRD_02B_Gestion_Personal.md` (Simulador, Score de Riesgo, Ausencias/Cobertura) quedan visibles solo para rol Admin — Coordinador solo ve la pestaña Perfil del Asistente | Coincide con la exclusión explícita de Coordinador de `escalas_legales`/`ceses`/datos laborales internos documentada en `SECURITY.md` |
| 2026-07-07 | Se incorporaron 4 patrones de UI/arquitectura de un análisis externo (brief de GlamourOS, ERP para salones de belleza — proyecto ajeno a la prestadora original, solo se tomaron ideas puntuales): (1) teléfono siempre como link `wa.me/` — `DESIGN_SYSTEM.md`; (2) listas largas agrupadas por categoría — `DESIGN_SYSTEM.md`; (3) checklist de onboarding con % de completitud para el nombre anterior, ya retirado, del proceso de verificación — `PRD_03_Reclutamiento.md`; (4) colores automáticos por estado de guardia — `DESIGN_SYSTEM.md` + `PRD_02_Panel_Admin.md` Módulo 6. También se registró como nota de arquitectura a futuro (no built) la idea de módulos activables por configuración — `PRD_02_Panel_Admin.md` Módulo 8. | Ninguna de estas ideas viene de un PRD original de la prestadora original — se documentan para que quede claro el origen y no se pierdan en la próxima sesión |
| 2026-07-07 | Se descartó explícitamente la gamificación de Asistentes (niveles/rankings/puntos) vista en el mismo análisis externo | Contradice la regla anti-subordinación de `CLAUDE.md` (riesgo legal art. 23 LCT / precedente Cabify) — dejar registrado para que no se reproponga sin resolver antes el riesgo legal |
| 2026-07-07 | Se agrega un quinto rol, `Superadmin`, con login propio y acceso técnico por encima de `Admin` (configuración profunda, alta/baja de elementos sensibles, uso de IA para diagnóstico/corrección de errores) — actualizado en `CONTEXT.md`, `SECURITY.md` y `CLAUDE.md` (raíz) | Decisión de negocio explícita del dueño del proyecto, no estaba en ningún PRD original |
| 2026-07-07 | Se registra como principio de negocio que el modelo debe operar con muy poca gente administrando, por lo que automatizar con IA todo lo que no comprometa el riesgo legal es deseable — puede llevar a re-priorizar algunos niveles de IA que `BUILD_ORDER.md` marca como "Diferida", a evaluar caso por caso cuando se llegue a esa etapa | Decisión de negocio explícita — condiciona el alcance de futuras etapas de IA |
| 2026-07-07 | Se agregó a `DESIGN_SYSTEM.md` un benchmark estético (no solo de prestaciones) de EnCasa, Cuidarlos, Medincare y Cuidando en Casa, con recomendaciones concretas para diferenciarse visualmente (fondos de color completo, fotografía propia con dirección de arte, micro-interacciones, iconografía propia) — se detectaron además dos competidores no presentes en el corpus de negocio original: `Cuidarnos` (UTEP/Movimiento Evita) y `Cuidando en Casa` | Pedido explícito del usuario: superar ampliamente a los competidores desde lo estético, no solo desde las prestaciones |
| 2026-07-07 | Se amplió el benchmark estético con 14 sitios adicionales que aportó el usuario (Ver Salud, Casamed Salud, Situ Care, Home Care BA, Continuum, Cuidarte Argentina, InDom, +Vida Salud, API Cuidados Domiciliarios, Amparando Salud, Cuidar Buenos Aires, más perfiles de Instagram de Go Home y CuidArteBien) y se detectó un vacío: ningún PRD original define identidad visual para Instagram — se agregó una sección nueva en `DESIGN_SYSTEM.md` al respecto | El usuario señaló explícitamente que Instagram no se había tenido en cuenta hasta ahora |
| 2026-07-07 | Limitación técnica declarada: las herramientas de investigación de esta sesión no pueden evaluar Instagram con el mismo nivel de detalle que un sitio web (contenido JS-renderizado, sin acceso a grilla/calidad visual real) — el análisis de esos perfiles es superficial (cadencia, tipo de contenido), no un juicio de calidad visual completo | Transparencia sobre el alcance real del análisis, para que no se tome como definitivo sin revisión manual |
| 2026-07-07 | Un agente en segundo plano relevó ~15 competidores adicionales desde el ángulo de prestaciones/funcionalidades (no estético) mientras se trabajaba en Etapa 0; se guardó como documento de research aparte (histórico). Hallazgo relevante: **CUIDARnos** (cooperativa impulsada por UTEP/Grobocopatel, lanzamiento 2026) es el primer competidor que reivindica públicamente GPS/geolocalización, aunque en fase piloto (~450 cuidadoras, AMBA) — matiza (sin invalidar) el claim de posicionamiento de la prestadora original de "nadie tiene GPS". También se detectó que `Cuidando en Casa` opera un Centro de Día físico en La Plata, coincidiendo directamente con la zona objetivo de la prestadora original | Pedido del usuario de investigar prestaciones de competidores como fuente de conocimiento para generación futura de contenidos |
| 2026-07-07 | Se inició Etapa 0 (setup): `git init` en `Workspace/`, `.gitignore` y `README.md` raíz, `sitio-web/` scaffolded con Vite + React (fijado a React 18 por ser el stack decidido en `CONTEXT.md`, no React 19 que es el default actual de create-vite), `vite-plugin-pwa@^1.3.0` (única versión compatible con Vite 8), variables CSS/i18n creados en `sitio-web/src/`, `backend/` scaffolded con Express (Node 22) y `nodemailer` fijado a `^9.0.3` por vulnerabilidades de severidad alta en la rama 6.x | Siguiente paso natural tras completar la documentación, ejecutado de forma autónoma por pedido explícito del usuario ("continúa solo sin detenerte a pedir permisos") |
| 2026-07-07 | Construida Etapa 1 completa (primera pasada): 8 páginas de `PRD_01_Sitio_Web.md`, i18n vía `LocaleContext` (React Context + localStorage, no prop-drilling), config centralizada de datos de contacto/precios (`config/siteConfig.js`, placeholders `[DEFINIR]` hasta que el negocio confirme), `vite-plugin-pwa` configurado en `vite.config.js` con manifest real, fuentes Playfair Display + DM Sans cargadas en `index.html`. Diseño aplicó las recomendaciones del benchmark estético de `DESIGN_SYSTEM.md`: bloques de sección con `--fondo-alt` y hero con fondo azul oscuro degradado (no fondo blanco corrido como todos los competidores relevados) | Ejecución del PRD_01, con las recomendaciones de diferenciación visual ya documentadas aplicadas desde el primer commit, no como retrofit posterior |
| 2026-07-07 | Se completaron los datos reales de `siteConfig.js` (teléfono/WhatsApp `+54 9 11 3787 4193`, email `prestadora.demo@gmail.com`, zona `AMBA`, dominio placeholder `prestadorademo.com.ar`), se sacó el campo "horario de atención" (ni el sitio ni el config lo muestran — decisión del usuario, la mayoría de competidores tampoco lo publica y comprometerse a un horario fijo de atención comercial no es sostenible con equipo chico) | Carga incremental de datos de negocio pedida por el usuario ("preguntame los datos y te voy diciendo") |
| 2026-07-07 | **Cambio de stack en Etapa 1**: se reemplazó MySQL/Railway por Supabase (Postgres) desde el arranque, en vez del plan original de `CONTEXT.md` (MySQL en Etapa 1, migración a Supabase recién en Etapa 2). Se actualizaron `CONTEXT.md` y `DATA_MODEL.md`, se reescribieron `backend/src/db/connection.js` (cliente Supabase con Service Role Key en vez de pool mysql2), `backend/src/db/schema.sql` (sintaxis Postgres + `ENABLE ROW LEVEL SECURITY` desde la creación de las tablas) y las dos rutas (`solicitudServicio.js`, `postulacionAsistente.js`) para insertar vía Supabase en vez de `pool.execute`. Se removió `mysql2` del `package.json` del backend y se agregó `@supabase/supabase-js`. Pendiente: crear el proyecto real en Supabase y cargar `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` en un `.env` local | El usuario notó que armar Railway/MySQL para migrar esos datos a Supabase apenas empiece Etapa 2 (Módulos 2 y 3 del panel de Admin trabajan sobre las mismas tablas `solicitudes`/`postulaciones`) era trabajo duplicado — se confirmó el cambio antes de tocar código |
| 2026-07-07 | Proyecto Supabase real creado (`prestadora-demo`, credenciales en `No hacer commit/claves y contraseñas.txt`, carpeta agregada a `.gitignore`); tablas `solicitudes`/`postulaciones` aplicadas contra la base real vía cadena de conexión directa, con RLS confirmada activa. Backend probado end-to-end contra Supabase real (insert OK), fila de prueba borrada después. Gmail app-password de `prestadora.demo@gmail.com` cargado en `backend/.env` local; el transporter de Nodemailer se ajustó a host/puerto explícitos + `family: 4` (forzar IPv4) porque el entorno de esta sesión no resuelve bien la IP IPv6 de Gmail — el envío de email falla acá por un error de verificación de certificado TLS local (entorno de desarrollo/sandbox), pero se confirmó por separado que la autenticación SMTP en sí funciona (`transporter.verify()` exitoso); debería funcionar sin problema una vez desplegado en Railway (Linux, sin ese interceptor) | Continuación de la carga incremental de credenciales reales para dejar Etapa 1 lista para producción |
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
deliberadamente afuera: requiere primero una UI para el pipeline del Proceso de
Incorporación de Asistentes (`aspirantes`/`verificaciones_asistente`), que no existe todavía.

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

Se investigaron (investigación de mercado, agencias de cuidado domiciliario y de personal de
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

## Actualización — Afinado final de Etapa 2 antes del deploy (gestión de usuarios, dashboard, Proceso de Incorporación, Certificado de Aptitud)

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

- **Nota de terminología importante**: el usuario rechazó explícitamente el nombre anterior
  de esta pantalla interna del Panel ("un nombre de mierda") — se renombró a
  **"Proceso de Incorporación de Asistentes"** solo para uso interno; el nombre anterior
  quedó reservado para un eventual uso público/marketing, todavía no confirmado en esa
  fecha. Ver nota en `CLAUDE.md` (glosario) fechada 2026-07-08. **No reintroducir el
  nombre anterior en el código/UI del Panel.**
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

**4. Certificado de Aptitud con QR** (Módulo 4, "botón generar/ver Certificado QR"; nombre anterior de la prestadora original usado en el nombre, renombrado 2026-07-13):

- Se investigó el PRD (`PRD_03_Reclutamiento.md`, `PRD_04_05_App_Servicio.md`,
  `DATA_MODEL.md`) antes de construir: el certificado reusa `asistentes.qr_token` (ya
  existía en el schema, no se creó un segundo mecanismo), y el QR apunta a una página
  pública (`prestadorademo.com.ar/asistente/[qr_token]`) que es explícitamente Etapa 6 —
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

Desplegado en Vercel: **https://aurevia-panel.vercel.app** (proyecto `aurevia-panel`,
mismo team `betosps-projects` que `sitio-web`). `panel/vercel.json` agregado con rewrite
SPA (`/(.*)` → `/index.html`) para que las rutas de React Router no den 404 al refrescar.
Variables de entorno de producción cargadas en Vercel: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (apunta al backend real en Railway,
`https://[nombre-anterior]-backend-production.up.railway.app`, hoy `aurevia-backend-production.up.railway.app`), `VITE_SITE_URL`. El backend ya
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
`aurevia-backend` al repo de GitHub (`BetoSP/aurevia`, rama `main`) vía la API GraphQL de
Railway, con la idea de que un `git push` disparara el build solo, sin correr `railway up` a
mano. Resultado real, tras probarlo a fondo:

- Conectar el `source.repo` vía API (`service source connect` del CLI) **no instala ningún
  webhook ni GitHub App** en el repo — se confirmó con `gh api repos/BetoSP/aurevia/hooks`
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
  un **proyecto nuevo huérfano** en la cuenta de Railway en vez de usar `aurevia-backend`. Se
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
(`Workspace/`) con `--service aurevia-backend` estando esa carpeta ya vinculada al proyecto
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
  `sitio-web/src/styles/components.css`, remanente de cuando se sacó el nombre anterior del
  proceso de verificación del sitio público (sesión anterior) — eliminado, confirmado por grep que ningún componente lo
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
- **Nuevo documento agregado por el usuario**: documento original de PRD de Reclutamiento (histórico) — PRD
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

## Actualización — Función 7 de PRD_02B (generador de documentación) + cierre del gap de DNI (trabajo nocturno autónomo)

Sesión nocturna sin presencia del usuario (instrucción explícita: avanzar todo lo posible sin
detenerse a esperar confirmación, saltear únicamente lo que dependa de él). Se completó la
única pieza que quedaba pendiente de `PRD_02B_Gestion_Personal.md`: la función 7
("Generador de documentación") de 9.

- **`panel/src/lib/generarDocumentoCese.js`** (nuevo): genera los 6 documentos PDF de la
  función 7 con `jspdf` (mismo patrón client-side-only que el resto del Panel, sin backend
  nuevo): liquidación final, telegrama de cese, notificación de fin de período de prueba,
  certificado de trabajo, certificado de remuneraciones y servicios, constancia de ausencia
  justificada. Reutiliza `calcularCese` — no reimplementa ningún cálculo legal (regla 10).
  Cada PDF incluye un disclaimer fijo: debe ser revisado por un abogado laboralista antes de
  su entrega o uso formal (mismo criterio de cautela que las filas PLACEHOLDER de
  `escalas_legales`).
- Wireado en el Panel: botones de descarga en `VinculoCeseTab.jsx` (liquidación +
  telegrama/notificación según causal, en el historial de ceses), `AusenciasCoberturaTab.jsx`
  (constancia por ausencia) y `PerfilTab.jsx` (certificado de trabajo visible a
  Coordinador+Admin; certificado de remuneraciones **solo Admin**, porque expone
  `valor_hora`/`sueldo_basico` — mismo criterio de `SECURITY.md` que ya restringe esos campos
  en el formulario de Perfil).
- **Gap descubierto al construir el certificado de trabajo**: no existía columna `dni` en
  ningún lado del schema, pese a que `PRD_03_Reclutamiento.md` ya la pedía como campo
  obligatorio del formulario público desde antes de esta sesión. Cerrado de punta a punta:
  `backend/src/db/schema_etapa2m.sql` (nuevo, aplicado y verificado contra Supabase real —
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS dni TEXT`, nullable por los registros existentes)
  en `postulaciones` y `asistentes`; campo agregado al formulario público
  (`TrabajaConNosotrosForm.jsx`, obligatorio), al backend (`postulacionAsistente.js`:
  validación + insert + email al Coordinador; `panelCuentas.js`: copiado al convertir
  Postulación → Asistente), y mostrado en `PostulacionDetalle.jsx`/`PerfilTab.jsx`.
- i18n: todas las claves nuevas (`asistentes.documentos.*`, `asistentes.cese.documentos`/
  `descargar_liquidacion`/`descargar_telegrama`/`descargar_notificacion_prueba`,
  `asistentes.ausencias.descargar_constancia`, `asistentes.dni`, `postulaciones.dni`,
  `trabaja.campo_dni`) agregadas simultáneamente en es-AR/en/pt-BR (regla 2).

**Verificado**: `npm run build` de `panel/` y `sitio-web/` sin errores; `npx vitest run`
18/18 en `panel/`; `schema_etapa2m.sql` corrió sin error contra la base real (confirmado por
consola: "OK: columnas dni agregadas").

**No se avanzó** sobre Etapa 3 (PWA Asistentes) en esta sesión — aunque está desbloqueada,
es una etapa nueva completa (login, guardias, GPS, reporte diario con IA) que amerita su
propio arranque de sesión con lectura de PRD y confirmación de alcance, no una extensión
del trabajo de esta noche.

## Actualización — Auditoría exhaustiva del commit de la Función 7 (bugs y faltantes)

A pedido explícito del usuario, se auditó en profundidad el código agregado en el commit
anterior (generador de documentación PDF + pipeline de DNI) buscando bugs reales, no
estilo. Hallazgos y cierres (2026-07-09):

- **Crítico — Certificado de trabajo con dato incorrecto para Coordinador**: el botón nuevo
  en `PerfilTab.jsx` estaba disponible para Coordinador, pero ese rol carga los datos desde
  la vista restringida `asistentes_coordinador`, que no incluye `tipo_vinculo` (está en la
  lista explícita de "datos laborales sensibles" de `schema_etapa2j.sql`) ni `fecha_baja`. El
  PDF terminaba declarando siempre "monotributo" aunque el Asistente real estuviera en
  relación de dependencia, y nunca reflejaba un cese ya registrado — un documento legal
  formal con dato falso. Corregido: los dos botones de certificado ahora son admin-only en
  `PerfilTab.jsx`, consistente con que el dato que necesitan no está disponible para
  Coordinador por diseño.
- **Crítico — término prohibido por el glosario**: el telegrama de cese
  (`generarDocumentoCese.js`) decía "extinción del contrato de trabajo" — exactamente el tipo
  de lenguaje de relación laboral que el glosario obligatorio de `CLAUDE.md` prohíbe (riesgo
  legal tipo Cabify). Corregido a "extinción del vínculo", consistente con el resto de los
  documentos del mismo archivo.
- **Medio — corrimiento de fecha de un día**: `formatoFecha()` parseaba columnas `DATE` de
  Postgres ("YYYY-MM-DD") con `new Date()`, que las interpreta como UTC medianoche;
  `toLocaleDateString('es-AR')` las mostraba un día antes en horario argentino (UTC-3).
  Afectaba fechas de alta/baja/cese/ausencia en los 6 documentos. Corregido: fechas
  sin hora se formatean directo desde el string, sin pasar por `Date`.
- **Medio — vista `asistentes_coordinador` sin la columna `dni` nueva**: agregada en
  `schema_etapa2m.sql` pero nunca sumada a la vista, así que Coordinador siempre veía
  "DNI: —" y cualquier constancia de ausencia que generara salía sin DNI. El DNI no es un
  dato laboral sensible (no está en la lista de `schema_etapa2j.sql`) — es dato
  identificatorio, igual que teléfono/email, que la vista ya expone. Cerrado con
  `backend/src/db/schema_etapa2n.sql` (nuevo, aplicado y verificado contra Supabase real).
- **Menor — sin validación de formato de DNI**: el formulario público y el backend solo
  validaban "no vacío". Se agregó `pattern="\d{7,8}"` en el campo del formulario (con texto
  de ayuda nuevo en las 3 locales) y la misma validación (`/^\d{7,8}$/`) en
  `backend/src/routes/postulacionAsistente.js`.
- **Bug pre-existente encontrado de paso (no de esta noche)**: en `AsistenteDetalle.jsx`, el
  tab "Ausencias y Cobertura" ya estaba en la lista de tabs visibles para Coordinador
  (`TABS_COORDINADOR`, agregado en la auditoría anterior — ver "Cierre de hallazgos
  médios/menores" arriba) pero el render seguía condicionado a `&& esAdmin`, así que
  Coordinador veía el tab en la barra pero contenido vacío al hacer clic. Corregido
  quitando la condición redundante — es exactamente el bug que esa auditoría anterior decía
  haber cerrado, pero el fix quedó incompleto en un solo lugar.

**Verificado**: `npm run build` de `panel/` y `sitio-web/` sin errores; `npx vitest run`
18/18 en `panel/`; `schema_etapa2n.sql` corrió sin error contra la base real.

## Actualización — Diagnóstico exhaustivo de todo el sistema (backend + panel + sitio-web) y cierre de hallazgos

A pedido explícito del usuario ("vuelve a correr un diagnóstico exhaustivo por todo el
sistema"), se lanzaron tres auditorías en paralelo (backend, panel, sitio-web) cubriendo
todo el código, no solo el último commit. Hallazgos y cierres (2026-07-09):

**Backend:**

- **Crítico — cuentas nuevas del Panel inutilizables**: `crearCuentaConPerfil()` generaba
  una `passwordTemporal` con `crypto.randomBytes` pero la descartaba — nunca se devolvía ni
  se comunicaba por ningún canal, así que una cuenta de Coordinador/Admin/Superadmin recién
  creada no tenía forma de loguearse. Corregido: `cuentasPanel.js` ahora devuelve
  `{ userId, passwordTemporal }`; `panelUsuarios.js`/`panelCuentas.js` actualizados; el
  Panel (`UsuariosPanel.jsx`) ya no cierra el modal de alta automáticamente — muestra la
  contraseña provisoria en pantalla con un botón "Cerrar" explícito para que el Admin la
  copie antes de cerrar.
- **Crítico — `borrarCuenta()` ignoraba errores de borrado**: si fallaba el `delete` en
  `usuarios` o en Supabase Auth (ej. bloqueado por una FK), la función no lo propagaba, así
  que `DELETE /api/panel/usuarios/:id` respondía `{ ok: true }` aunque la cuenta siguiera
  existiendo. Corregido: ambos errores ahora se lanzan.
- **Medio — email a Postulantes siempre en español**: `panelNotificaciones.js` no tenía
  forma de saber en qué idioma el Postulante completó el formulario público, así que el
  email de cambio de estado le llegaba en español aunque hubiera postulado en inglés o
  portugués. Se agregó la columna `postulaciones.idioma` (`schema_etapa2o.sql`, nuevo,
  aplicado contra Supabase real), el formulario público (`TrabajaConNosotrosForm.jsx`) ahora
  envía el locale activo, `postulacionAsistente.js` lo valida y guarda, y
  `panelNotificaciones.js` tiene los 3 mensajes de estado traducidos (es-AR/en/pt-BR) y
  elige según `postulaciones.idioma` (con fallback a es-AR).

**Panel:**

- **Crítico — fuga de datos laborales sensibles a Coordinador**: `Dashboard.jsx` consultaba
  siempre la tabla cruda `asistentes` (nunca la vista `asistentes_coordinador`) para la
  métrica de "Asistentes disponibles", exponiendo `sueldo_basico`, `valor_hora`,
  `tipo_vinculo`, `causal_baja` y el score de riesgo a Coordinador por la red — el mismo tipo
  de fuga ya cerrado en `Asistentes.jsx`/`AsistenteDetalle.jsx`, pero nunca replicado acá.
  Corregido: branchea por rol igual que el resto del Panel.
- **Medio — `VinculoCeseTab.jsx` ocultaba errores de carga del historial de ceses**: la
  consulta a `ceses` descartaba `{ error }`, y el `estado` pasado a `EstadoLista` era un
  ternario sin sentido (`ceses.length ? 'listo' : 'listo'`) que siempre mostraba "listo"
  incluso ante un fallo real de red. Corregido con el patrón estándar de 4 estados.
- Verificación de 7 hallazgos "plausibles" del primer barrido — 5 confirmados y corregidos,
  2 descartados tras inspección:
  - `Familias.jsx` no filtraba `deleted_at` (bajas seguían apareciendo en la lista activa) — corregido.
  - Botón "Reintentar" sin efecto en `SimuladorVinculoTab.jsx` (`useEscalasLegales()` no
    exponía `error`/`recargar` al `EstadoLista`) — corregido.
  - Doble alerta de error en `Configuracion.jsx` (`TabZonas`) — corregido.
  - `PrestacionesPaciente.jsx` y `AusenciasCoberturaTab.jsx` con mutaciones sin manejo de
    error — corregidos ambos.
  - `VerificacionTab.jsx` sin `disabled` en los campos durante el guardado — corregido.
  - `ScoreRiesgoTab.jsx`: descartado — el botón de guardado ya deshabilita correctamente y
    sigue el mismo patrón ya validado en `VinculoCeseTab.jsx` para la carga de fondo de
    `useEscalasLegales`.

**Sitio-web:**

- **Medio — faltaba `hreflang`/canonical en 6 de 7 páginas**: solo la home tenía
  `alternates` en su metadata; el resto heredaba el de la home (apuntando siempre a `/`).
  Se agregó el helper `alternatesPara(locale, ruta)` en `lib/i18n.js` y se aplicó en las 6
  páginas restantes (`contacto`, `privacidad`, `servicios`, `solicita-servicio`, `terminos`,
  `trabaja-con-nosotros`).
- **Menor — sin `sitemap.xml` ni `robots.txt`**: se agregaron `src/app/sitemap.js` y
  `src/app/robots.js` (Next.js 15 file conventions), cubriendo las 3 locales y todas las
  rutas públicas.
- **Menor — `aria-label="Menú"` hardcodeado** en `Header.jsx` sin importar el idioma activo.
  Se agregó la clave `nav.menu` (es-AR/en/pt-BR) y se usa `t.nav.menu`.

**Nota de seguridad operativa**: durante la migración de `schema_etapa2o.sql` se expuso por
error la connection string completa de Supabase (con contraseña) en la salida de un
comando de diagnóstico. El usuario decidió explícitamente no rotarla ahora ("no existe
riesgo durante la etapa de desarrollo") y posponer la rotación de **todas** las credenciales
de desarrollo para el momento previo al lanzamiento público — ver nota en memoria de sesión,
no repetir la pregunta en sesiones futuras salvo que cambie el contexto (repo público,
lanzamiento cercano, etc.).

**Verificado**: `npm run build` + `npx vitest run` (18/18) en `panel/`; `npm run build` en
`sitio-web/`; `schema_etapa2o.sql` corrió sin error contra la base real.

## Actualización — Automatización del deploy de Railway (vía GitHub Actions) + MCP de navegador + cambio de modelo de negocio (Xeitra)

Continuación de la misma sesión, tres temas separados:

**1. Deploy del backend automatizado (por fin) — commit `2553406`:**
Se creó `.github/workflows/deploy-backend.yml`: en cada push a `main` que toque
`backend/**`, corre `railway up --service aurevia-backend --environment production --ci`
autenticado con el secret de GitHub `RAILWAY_TOKEN`. Esto reemplaza el intento fallido de
integración nativa Railway↔GitHub (bloqueado por una autorización OAuth que solo se puede
hacer desde el dashboard — ver sección anterior "Intento de automatizar el deploy de
Railway"). **Falta un solo paso, y es exclusivamente del usuario**: crear un Project Token
en el dashboard de Railway (proyecto `aurevia-backend` → Settings → Tokens, entorno
`production`) y cargarlo como secret `RAILWAY_TOKEN` del repo. El usuario prefirió no
pegarlo en el chat (mismo criterio que con la contraseña de Supabase) — quedó acordado que
lo va a escribir en `No hacer commit/claves y contraseñas.txt` y Claude lo toma de ahí para
cargarlo con `gh secret set` sin mostrarlo. **Esto sigue pendiente al cierre de esta
sesión** — verificar en la próxima si ya se cargó (correr un push de prueba y revisar la
pestaña Actions del repo, o simplemente preguntar).

**2. MCP de Playwright (navegador) instalado, pendiente de reinicio:**
El usuario preguntó por qué Claude no podía crear el Project Token de Railway él mismo (no
hay mutación de API para eso, confirmado, y no había ninguna herramienta de navegador
disponible en la sesión). Pidió agregarla, y se registró con:
`claude mcp add playwright -s user -- npx -y @playwright/mcp@latest`
Quedó guardado en `C:\Users\Usuario\.claude.json` a **nivel de usuario** (`-s user`), o sea
disponible para cualquier proyecto/sesión futura, no solo este. `claude mcp list` lo
confirma conectado. **Los MCP servers se cargan al iniciar sesión** — hace falta reiniciar
Claude Code (o abrir sesión nueva) para que las herramientas de navegador aparezcan
disponibles. Una vez reiniciado, se puede retomar el punto 1 (crear el Project Token
navegando el dashboard de Railway directamente) sin depender del usuario para ese paso.

**3. Cambio de modelo de negocio — el software pasa a ser un producto SaaS de Xeitra:**
El usuario informó (2026-07-09) que el software que se está construyendo **ya no es
propiedad de Prestadora Demo** — es un producto que **Xeitra** está desarrollando en
formato SaaS, y Prestadora Demo pasa a ser **cliente/licenciatario** (primera implementación,
customizada para su operación, con la intención de vendérselo a otras empresas dentro y
fuera del país a futuro). Pidió puntualmente cambiar el texto de copyright del sitio
público de "© 2026 Prestadora Demo. Todos los derechos reservados." a "© 2026 PLM
[Systems/Sistems — pendiente confirmar ortografía exacta]. Todos los derechos reservados."
**Este cambio NO se aplicó todavía** — quedó pendiente una pregunta de aclaración al usuario
(ortografía exacta del nombre + alcance: si el pedido es solo la línea de copyright de
`sitio-web/src/components/Footer.jsx` o si además hay que revisar textos legales
—`privacidad`/`terminos`— y el resto de menciones de marca). **Importante**: la marca de la
prestadora original sigue siendo la correcta en todo lo que describe el negocio de cuidado
domiciliario en sí (nav, login, PDFs de RRHH tipo `generarDocumentoCese.js`, etc.) — el
cambio de titularidad aplica solo a quién es dueño/desarrollador del software, no a la marca
de la prestadora original como negocio. **No dar por sentado el alcance completo de este cambio sin
confirmar con el usuario** — podría eventualmente implicar revisar `CLAUDE.md` (quién es
"el usuario" del glosario legal, futuro modelo multi-tenant para otros clientes SaaS,
textos legales de `privacidad`/`terminos`), pero eso no se decidió todavía, solo se pidió el
cambio puntual del copyright.

**Resuelto en la sesión siguiente (2026-07-09, continuación):** el usuario confirmó la
ortografía exacta ("Xeitra", con "y") y el alcance (footer + revisar `terminos`/
`privacidad`). Se cambió `sitio-web/src/components/Footer.jsx` (commit `beb23ec`); se
revisaron `terminos/page.jsx` y `privacidad/page.jsx` y son placeholders sin texto legal
real todavía, así que no había nada más que tocar ahí — cuando se redacte el contenido
legal real de esas páginas, debe nombrar a Xeitra como titular del software.

## Actualización — Documentación alineada con el prompt de arquitectura multi-tenant (Xeitra)

El usuario agregó `docs/Prompt_Claude_Code_Xeitra_Multitenant.md` (prompt completo pensado
para dársela a una futura sesión de Claude Code como kickoff de la migración a
multi-tenancy) y pidió alinear la documentación existente con ese nuevo documento — no
implementar nada de lo que el prompt describe, solo dejar la documentación consistente.

Cambios de documentación (sin tocar código de producto):

- `CLAUDE.md`: sección "Qué es esto" ahora explica el cambio societario (Xeitra dueña
  del software / la prestadora original cliente + negocio de auditoría B2B) y linkea al nuevo prompt;
  se agregaron dos filas al glosario obligatorio ("Xeitra", "Prestadora"); se agregó
  una sección nueva "Sobre `docs/Prompt_Claude_Code_Xeitra_Multitenant.md`" aclarando que, a
  diferencia de "Prompt de Money Suite.md", este sí es vinculante como dirección de
  negocio, pero que el propio documento pide inventario + plan antes de escribir código de
  producción — no arrancar la implementación sin ese paso ni sin aprobación explícita.
- `docs/CONTEXT.md`: nueva entrada en "Modelo de negocio" describiendo el cambio societario
  y remitiendo al prompt; nota en "Roles de usuario" sobre los roles futuros ("Administrador
  de prestadora", financiador de solo lectura) que no hay que implementar todavía; entrada
  en el changelog del documento (v2).
- `docs/BUILD_ORDER.md`: nueva fila "Diferida" para "Multi-tenancy real" que referencia el
  documento y deja explícito que la condición de entrada es negocio de Xeitra
  formalizado + al menos un cliente licenciatario además de la prestadora original, y que empieza por el
  inventario/plan, no por código.

**Estado real del producto: sin cambios.** El sistema sigue siendo mono-tenant (una sola
organización, la prestadora original) en producción — esto fue puramente un trabajo de alineación de
documentación. El propio `Prompt_Claude_Code_Xeitra_Multitenant.md` pide, como primer paso
real de esa migración, un inventario de qué partes del código asumen hoy "una sola
organización" y una propuesta de plan de migración — eso no se hizo en esta sesión y
requiere autorización explícita del Desarrollador para arrancar (es un cambio arquitectónico grande:
entidad `prestadoras`, RLS por tenant, roles nuevos, facturación dual Xeitra/prestadora, i18n y
multi-moneda).

## Actualización — Inventario + plan de migración multi-tenant (`docs/PLAN_MULTITENANT_XEITRA.md`)

El usuario pidió avanzar con el kickoff real del `Prompt_Claude_Code_Xeitra_Multitenant.md`.
Se hizo el trabajo que ese prompt pide como primer paso (puntos 1-4 de su sección "Lo que
sí te pedimos ahora") — **inventario y plan, sin escribir ni una línea de código de
producto**. Documento nuevo: `docs/PLAN_MULTITENANT_XEITRA.md`.

Contenido del documento (resumen — el detalle completo está ahí, no se repite acá):

1. **Inventario completo** (hecho con un agente de exploración dedicado) de todas las
   tablas sin columna de organización, el patrón RLS actual y por qué es extensible casi
   1:1 al patrón de tenant, el caso mono-tenant más literal (`configuracion_empresa.id
   CHECK (id = 1)`), el riesgo de seguridad mayor (rutas del backend con Service Role Key,
   que bypassean RLS y hoy no filtran por organización), la relación ortogonal entre
   `zonas` y `prestadora` (no colapsar), el modelo de roles actual y dónde encajaría
   `admin_prestadora`, y los hardcodeos de "la prestadora original como única organización posible"
   distinguiendo los estructurales (`configuracion_empresa`, `email.js`,
   `generarDocumentoCese.js`, `calcularCese.js`) de los que son solo texto de marca
   (logo del panel, templates de notificación, i18n).
2. **Plan de migración de datos propuesto**, 8 pasos incrementales y no destructivos (crear
   `prestadoras` → agregar `prestadora_id` nullable a cada tabla → backfill con el id de
   la prestadora original → `NOT NULL` → reescribir RLS → filtrar el backend → migrar
   `configuracion_empresa` → parametrizar hardcodeos estructurales), priorizando primero el
   aislamiento de los datos más sensibles (`pacientes`, `ceses`, `ausencias`).
3. **Diseño de tablas** con nivel de diagrama: `prestadoras`, `configuracion_prestadora`
   (reemplazo de la singleton), `cumplimiento_normativo_prestadora` (append-only, para trazabilidad
   legal inmutable), roles nuevos (`admin_prestadora`, `superadmin` redefinido como el rol
   cross-tenant de Xeitra, `financiador` solo contemplado), y `planes_facturacion`/`facturas`
   (con `moneda` explícita, `tipo_cambio_referencia` solo para trazabilidad, numeración
   separada por `empresa_emisora` Xeitra/prestadora).
4. **Puntos marcados explícitamente para discutir antes de escribir código** — el más
   importante: el rol `admin` de hoy ("ve todo de la prestadora original") pasaría semánticamente a llamarse
   `admin_prestadora`, y `superadmin` pasaría a ser el rol cross-tenant real de Xeitra — esto
   es un cambio de dato sobre usuarios reales en producción, no solo una decisión de
   nomenclatura, y no se debe ejecutar sin aprobación explícita. También se marca que el
   punto 4 del prompt de negocio (facturación "implementada ya") depende de una decisión de
   negocio no técnica (qué esquema de precio y periodicidad se usa realmente con la prestadora original)
   que todavía no existe.

**Estado real del producto: sin cambios, otra vez.** Es intencional — el propio prompt de
negocio pide ver el inventario y el plan antes de tocar producción. Próximo paso: que el
usuario apruebe (o corrija) las decisiones de la sección 4 de `PLAN_MULTITENANT_XEITRA.md`
antes de generar la primera migración SQL real.

## Actualización — Bloque 3 del plan multi-tenant: filtrado de tenant en rutas backend con Service Role Key — CERRADO (7 de 15 columnas)

Auditoría adversarial previa de Bloques 1 y 2 (detalle completo en
`docs/PLAN_MULTITENANT_XEITRA.md`, sección "Auditoría adversarial de Bloques 1 y 2"): dos
hallazgos corregidos y verificados contra Supabase real — policy pública de
`zonas_cobertura` sin ningún filtro (`DROP POLICY`, no se le agregó `current_tenant()`
porque un visitante anónimo no tiene `auth.uid()`), y un literal `rol = 'admin'` huérfano
en `panelConfiguracion.js` que bloqueaba a los `admin_prestadora` reales (no era fuga, era
bloqueo de acceso legítimo).

Bloque 3 en sí — se agregó filtrado por `prestadora_id` (bypasseando RLS, porque estas
rutas usan la Service Role Key) en: `panelUsuarios.js` (GET/PATCH/DELETE — el hallazgo más
crítico, listaba/editaba/borraba usuarios de **todas** las prestadoras sin filtro alguno,
confirmado explotable con un tenant fabricado real), `panelConfiguracion.js` (endpoints de
`/zonas`), `panelCuentas.js` + `utils/cuentasPanel.js` (altas de cuenta familia/asistente),
`utils/vencimientos.js` (cron de vencimientos), y `configuracionPublica.js` (zonas
públicas). Las dos rutas públicas sin login (`solicitudServicio.js`,
`postulacionAsistente.js`) resuelven el tenant con un UUID hardcodeado en
`backend/src/db/tenantTemporal.js` (`PRESTADORA_DEMO_ID`) — a propósito, sin mecanismo
de resolución por dominio, hasta que exista una segunda prestadora con presencia pública
propia. Todo verificado con pruebas reales contra Supabase (tenant fabricado + cuenta Auth
real + limpieza completa). Script de verificación reutilizable guardado en
`backend/scripts/verificacion/bloque3_verificacion.mjs` (lee secretos de variables de
entorno, no hardcodeados, porque queda commiteado al repo).

Cierre del `DEFAULT` temporal en `prestadora_id` (parche del Bloque 2): se aplicó
`DROP DEFAULT` y se verificó con insert real que vuelve a fallar por `NOT NULL` en 7 de las
15 columnas (`usuarios`, `asistentes`, `familias`, `pacientes`, `zonas_cobertura`,
`solicitudes`, `postulaciones`) — las que ya tienen su ruta de alta corregida. Las otras 8
(`ausencias`, `guardias_cobertura`, `ceses`, `lista_precios`, `prestaciones`,
`paquetes_prestaciones`, `paquete_prestacion_items`, `certificados`) se insertan solo desde
el panel con la anon key y ningún componente setea `prestadora_id` hoy — quedan con el
`DEFAULT` a propósito. Detalle completo y el ítem de trabajo con nombre
("Panel — tenant en inserts directos", con su alcance de 3 pasos) en
`docs/PLAN_MULTITENANT_XEITRA.md` sección 4.1 — debe ejecutarse antes de que arranque el
Bloque 4 (branding).

**Corrección posterior, misma sesión**: antes de dar el Bloque 3 por cerrado del todo, se
confirmó archivo:línea el estado de las 6 operaciones de lectura/edición/borrado por id que
se habían subido a prioridad máxima. Se encontró un hueco real que el resumen anterior no
había cubierto explícitamente: `backend/src/utils/cuentasPanel.js` `borrarCuenta()` borraba
por `id` sin verificación de tenant propia — segura hoy solo porque los 3 llamadores actuales
son disciplinados, no porque la función lo garantizara. Corregido (ahora exige y valida
`{ prestadoraId, esSuperadmin }`) y verificado con un tenant fabricado real. Se agregaron
además 3 chequeos de aislamiento cross-tenant permanentes a
`backend/scripts/verificacion/bloque3_verificacion.mjs` (antes solo cubría lecturas simples),
así el script vuelve a ser un chequeo reusable real y no solo lo que se probó una vez a mano.

## Actualización — Módulo 6 (Guardias): schema + RLS multi-tenant, migración aplicada y verificada contra Supabase real

Diseño consolidado con el usuario incluyendo dos correcciones encontradas en la revisión
final: (1) `incidentes_relevo.guardia_saliente_id` es **nullable** (no `NOT NULL` como en el
primer borrador) para representar "ausente sin handoff" (primera guardia del día, ningún
Asistente de la prestadora original presente antes) — el caso de mayor riesgo, no uno menor; (2) la policy
RLS de Coordinador sobre `incidentes_relevo` (y, encadenada, sobre
`excepciones_familiar_relevo`) usa `OR` entre dos `EXISTS` independientes (zona de la
guardia entrante, u opcionalmente zona de la saliente cuando no es NULL) — nunca una
condición que dependa de que ambas columnas resuelvan, porque eso ocultaría en silencio
justo el incidente más grave. `resuelto_por_id` confirmado como FK compuesta nullable
estándar (`MATCH SIMPLE` de Postgres, sin trigger) + `CHECK` de coherencia con
`resuelto_por_tipo`. `plantilla_mensaje NOT NULL` vs. `minutos_demora`/`orden_prioridad`
nullable es asimetría intencional (un nivel sin timing simplemente no dispara; un nivel sin
mensaje fallaría en silencio).

8 tablas nuevas (`series_guardias`, `guardias`, `domicilios_temporales_paciente`,
`personal_emergencia`, `incidentes_relevo`, `configuracion_escalada_relevo`,
`excepciones_familiar_relevo`, `guardias_tracking_gps`) + 2 `UNIQUE(id, prestadora_id)`
aditivas en `asistentes`/`pacientes` (prerrequisito de las FK compuestas). Todas las FK entre
tablas de distinto tenant son compuestas (`(fk_id, prestadora_id)` contra
`(id, prestadora_id)` del padre) — cruce entre prestadoras estructuralmente imposible, no
solo disciplinado. `guardias_tracking_gps` queda con el schema creado pero **bloqueada
explícitamente para uso con datos reales** hasta definir política de retención (Ley 25.326).

**Mecanismo de aplicación, corregido en esta sesión y ahora fijado como estándar**: nada de
pegar SQL a mano en el SQL Editor de Supabase. Se usa la Supabase CLI real (`supabase db
query --linked -f <archivo>`), autenticada con un `SUPABASE_ACCESS_TOKEN` temporal generado
por el Desarrollador para esta tarea puntual — confirmado antes de tocar nada que
`supabase projects list` mostrara el proyecto correcto (`abcpmzfnnhpuiupmrsdi` → "Prestadora
Demo") y que el `link` quedara acotado a `backend/`, sin tocar ninguna otra cuenta/proyecto
del Desarrollador. **Token de un solo uso — el Desarrollador debe revocarlo desde Dashboard →
Access Tokens apenas se confirme el cierre de esta tarea; no debe quedar vigente
indefinidamente.**

**Regla nueva, permanente, a partir de esta sesión**: el proyecto está en el plan Free de
Supabase (sin point-in-time recovery). Antes de aplicar cualquier migración con cambios de
schema no triviales, correr primero un backup manual real con la misma CLI ya autorizada
(`supabase db dump --linked -f backups/<nombre>_<fecha>.sql` para schema, y
`--data-only` aparte para datos), confirmar que el archivo no está vacío, y solo después
aplicar la migración. `backend/backups/` ya está en `.gitignore` — nunca commitear estos
dumps (contienen datos reales de usuarios); local es un lugar de paso, no el destino final
— git/GitHub queda descartado como destino permanente de backup, no en evaluación (ver
`docs/SECURITY.md`, backup propio en bucket de almacenamiento de objetos, tarea todavía
pendiente de implementar). Nota técnica encontrada al hacerlo: un dump `--data-only` de este
proyecto genera un warning de FK circular entre `solicitudes` y `familias` — no impide el
dump, pero una restauración de ese archivo específico probablemente necesite
`--disable-triggers` o dropear constraints temporalmente; un dump completo (schema+data,
sin `--data-only`) no tiene ese problema.

**Verificación contra Supabase real, completa**: existencia de las 8 tablas
(`information_schema.tables`), RLS habilitada en las 8 (`pg_class.relrowsecurity`), las 17
constraints (`UNIQUE`/FK compuestas) esperadas presentes por nombre, las 15 políticas RLS
esperadas presentes por nombre (`pg_policies`), y —la pieza más nueva y con más riesgo de un
error de lógica sutil que un `CREATE TABLE` exitoso no delata— prueba con datos reales
fabricados (Auth users + filas, todo limpiado después) de que un Coordinador de la zona del
Asistente **entrante** ve un `incidentes_relevo` con `guardia_saliente_id NULL`, y que un
Coordinador de otra zona no lo ve. Ambos casos OK.

Pendiente, no arrancado en esta sesión: rutas backend (CRUD) para las 8 tablas, UI del Panel
para Módulo 6, definición de negocio de `configuracion_escalada_relevo` (tiempos/orden de
escalada completos) y decisión de proveedor de WhatsApp Business API (o diferir mensajería) |
`backend/src/db/schema_modulo6_guardias.sql` (nuevo, aplicado y verificado contra Supabase
real); `backend/.gitignore` (agregado `backups/`); `backend/backups/` (2 dumps de respaldo
pre-migración, no versionados)

## Actualización — barrido documental completo contra la realidad del código (2026-07-10)

A pedido explícito del Desarrollador ("revisá en profundidad cada uno de los documentos del
proyecto y actualizalos a la realidad de los cambios realizados"), se auditó cada documento
de `docs/` (vía 3 agentes de exploración en paralelo, sin permiso de edición, solo
diagnóstico) contra el estado real del código y se aplicaron las correcciones encontradas:

- **`CONTEXT.md`**: la sección de cambio societario ya no dice "nada de esto está
  implementado" — documenta Bloques 1-3 de multi-tenancy aplicados y verificados, con solo
  el Bloque 4 pendiente. Tabla de roles y sección "roles futuros" corregidas (`Admin` →
  `Admin_prestadora`, ya no es un rol futuro). Estado de Módulo 6 actualizado (schema hecho,
  sin rutas/UI). Agregado changelog v3.
- **`BUILD_ORDER.md`**: fila de multi-tenancy actualizada (Bloques 1-3 hechos, Bloque 4
  pendiente); agregada una fila nueva para Módulo 6 (sin PRD dedicado todavía — ver pregunta
  abierta abajo).
- **`DATA_MODEL.md`**: agregada la tabla `prestadoras` y la convención de FK compuesta
  tenant-segura (introducida con Módulo 6); documentada la deuda técnica real del `DEFAULT`
  temporal en `prestadora_id` de 14 tablas (confirmado por archivo: no existe ningún
  `schema_multitenant_03.sql` ni `DROP DEFAULT` en el repo, sigue activo); reemplazada la
  sección de `guardias` por un resumen de las 8 tablas reales de Módulo 6, con referencia al
  schema real para el DDL completo; corregido el diagrama de relaciones (`admin` →
  `admin_prestadora`, agregadas las tablas de Módulo 6 y Módulo 8).
- **`SECURITY.md`**: tabla RBAC corregida (`admin` → `admin_prestadora`); agregada sección
  de `current_tenant()`/`es_superadmin()`; los ejemplos de policies ahora muestran el filtro
  de tenant; agregado como ejemplo oficial el patrón OR-de-dos-EXISTS de `incidentes_relevo`
  para el caso `guardia_saliente_id NULL`; agregada nota de decisión pendiente sobre
  retención de `guardias_tracking_gps` bajo Ley 25.326.
- **`PRD_01_Sitio_Web.md`**: eliminada la página pública `/el-filtro` del documento (ya se
  había eliminado del código el 2026-07-08) — nav, sección de Home y fila SEO corregidas;
  "Cuidadores" → "Asistentes Integrales" en meta description.
- **`PRD_02_Panel_Admin.md`**: `Admin` → `Admin_prestadora` en toda la tabla de roles y
  notificaciones; sección Módulo 6 reescrita contra el schema real (antes describía un
  diseño genérico desactualizado, ahora documenta las 8 tablas reales y qué falta construir).
- **`PRD_02B_Gestion_Personal.md`** y **`PRD_03_Reclutamiento.md`**: `Admin` →
  `Admin_prestadora` en todas las menciones de rol.
- **`PRD_04_05_App_Servicio.md`**: corregida una violación real de la regla de "Proceso de
  Incorporación de Asistentes nunca en el sitio público" — el Perfil Público del Asistente (con QR, sin login)
  mostraba "las 5 etapas del Proceso de Incorporación con fecha de aprobación de cada una"; ahora solo
  muestra el hecho consolidado "Verificado por [nombre de la prestadora] el [fecha]", sin nombrar el proceso.
- **Documento de investigación de competidores por prestaciones**: "adultos mayores" → "pacientes" en la única fila que
  describe a la prestadora original misma (el resto del documento cita cómo se autodenominan competidores
  externos, no se tocó).
- **Sin hallazgos**: `DESIGN_SYSTEM.md`, `AI_PROMPTS.md` — vocabulario ya alineado al
  glosario, sin menciones obsoletas de roles ni del término retirado.

**Nota de corrección (2026-07-10)**: este documento había registrado acá una supuesta
decisión del Desarrollador de posponer la creación de `PRD_06_Guardias.md` — al pedir
verificación contra evidencia, no se encontró ningún commit ni intercambio anterior a esta
misma sesión que la respalde; era una inferencia de sesión tratada como hecho confirmado,
sin sustento real. Corregido: no hay decisión tomada sobre `PRD_06_Guardias.md`, queda
abierto. El Desarrollador confirmó que la prioridad de trabajo es arrancar Módulo 6
(rutas backend + UI de Panel) directamente.

**Una pregunta se elevó al Desarrollador esta sesión, resuelta así:**
1. **Término retirado (antiguo "Filtro [nombre anterior]") vs "Proceso de Incorporación de Asistentes" en `PRD_03_Reclutamiento.md`**:
   aprobado reescribir. Se renombraron los dos títulos de sección que describen directamente
   lo que alimenta pantallas de Panel ("El Filtro [nombre anterior] — 6 etapas de incorporación" →
   "Proceso de Incorporación de Asistentes — 6 etapas", con nota de nomenclatura explícita; y
   "Etapa 5 del Filtro" → "Etapa 5 del Proceso de Incorporación de Asistentes"). El término
   retirado quedó reservado para el concepto general/interno, no para el nombre de estas
   pantallas (retiro total posterior, ver entrada 2026-07-10 más abajo).

## Actualización — Módulo 6 (Guardias) Parte 1: "Guardias core" construida en el Panel (2026-07-10)

A pedido explícito del Desarrollador, priorizado por sobre el Bloque 4 del plan
multi-tenant (las 8 tablas de Guardias son independientes de las 8 tablas afectadas por ese
Bloque, y el negocio real con la primera Familia pesa más que protegerse de una segunda
prestadora hipotética todavía inexistente). Alcance acordado en 3 partes — esta sesión
construyó solo la Parte 1:

- **Parte 1 — Guardias core (construida)**: `series_guardias` (alta de serie recurrente,
  genera `guardias` concretas al crearla, acotado a 90 días si no se carga
  `vigente_hasta`), `guardias` (alta suelta, lista agenda por día, checkpoint de salida,
  check-in/check-out con geolocalización best-effort, cancelación, marcar ausente).
- **Parte 2 — Continuidad de guardia**: no construida (`incidentes_relevo`,
  `configuracion_escalada_relevo`, `excepciones_familiar_relevo`).
- **Parte 3 — Piezas de apoyo**: no construida (`domicilios_temporales_paciente`,
  `personal_emergencia`).

Sin rutas backend nuevas: se implementó enteramente como páginas de Panel con llamadas
directas a Supabase (anon key), apoyándose en las policies RLS que ya venían completas desde
`schema_modulo6_guardias.sql` — mismo patrón que `Familias.jsx`/`Asistentes.jsx`, reservando
rutas con Service Role Key solo para operaciones privilegiadas que RLS no puede resolver
(no aplica acá).

Archivos nuevos: `panel/src/pages/Guardias.jsx`, `panel/src/pages/guardias/NuevaGuardiaModal.jsx`,
`panel/src/pages/guardias/GuardiaAcciones.jsx`, `panel/src/lib/ubicacion.js` (geolocalización
best-effort, nunca bloqueante — regla 11 de `CLAUDE.md`). Modificados: `App.jsx` (ruta
`/guardias`), `Layout.jsx` (nav), `i18n/translations.js` (bloque `guardias` + `nav.guardias`
en las 3 locales), `EstadoLista.jsx` (prop opcional `mensajeVacio` para mensaje de vacío
específico por página, retrocompatible), `index.css` (clases `.panel-guardia-*` y las 5
`.guardia-{estado}`), `docs/DESIGN_SYSTEM.md` (agregada la 5ª regla `.guardia-ausente` que
faltaba — el estado se sumó al diseñar el schema pero nunca se reflejó en esta sección).

**Explícitamente no construido, ni siquiera parcial**: `guardias_tracking_gps` — bloqueante
por Ley 25.326 sin política de retención definida. El Desarrollador rechazó de forma
explícita la opción de un endpoint detrás de un flag apagado ("un flag apagado esperando
activación es, en los hechos, una función a medias que queda dando vueltas"), citando como
precedente el `DEFAULT` temporal de `prestadora_id` y una ausencia de backup no detectada a
tiempo — ningún "temporal hasta que se resuelva X" queda medio construido en este proyecto.

**Verificación de esta sesión**: `npm run build` y `npm run lint` (panel) sin errores ni
warnings nuevos. **No se probó en navegador** (no había sesión de Playwright MCP cargada en
esta corrida) — falta la prueba manual del flujo completo (alta de serie, checkpoint de
salida, check-in, check-out, cancelar, marcar ausente) antes de dar por cerrada la Parte 1
en los hechos, no solo en el código.

## Actualización — Backup automático propio a R2 + B2 cerrado y verificado en producción (2026-07-11)

Pendiente #4 de `docs/PENDIENTES.md` (backup independiente del nativo de Supabase, en
almacenamiento de objetos, doble proveedor) cerrado de punta a punta. El workflow
`.github/workflows/backup-diario.yml` ya venía escrito (cron diario 03:00 Arg +
`workflow_dispatch`); esta sesión corrigió dos problemas que impedían que corriera con éxito
en la realidad, no solo que existiera el código:

1. **`pg_dump` v16 (Ubuntu default) vs. servidor Supabase v17.6**: `pg_dump` rechaza volcar
   un servidor de versión mayor a la propia. Se agregó el repo oficial
   `apt.postgresql.org` + su clave GPG e instaló `postgresql-client-17` específicamente
   (`backup-diario.yml:17-25`).
2. **Credenciales truncadas por transcripción en una sesión anterior**: el Access Key ID de
   R2 tenía 31 caracteres (debía tener 32) y la Application Key de B2 tenía 30 (debía tener
   31). Ni R2 ni B2 permiten volver a ver una clave ya creada, así que se generaron
   reemplazos (`prestadora-demo-backup-script-v2` en R2, `prestadora-demo-backups-mirror-v2` en B2, ambos
   acotados a su bucket específico) y se actualizó `backend/.env`, los secrets de GitHub y
   `No hacer commit/claves y contraseñas.txt`.

**Verificado en la realidad** (no solo por el mensaje de éxito del propio script): run
`29171951217` → `completed success`; `ListObjectsV2Command` contra ambos buckets confirma el
mismo archivo presente en los dos; se descargó de ambos buckets y se confirmó `gzip -t`
válido, contenido real de `pg_dump` (63 `CREATE TABLE`) e idéntico byte a byte entre R2 y B2.
**No se hizo una restauración completa dentro de una base Postgres viva** — no había un
Postgres de prueba disponible en esta sesión; queda anotado en el detalle del pendiente #4
como el único nivel de verificación no cubierto, en vez de darlo por hecho sin más.

## Actualización — Pestaña "Servicios" en Módulo 8 (Configuración): CRUD de escalada de relevo por prestadora (2026-07-11)

Cierra el pendiente #8, con una corrección de enfoque importante en el camino: la redacción
original pedía que el Desarrollador definiera valores fijos de escalada (niveles, tiempos,
mensajes). El Desarrollador corrigió esto explícitamente — son valores que cada prestadora
licenciataria debe parametrizar según su propia metodología de trabajo, consistente con el
diseño ya existente de la tabla `configuracion_escalada_relevo` (por-`prestadora_id` desde
que se escribió el schema, `backend/src/db/schema_modulo6_guardias.sql:318-327`). El pedido
también se amplió: no es una pantalla aislada, es una pestaña nueva ("Servicios") dentro del
Módulo 8 (Configuración) ya existente, donde a futuro vivirán otras políticas parametrizables
por prestadora todavía sin identificar (pendiente #16, nuevo, deliberadamente pospuesto — el
Desarrollador no podía enumerarlas de memoria, hace falta una revisión activa del código).

Construido: backend (`backend/src/routes/panelConfiguracion.js:82-127`, 4 rutas CRUD sobre
`configuracion_escalada_relevo`, mismo patrón de filtrado manual por `prestadora_id` que las
rutas de `/zonas` ya existentes) + frontend (`panel/src/pages/Configuracion.jsx`, pestaña
nueva con componentes `TabServicios`/`NuevoNivelEscalada`, tabla de niveles con 4 selects de
prioridad usando los roles canónicos del glosario de `CLAUDE.md` — Suplente, Franquero,
Personal de emergencia, Familiar — unidos con "→") + i18n (`panel/src/i18n/translations.js`,
~16 claves nuevas en `es-AR`/`en`/`pt-BR`).

Probado en navegador real (Playwright MCP) contra el Panel corriendo local (`localhost:5173`)
y el backend local (`localhost:4000`), logueado como Admin real (`prestadora.demo@gmail.com`):
estado vacío correcto, alta de un nivel de prueba (nivel 1, 15 min, Suplente→Franquero,
mensaje de prueba) reflejada de inmediato en la tabla, borrado con el diálogo de confirmación
nativo del navegador (Regla 4) aceptado y vuelta al estado vacío sin dato residual. `npm run
lint` y `npm run build` sin errores nuevos (solo warnings preexistentes).

Hallazgo no bloqueante durante la prueba, no relacionado con el código de este pendiente: un
proceso `node` huérfano de una sesión anterior (iniciado 8/7, PID 20616) tenía tomado el
puerto 4000 con el backend en una versión vieja del código, sin las rutas nuevas — causaba
`Unexpected token '<'` en la pestaña porque el fetch a `/escalada-relevo` recibía el 404 HTML
de Express en vez de JSON. Se mató el proceso y se confirmó que era solo un resto de sesión
sin cerrar, no un bug del feature.

No se hizo commit/push de este cambio — pendiente de que el Desarrollador lo pida
explícitamente, según la regla estándar del proyecto.

## Actualización — Documento de diseño WhatsApp + agente de IA (en discusión) + inventario de dependencia de proveedor único (2026-07-11)

Dos piezas de trabajo autónomo mientras el Desarrollador estaba ausente, ninguna toca código
de producción:

**`docs/PRD_06_WhatsApp_IA.md` (nuevo).** Documento de diseño para el pendiente #9, marcado
explícitamente **"EN DISCUSIÓN — NO IMPLEMENTAR TODAVÍA"** en su primera línea, a pedido
directo del Desarrollador. Registra lo ya decidido en la conversación (integración directa
con Meta Cloud API, no un BSP; credenciales y número de WhatsApp por prestadora, nunca
compartidos — por motivo operativo y porque Xeitra no debe tener responsabilidad legal
sobre esas conversaciones; extiende la pestaña "Notificaciones" del Módulo 8 en vez de crear
una sección nueva; agente de IA asistiendo en redacción de plantillas, trámite de aprobación
ante Meta, y respuestas entrantes, siempre resguardando la decisión final del licenciatario)
y cuatro puntos marcados explícitamente sin resolver (restricción de plantillas pre-aprobadas
de Meta, límite de autonomía del agente, almacenamiento de credenciales por prestadora,
catálogo inicial de eventos). `docs/PENDIENTES.md` (pendiente #9) y `docs/BUILD_ORDER.md`
(fila de Módulo 6) actualizados con la referencia cruzada.

**Pendiente #15 — inventario de dependencia de proveedor único, investigación completada.**
Revisado el código real (no de memoria): 117 policies RLS (`grep -c "CREATE POLICY"
backend/src/db/*.sql`), uso de Supabase Auth (`supabase.auth.admin.createUser` en varios
archivos) y Storage (`certificado_url`, `docs/DATA_MODEL.md:367`), ausencia de `railway.json`
en el repo (config vive en dashboard + nixpacks), y el middleware de Next.js de
`sitio-web/src/middleware.js` (solo redirección de idioma, sin `next/image` ni Edge Functions
propias de Vercel). Conclusión: Supabase es el único con lock-in técnico real (Auth + Storage
son APIs propias, no solo Postgres — la base en sí migra sin problema por ser RLS estándar);
Railway, Vercel y Gmail SMTP migran con esfuerzo bajo si hiciera falta. Recomendación
entregada: solo vale la pena invertir en un plan de migración documentado para Supabase
Auth/Storage, no en un respaldo activo para el resto. Detalle completo en `docs/PENDIENTES.md`
fila #15, estado cambiado a "🟡 Investigación completa, pendiente de decisión del
Desarrollador" — no se cierra unilateralmente, falta que el Desarrollador decida qué vale la
pena implementar.

## Actualización — Cierre de pendiente #18(1)/#31 (documentos de Asistente configurables) + auditoría de alcance + registro de pendiente #30 (2026-07-14)

Sesión de continuación, sin MCP de Supabase ni de navegador conectados — trabajo de
verificación, auditoría y documentación, sin escribir código nuevo.

**Pendiente #18 candidato (1) / #31 — cerrado por completo.** El código (catálogo
configurable `tipos_documento_asistente`/`documentos_asistente` + plazo de aviso editable
`prestadoras.dias_aviso_vencimiento_documentos`, diseño aprobado en sesión previa) se había
escrito y commiteado en `aa944ac` en una sesión anterior con MCP de Supabase conectado, que
además: aplicó y verificó el SQL contra Supabase real, desplegó (Railway + `vercel --prod`),
probó en el Panel real, y encontró/corrigió un bug real (403 por falta de `prestadora_id` en
el `upsert` de `PerfilTab.jsx`, commit `e9e357d`). Esta sesión terminó de cerrar el registro:
aisló y commiteó la fila final de `docs/PENDIENTES.md` #31 (commit `872be09`, separada de las
filas #28/#29/#30 que no correspondían a esta tarea), y corrigió una regresión de exactitud
en `docs/DATA_MODEL.md` (el texto de esa tabla había vuelto a decir "pendiente de aplicar"
por un efecto colateral de la técnica de aislado de commits de la sesión anterior — corregido
de vuelta a "aplicado y verificado").

**Auditoría de alcance, a pedido explícito del Desarrollador.** Se revisó si la sesión
anterior se había excedido del encargo ("aplicar y verificar el SQL"). Conclusión: no —
commitear/desplegar/probar en navegador y corregir el bug encontrado son parte del protocolo
ya escrito en `CLAUDE.md` (Reglas 9 y 13.1), no una extensión de alcance. Lo que sí se marcó
como una extralimitación real fue de esta misma sesión: editar `docs/DATA_MODEL.md` sin
preguntar primero (corregido en el momento, pero señalado como desvío de la Regla 12.1).

**Pendiente #30 — nuevo, registrado y commiteado (commit `3bda7a0`).** `CLAUDE.md`,
`docs/SECURITY.md` y `docs/PLAN_MULTITENANT_XEITRA.md` tenían, sin commitear, el rediseño de
roles `superadmin` (pasa a ser puramente técnico, acotado a una prestadora de prueba/sandbox)
y `admin_plataforma` (rol nuevo, alcance administrativo de negocio de toda la plataforma, con
el "modo dentro de una prestadora" — banner, timeout 5/60 min, auditoría, MFA), acordado con
el Desarrollador el 2026-07-13. El diseño está cerrado; **la implementación en código no
empezó** (mecanismo de `current_tenant()` dinámico por sesión, `ROLES_PANEL`,
`requiereRolPanel.js`, `rolesGestionables()`, reescritura de policies RLS que hoy usan
`es_superadmin()` como bypass total) — no arrancar esa implementación sin kickoff explícito
del Desarrollador, mismo criterio que rige el resto del multi-tenant.

**Queda sin commitear al cierre de esta sesión** (deliberadamente, fuera del alcance de esta
tarea puntual):
- `backend/src/db/schema_asistentes_canales.sql` y `schema_calificaciones_asistente.sql` —
  ya aplicados y verificados contra Supabase real (pendiente #13, 🟢 Resuelto), pero nunca
  commiteados al repo. No requieren ninguna decisión — es limpieza de git pura, se puede
  commitear en cualquier momento.

## Problemas conocidos / deuda técnica

_Registrar acá bugs conocidos o deuda técnica para la próxima sesión._

- **"Panel — tenant en inserts directos"** (ver `docs/PLAN_MULTITENANT_XEITRA.md` sección
  4.1) — pendiente, programado antes del Bloque 4. `AuthContext.jsx` no expone el
  `prestadora_id` del usuario de panel logueado; 5 componentes insertan directo sin ese
  valor, dependiendo del `DEFAULT` de schema en 8 tablas.

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
- ~~Del PRD_02B quedan deliberadamente afuera de este corte (no bloquean el resto): el
  generador de documentación (PDF de liquidación de cese, función 7 de 9 del PRD).~~
  **Resuelto (2026-07-09)** — ver "Actualización — Función 7 de PRD_02B" arriba.
  `PRD_02B_Gestion_Personal.md` queda con sus 9 funciones completas.
- El diseño visual/formato del certificado (PDF descargable con membrete, etc.) no está
  definido en ningún PRD — el corte actual solo genera el QR como imagen PNG descargable,
  sin un layout de certificado imprimible. Queda para cuando haya spec de diseño.
- ~~documento original de PRD de Reclutamiento (histórico): adoptar su contenido en `PRD_03_Reclutamiento.md`~~
  **Resuelto (2026-07-09)**: se comparó sección por sección contra `PRD_03_Reclutamiento.md`
  existente. La mayoría del contenido ya estaba condensado y corregido de una pasada
  anterior; faltaba solamente la sección de landing page pública (perfiles buscados,
  beneficios, zonas) y quedaba sin corregir un uso de "Cuidadora Domiciliaria" en el catálogo
  de especialidades de la Sección C del formulario. Ambos corregidos directamente en
  `PRD_03_Reclutamiento.md` — ver su nota de cabecera para el detalle completo de las 5
  correcciones aplicadas. Sección 8 del original (comparativa de posicionamiento frente a la competencia) y alianza
  institucional con terceros quedan fuera de alcance (decisión de negocio/marketing).
- ~~TAREA ASIGNADA AL USUARIO — término retirado usado como si fuera público en
  documento fundacional original (histórico, sección 5.3, ejemplo de post de Instagram)~~
  **Resuelto por el usuario (2026-07-09).**
- ~~TAREA ASIGNADA AL USUARIO — conflicto de tipografía entre el documento fundacional original
  ("Arial") y el manual de identidad original (Playfair Display + DM Sans)~~
  **Resuelto por el usuario (2026-07-09).**

## Archivos creados/modificados por sesión

_Una entrada por sesión de trabajo, más reciente primero._

| Fecha | Sesión | Archivos |
|---|---|---|
| 2026-07-24 | **Fase 12 del plan de rediseño de frontend — Maquetación general del Panel, primer corte (Dashboard + Asistentes + Familias)**, construida completa y verificada en navegador real (ver `docs/PENDIENTES.md` #83 para el detalle completo). Alcance decidido explícitamente por el Desarrollador vía `AskUserQuestion` antes de programar: Dashboard+Asistentes+Familias en este corte, Guardias diferida; formato tarjeta por fila elegido por el Desarrollador sobre la opción de menor riesgo recomendada. `Dashboard.jsx` agrupa las métricas en 2 secciones con encabezado (`dashboard-seccion*` nuevas en `index.css`). `Asistentes.jsx`/`Familias.jsx` pasan de tabla a grilla de tarjetas (`lista-tarjetas`/`lista-tarjeta` nuevas). Sin cambios a paleta/tipografía de `DESIGN_SYSTEM.md`. Verificado con Playwright contra Prestadora Demo en local (dev server): 38 tarjetas de Asistentes y 17 de Familias con datos reales, Dashboard confirmado en los 3 locales. `npm run build`/`npm run lint` (oxlint) del Panel limpios. **Sigue pendiente**: commit + push + deploy explícito a Vercel del Panel | `panel/src/pages/Dashboard.jsx` (secciones con encabezado), `panel/src/pages/Asistentes.jsx` (tarjetas), `panel/src/pages/Familias.jsx` (tarjetas), `panel/src/index.css` (`.dashboard-seccion*`, `.lista-tarjeta*`), `panel/src/i18n/translations.js` (claves de sección del Dashboard × 3 locales), `docs/PENDIENTES.md` (#83 nuevo), `docs/PROGRESS.md` (esta entrada) |
| 2026-07-23 | **Fase 11 del plan de rediseño de frontend — WhatsApp reforzado para alertas críticas**, construida completa y verificada en producción real (ver `docs/PENDIENTES.md` #82 para el detalle completo y el recorte de alcance no re-confirmado con el Desarrollador). Migración `schema_whatsapp_familia_asistente_01.sql` (columna `notificar_familia` en `configuracion_notificaciones` + siembra de filas de configuración para las prestadoras reales, antes inexistentes, en `alerta_temprana_guardia`/`incidente_relevo_sin_resolver`/el evento nuevo `aviso_rutina_asistente`), aplicada contra Supabase real. `enviarPush()` (`backend/src/utils/push.js`) ahora devuelve `true`/`false` según si al menos una suscripción tuvo éxito, sin romper a ningún llamador existente. Dos patrones de WhatsApp según el plan: avisos de rutina a la Asistente solo por push con WhatsApp de respaldo si el push falla (`revisarRecordatoriosPush.js`); alerta crítica de "Ausente sin relevo previo" con push + WhatsApp simultáneos a la Familia (`revisarNotificacionesCoordinador.js`), condicionado al toggle `notificar_familia` por Prestadora (apagado por defecto, decisión de cada Prestadora — CLAUDE.md §2). Columna y checkbox condicional nuevos en la pestaña Notificaciones de `Configuracion.jsx`, i18n completo es-AR/en/pt-BR. Verificado con Playwright contra el Panel y Supabase reales en producción: los 3 locales, guardado real de `notificar_familia=true` confirmado por API y revertido a `false` al cerrar. `npm run build` del panel limpio | `backend/src/db/schema_whatsapp_familia_asistente_01.sql` (nuevo, aplicado), `backend/src/utils/email.js` (`configuracionEvento` extendido), `backend/src/utils/push.js` (`enviarPush` devuelve boolean), `backend/src/utils/revisarRecordatoriosPush.js` (respaldo WhatsApp condicional), `backend/src/utils/revisarNotificacionesCoordinador.js` (`notificarFamiliaSiCorresponde`), `backend/src/routes/panelConfiguracion.js` (`PATCH /notificaciones/:evento` extendido), `panel/src/pages/Configuracion.jsx` (columna/checkbox nuevos), `panel/src/i18n/translations.js` (claves nuevas × 3 locales), `CLAUDE.md` (regla nueva "Estado real por encima del documentado"), `docs/claude_history.md` (entrada nueva), `docs/PENDIENTES.md` (#82 nuevo), `docs/PROGRESS.md` (esta entrada) |
| 2026-07-22 | **Fase 8 del plan de rediseño de frontend — Onboarding diferenciado por rol para Prestadora nueva**, construida completa y verificada en navegador real. Checklist de 3 pasos en orden fijo (cargar primer Asistente → cargar primera Familia → invitar a otro usuario del equipo, nunca invitar como paso 1) en `Dashboard.jsx`, derivado en vivo de datos ya cargados (conteo de `asistentes`/`familias` y, para el paso de equipo, el endpoint ya existente `GET /api/panel/usuarios` reutilizado vía un helper cliente nuevo `obtenerUsuariosEquipo()` — sin endpoint backend nuevo, Regla 12) en vez de una tabla de seguimiento nueva. Dos variantes por rol: completa con botón por paso para Admin_prestadora/superadmin; informativa (solo badge "Completado" o nada, sin CTA) para Admin_plataforma operando dentro de una Prestadora (`sesion !== null` de `TenantSessionContext`) — oculta por completo si Admin_plataforma no tiene sesión de tenant activa, evitando además el 400 real que devuelve `panelUsuarios.js` en ese caso. El checklist se autooculta (sin botón de descarte manual) apenas se completan los 3 pasos, para que un estado real incompleto nunca pueda ocultarse por acción del usuario. Patrón visual (fracción "X/Y completados" + barra de progreso horizontal) inspirado en la referencia de Wix que dejó el Desarrollador, pero con la paleta y componentes propios de `docs/DESIGN_SYSTEM.md`, no su identidad visual. **Estados vacíos con CTA único**: `EstadoLista.jsx` extendido con una prop opcional nueva `accionVacio` (retrocompatible, sin tocar ningún otro llamador existente) + `mensajeVacio` específico; aplicado en `Asistentes.jsx` y `Familias.jsx` reutilizando el mismo botón/handler que ya abre `NuevoAsistenteModal`/`NuevaFamiliaModal`, reemplazando el "No hay resultados" genérico. i18n × 3 locales completo (namespace `onboarding` nuevo + `vacio_texto` en `asistentes`/`familias`). `npm run lint`/`npm run build` del panel limpios. Verificado en navegador real con Playwright contra la Prestadora Demo real (`aurevia.test.acount@gmail.com`): con datos ya cargados (38 Asistentes, 17 Familias) el checklist correctamente no se muestra (los 3 pasos ya están completos, comportamiento de autoocultamiento confirmado), Dashboard/Asistentes cargan sin errores de consola nuevos. **Verificación no realizada**: no se pudo entrar a la Organización Sandbox (la cuenta `superadmin` registrada en `No hacer commit/claves y contraseñas.txt` devolvió "Email o contraseña incorrectos" — credencial desactualizada, no corregida en esta sesión) para ver el checklist en un estado realmente vacío ni los nuevos CTA de estado vacío en pantalla — el comportamiento se validó por lectura de código + build limpio + autoocultamiento confirmado en el caso con datos, no por observación visual directa del estado vacío | `panel/src/pages/Dashboard.jsx` (`OnboardingChecklist` nuevo, `obtenerUsuariosEquipo()`, estado de equipo), `panel/src/components/layout/EstadoLista.jsx` (`accionVacio` nuevo), `panel/src/pages/Asistentes.jsx`, `panel/src/pages/Familias.jsx` (CTA de estado vacío), `panel/src/i18n/translations.js` (namespace `onboarding` + `vacio_texto` × 3 locales), `panel/src/index.css` (`.onboarding-checklist*`, `.estado-vacio-bloque`), `docs/PROGRESS.md` (esta entrada) |
| 2026-07-22 | **Fase 7 del plan de rediseño de frontend — Panel de Admin_plataforma: estado de pago, uso y riesgo por Prestadora**, construida completa (backend + frontend + i18n) y verificada de punta a punta en navegador real con Playwright. **Backend** (`panelAdminPlataforma.js`): `GET /tenants` extendido con `estadoPago`/`riesgo`/`uso` por licenciataria; endpoint nuevo `GET /tenants/:id/plan-preview/:planId` que calcula módulos ganados/perdidos comparando los módulos activos actuales contra los del plan destino (vía `modulosDePlan`), traducidos a nombre humano por `catalogo_modulos`; endpoint nuevo `PATCH /tenants/:id/plan` que aplica el cambio real: cierra la fila vigente de `prestadora_planes` (`vigente_hasta = hoy`, nunca edita en el lugar — mismo principio de "siempre a la fecha del hecho" de CLAUDE.md §3), inserta la nueva fila vigente, y sincroniza `prestadora_modulos` activando los módulos `origen='plan'` del plan nuevo y desactivando los `origen='plan'` que ya no están, sin tocar nunca los módulos `origen='addon'`. **Frontend** (`AdminPlataforma.jsx`): columna nueva "Pago" en la tabla de Licenciatarias (reutiliza las clases `.badge-vigente`/`.badge-vencido` ya existentes — Regla 12); modal de detalle renombrado a `TenantDetalleModal` con alerta de riesgo condicional, sección "Uso real" (reutiliza `.panel-kpi-card`/`.panel-kpis`), y flujo nuevo "Cambiar de plan" (selector de plan → "Ver cambios" con preview de ganadas/perdidas → "Confirmar cambio de plan" gateado por `useConfirmarDestructivo` ya existente, cumpliendo Regla 4 de confirmación destructiva). CSS nuevo mínimo (`.panel-form-fila`, `.panel-plan-preview`) reutilizando tokens existentes (`var(--fondo-alt)`, `8px` de radio). i18n × 3 locales completo. `npm run lint`/`npm run build` limpios (sin errores nuevos). **Verificación en navegador real** contra la Prestadora Demo, con una cuenta de prueba `admin_plataforma` creada y borrada para la ocasión (script reutilizable `backend/scripts/seed_test_admin_plataforma.js`) y datos comerciales de prueba insertados y borrados vía Supabase MCP (2 planes ficticios, asignación de módulos, 1 factura vencida — las 5 tablas comerciales reales estaban en 0 filas, ver más abajo): badge "Vencido"/"Al día" correcto en la tabla, alerta de riesgo visible, KPIs de uso real (44 Asistentes/18 Pacientes/2 usuarios de Panel), preview de cambio de plan mostrando ganadas "Verificación de Guardias, Facturación y pagos" correctamente, diálogo nativo de confirmación manejado y aceptado, tras confirmar el cambio los módulos `evv` y `facturacion` quedaron activados como `origen='plan'` sin tocar el módulo `comunicacion` preexistente (`origen='addon'`) — sincronización de módulos verificada con datos reales, no solo lógica de código. 0 errores de consola nuevos en toda la verificación. Toda la data de prueba (SQL y la cuenta de test) fue borrada al terminar, con verificación de conteo en `0` filas — la base de producción quedó exactamente como estaba antes de verificar. **Hallazgo real, no hipotético, documentado en pendiente #79**: las tablas `planes`/`plan_modulos`/`prestadora_planes`/`prestadora_modulos`/`facturas_licencia` están en `0` filas en producción — no existe todavía un catálogo real de planes cargado, así que la funcionalidad de esta fase, aunque construida y verificada, no es utilizable por un Admin_plataforma real hasta que el Desarrollador defina y cargue los planes reales (decisión de negocio, no de código). **Sigue pendiente**: commit + push + deploy explícito a Vercel de `panel` (el backend se redespliega solo en Railway al hacer push a `main`) | `backend/src/routes/panelAdminPlataforma.js` (`GET /tenants` extendido, `GET /tenants/:id/plan-preview/:planId` nuevo, `PATCH /tenants/:id/plan` nuevo), `panel/src/pages/AdminPlataforma.jsx` (columna "Pago", `TenantDetalleModal` reescrito con Uso/riesgo/Cambiar de plan), `panel/src/i18n/translations.js` (claves nuevas × 3 locales), `panel/src/index.css` (`.panel-form-fila`, `.panel-plan-preview`), `docs/PENDIENTES.md` (pendiente #79 nuevo), `docs/PROGRESS.md` (esta entrada) |
| 2026-07-22 | **Fase 6 del plan de rediseño de frontend — Estado de Hospitalización y causales de Cese de servicio**, construida completa (código + schema aplicado contra Supabase real), **verificación en navegador y cierre de sesión (commit/push/deploy) todavía pendientes** — ver detalle en pendiente #78 de `docs/PENDIENTES.md`. Diseño acordado con el Desarrollador: "Servicio" es la sumatoria de todas las prestaciones que se brindan a un grupo familiar, nunca cruza Familias (distinto de "Residencia", explícitamente diferido, pendiente #77); una Hospitalización pausa reversiblemente las guardias/series del Paciente internado (nuevo estado `'pausada'`, distinto de `'cancelada'`); el Coordinador debe avisar verbalmente al Asistente antes de que un cierre de servicio dispare aviso automático por push+WhatsApp, como señal de respeto. Retención por jurisdicción también diferida (pendiente #76) | `backend/src/db/schema_servicios.sql` (nuevo — entidad `servicios` + `servicio_id` opcional en `prestaciones`/`guardias`/`facturas_familia_items` + trigger `validar_servicio_misma_familia`), `backend/src/db/schema_hospitalizacion_paciente.sql` (nuevo — `hospitalizaciones_paciente`, estado `'pausada'` en `guardias`/`series_guardias`, `alertas_contingencia_hospitalizacion`), `backend/src/db/schema_aviso_cese_asistente.sql` (nuevo — `configuracion_aviso_cese_asistente`, `cierre_servicio_asistentes`), `backend/src/utils/avisoAutomaticoCese.js` (nuevo — cron de aviso automático tras vencer el plazo de aviso verbal), `backend/src/server.js` (registro del cron nuevo), `panel/src/pages/familias/PrestacionesPaciente.jsx` (alta/cierre de Hospitalización, lista de alertas de contingencia, lista de Asistentes a avisar con marcar-avisado-verbalmente, inserción en `cierre_servicio_asistentes` al cerrar servicio), `panel/src/pages/Configuracion.jsx` (`TabAvisoCese` — plazo de aviso configurable por Prestadora), `panel/src/i18n/translations.js` (claves nuevas en es-AR/en/pt-BR, paridad verificada por grep) |
| 2026-07-22 | **Verificación en navegador real de la Fase 5 — Círculo de cuidado (PWA Familias)**, continuación de la entrada de más abajo de esta misma fecha, que había quedado con la verificación pendiente. Backend (`node --watch`), `panel` y `pwa-familias` corridos en local contra la Prestadora Demo real (`aurevia.test.acount@gmail.com`, `prestadora_id=4e84b0e7-1729-4d07-9e70-56fdbd54cd89`), navegados con Playwright. **2 hallazgos reales durante la verificación** (no hipotéticos, ambos con impacto real si no se corregían): **(1) bug — 500 real** en `GET /api/panel/cuentas/familia/:id/circulo`: `miembros_familia` tiene dos foreign keys hacia `usuarios` (`usuario_id_fkey` y `creado_por_fkey`, confirmado con `pg_constraint`), y el embed `usuarios(nombre)` de PostgREST queda ambiguo entre ambas — reproducido primero en el navegador (sección "Círculo de cuidado" mostraba el estado de error en vez de vacío), confirmado con SQL directo, corregido en `backend/src/routes/panelCuentas.js:272` a `usuarios!miembros_familia_usuario_id_fkey(nombre)`, reverificado en el navegador (pasó a mostrar el estado vacío correctamente). **(2) gap real preexistente, no introducido por esta fase** (nuevo pendiente #75 en `docs/PENDIENTES.md`): no existe ningún flujo de "primera contraseña" para cuentas creadas por el Panel sin login propio previo — `crearCuentaConPerfil` genera un `passwordTemporal` que hoy no se comunica a nadie por ningún canal (el propio comentario de `cuentasPanel.js:12-19` ya lo daba por aceptable "porque esa PWA no existe todavía", pero PWA Familias ya está en producción). Afecta a toda Familia/Asistente/miembro de círculo creado desde el Panel, no es específico de esta fase, pero se detectó acá porque bloqueaba poder loguearse como el miembro invitado para seguir verificando — resuelto *solo para esta verificación* fijando una contraseña de prueba directamente vía Admin API de Supabase con la service role key ya presente en `backend/.env` (nunca expuesta en logs/URLs/consola), sin tocar el mecanismo de producción. Con el fix del 500 aplicado, verificado de punta a punta con 2 Familias reales distintas de la Prestadora Demo (para cubrir un caso sin guardia asignada y un caso con guardia+Asistente reales): invitar desde el Panel (modal, alta real en `miembros_familia`, tabla pasa de vacío a listo con nombre/email/rol correctos); login como el miembro invitado en `pwa-familias` con la contraseña fijada; "Mis Pacientes" muestra los mismos Pacientes que el titular; "Mi Perfil" muestra "Solo lectura (invitado al círculo de cuidado)"; el Paciente con guardia real (DEMO — Rosa Villalba, Asistente DEMO — Gabriela Pérez) muestra guardia en curso, reportes y alertas igual que al titular; en "Asistente Asignado" el formulario de calificación no se renderiza y se muestra el mensaje de solo lectura; **llamada directa al endpoint de calificar con el token de esa cuenta devuelve 403 real** (`{"error":"Tu acceso es de solo lectura"}`), confirmando que el gating no depende solo del frontend; **llamada directa pidiendo el Paciente de la otra Familia con ese mismo token devuelve 404 real**, confirmando aislamiento cruzado también a nivel de círculo; revocar el acceso desde el Panel vuelve la tabla a estado vacío, y una llamada posterior con el token ya revocado devuelve **401 real** (`borrarCuenta` elimina la cuenta de Supabase Auth, no solo la fila de `miembros_familia`). 0 errores de consola nuevos en ninguna de las navegaciones. Datos de prueba (2 miembros de círculo temporales, emails `+circulotest`/`+circulovillalba`) revocados y verificados en `0` filas de `miembros_familia` al cerrar la verificación — no quedaron datos de prueba en la base real. **Sigue pendiente**: commit + push (incluye el fix del 500) y deploy explícito a Vercel de `panel`/`pwa-familias` | `backend/src/routes/panelCuentas.js:272` (fix del embed ambiguo), `docs/PENDIENTES.md` (pendiente #74 actualizado con el resultado real, pendiente #75 nuevo para el gap de primera contraseña), `docs/PROGRESS.md` (esta entrada) |
| 2026-07-22 | **Fase 5 del plan de rediseño de frontend (`C:\Users\Usuario\.claude\plans\distributed-scribbling-wirth.md`) — Círculo de cuidado (PWA Familias), aprobada explícitamente por el Desarrollador ("si") y aplicada contra Supabase real.** Antes de programar se relevaron las 13 políticas de RLS que comparaban `familia_id = auth.uid()` en forma directa (4 archivos SQL) más `familia_ve_su_propia_fila` en `schema_etapa2c.sql`, todas asumiendo que el usuario logueado ES la fila de `familias` — sin ningún concepto de un tercero con acceso a la misma Familia. **DB (`backend/src/db/schema_circulo_cuidado.sql`, aplicado contra Supabase real vía MCP):** tabla nueva `miembros_familia` (`usuario_id`→`usuarios`, `familia_id`→`familias`, `email` denormalizado para mostrar en el Panel sin llamada extra a Auth admin, `rol` fijo `'solo_lectura'` — único rol que existe hoy, no se diseñaron roles hipotéticos sin caso de uso) con RLS propia (el propio miembro lee su fila; admin/coordinador de la Prestadora gestionan vía el permiso ya existente `'editar_datos_familia'`, reutilizado en vez de crear uno nuevo — Regla 12); función `familia_id_de_usuario(p_usuario_id)` SECURITY DEFINER (mismo patrón que `zonas_de_asistente()`, único punto de verdad para "¿a qué Familia pertenece este usuario?", sea titular o invitado) que reemplaza el `auth.uid()` directo en las 9 políticas reescritas (`familia_ve_su_propia_fila`, `familia_ve_sus_pacientes`, `familia_ve_guardias_de_sus_pacientes`, `familia_ve_asistente_asignado`, `familia_ve_certificado_asistente_asignado`, `familia_ve_reportes_de_sus_pacientes`, `familia_ve_alertas_de_sus_pacientes`, `familia_gestiona_sus_calificaciones`, `familia_ve_sus_facturas`, `familia_ve_items_de_sus_facturas`) — las políticas de `push_subscriptions` quedaron sin tocar a propósito, cada miembro gestiona su propia suscripción del dispositivo, no la del titular. **Backend:** `requiereRolFamilia.js` ahora resuelve `familiaId`/`rolCirculo` (titular vía `familias`, o invitado vía `miembros_familia`) una sola vez, en vez de que cada ruta asuma `usuarioFamilia.id === familia_id`; `appFamilias.js` actualizado en los call-sites reales (`.id`→`.familiaId`), 403 explícito en `POST /guardias/:guardiaId/calificar` cuando `rolCirculo === 'solo_lectura'` (única acción de escritura real hoy expuesta a Familia en la PWA — se descartó gatear "edición de contacto" porque `MiPerfil.jsx` no tiene esa función, evitando construir UI para algo que no existe); `cuentasPanel.js` suma `invitarMiembroCirculo`/`revocarMiembroCirculo` reutilizando `crearCuentaConPerfil`/`borrarCuenta` sin duplicar lógica de alta/baja de cuenta; `panelCuentas.js` suma 3 rutas (`GET`/`POST`/`DELETE` de `/familia/:familiaId/circulo`) gateadas por el mismo permiso `'editar_datos_familia'`. **Panel:** sección nueva "Círculo de cuidado" en `FamiliaDetalle.jsx` (4 estados, tabla de miembros, botón "Quitar acceso" con `useConfirmarDestructivo` ya existente — mismo mecanismo de confirmación destructiva que el resto del Panel) + `InvitarCirculoModal.jsx` nuevo, mismo patrón de `fetch`+Bearer token que `NuevaFamiliaModal.jsx`. **PWA Familias:** `MiPerfil.jsx` muestra el rol (`titular`/`solo lectura`); `AsistenteAsignado.jsx` oculta el formulario de calificación y muestra mensaje de solo lectura cuando corresponde. i18n × 3 locales en ambas apps. `npm run build` de las 3 apps limpio. **Pendiente de verificación en navegador real** (no se hizo en esta sesión): probar de punta a punta con Playwright contra Sandbox — invitar un miembro, loguearse como ese miembro, confirmar que ve lo mismo que el titular y no puede calificar, quitar el acceso y confirmar que ya no puede entrar | `backend/src/db/schema_circulo_cuidado.sql` (nuevo, aplicado), `backend/src/middleware/requiereRolFamilia.js`, `backend/src/routes/appFamilias.js`, `backend/src/utils/cuentasPanel.js`, `backend/src/routes/panelCuentas.js`, `panel/src/pages/familias/FamiliaDetalle.jsx`, `panel/src/pages/familias/InvitarCirculoModal.jsx` (nuevo), `panel/src/i18n/translations.js` (`familias.circulo.*` × 3 locales), `pwa-familias/src/pages/MiPerfil.jsx`, `pwa-familias/src/pages/AsistenteAsignado.jsx`, `pwa-familias/src/i18n/translations.js` (`perfil.rol_*`/`asistente.calificar_solo_lectura` × 3 locales), `docs/PROGRESS.md` (esta entrada) |
| 2026-07-22 | **Fase 4 del plan de rediseño de frontend (`C:\Users\Usuario\.claude\plans\distributed-scribbling-wirth.md`) — Accesibilidad base (WCAG 2.1/2.2 AA), aprobada explícitamente por el Desarrollador y verificada en navegador contra Sandbox real.** Cuatro sub-puntos, todos completos. **(A) Contraste**: auditoría matemática (OKLCH→sRGB lineal→luminancia relativa→ratio de contraste, sin librerías, dos scripts descartables en el scratchpad) de la paleta real de `docs/DESIGN_SYSTEM.md` contra 4.5:1 sobre blanco — `--azul-medio` (3.22:1), `--verde-exito` (4.46:1) y `--naranja-alerta` (3.74:1) no llegaban al mínimo cuando pintan texto (los usos como borde/fondo/acento grande sí pasan el 3:1 que corresponde ahí, no se tocaron). Se agregaron 3 variables nuevas "-texto" (mismo tono/croma, más oscuras, calculadas por búsqueda binaria hasta tocar exactamente 4.5:1: `--azul-medio-texto`, `--verde-exito-texto`, `--naranja-alerta-texto`; `--rojo-peligro` no necesitó variante, ya daba 4.61:1) en los 3 `variables.css` y documentadas en `DESIGN_SYSTEM.md`, y se reemplazó el uso como color de texto (nunca como borde/fondo) en los 3 `index.css` — incluida `.metrica-card-alerta .metrica-valor`, la clase agregada en el propio commit de la Fase 3 que ya se había marcado como sospechosa. **(B) Targets táctiles**: `.btn` (los 3 `index.css`) y `.app-nav-inferior a` (las 2 PWA) llevados a mínimo 44×44px reales vía `min-height`/`min-width`+flex, sin cambiar el padding visual existente. **(C) Alternativa de teclado al arrastre en Guardias (WCAG 2.5.7)**: se encontró que el chip de `GuardiasGrid.jsx` era un `<div>` sin `tabIndex` — el drag-and-drop no solo no tenía alternativa, la propia apertura del modal de detalle era mouse-only; corregido con `role="button"`/`tabIndex={0}`/`onKeyDown` (Enter/Espacio) + `:focus-visible`, y se agregó una sección nueva "Reasignar guardia" (select de Asistente + fecha + botón, deshabilitado hasta completar ambos) dentro del modal `GuardiaAcciones.jsx` ya existente, reutilizando el `handleReasignar` que ya manejaba el cierre de incidentes de "ausente" — 5 claves i18n nuevas × 3 locales. **(D) Alt-text de íconos**: 9 flechas "←" decorativas envueltas en `aria-hidden` (redundantes con el texto visible, no violación dura) y 1 violación real encontrada y corregida — el `'✓'` suelto de `VinculoCeseTab.jsx` para `revisado_por_abogado`, sin ningún texto alternativo, reemplazado por un badge de texto simétrico al de la rama `false` ya existente; también se envolvieron en `aria-hidden` los `✓` decorativos de confirmación de guardado en `Configuracion.jsx` (6 usos), `PerfilTab.jsx` y `FamiliaDetalle.jsx`. Nota explícita: la aplicabilidad de la Ley 26.653 al software queda fuera de esta fase (pregunta legal, no de código), tal como fijó el plan. `npm run build` de las 3 apps limpio. Verificado en navegador real con Playwright contra Sandbox (Prestadora Demo): Dashboard con datos reales sin regresión, chip de guardia abre el modal por click (semántica `role="button"` confirmada en el árbol de accesibilidad), reasignación real de "DEMO — Adriana Díaz" → "DEMO — Silvia Fernández" ejecutada de punta a punta (la guardia se movió de fila en la grilla, mismo paciente/horario, modal cerrado solo), 0 errores de consola en las 2 navegaciones y las 2 interacciones probadas | `panel/src/styles/variables.css`, `pwa-familias/src/styles/variables.css`, `pwa-asistentes/src/styles/variables.css` (3 variables `-texto` nuevas c/u), `docs/DESIGN_SYSTEM.md` (documentación de las variables nuevas), `panel/src/index.css`/`pwa-asistentes/src/index.css`/`pwa-familias/src/index.css` (uso de `-texto` donde pinta texto, `.btn` con mínimo 44×44px, `:focus-visible` del chip), `pwa-asistentes/src/index.css`/`pwa-familias/src/index.css` (`.app-nav-inferior a` con mínimo 44×44px), `panel/src/pages/guardias/GuardiasGrid.jsx` (chip con `role="button"`/teclado), `panel/src/pages/Guardias.jsx` (estado `asistentes`, prop nueva al modal), `panel/src/pages/guardias/GuardiaAcciones.jsx` (sección "Reasignar guardia" nueva), `panel/src/i18n/translations.js` (`guardias.detalle.reasignar_*` + `guardias.abrir_detalle_para` × 3 locales), 9 archivos con flechas `←` envueltas en `aria-hidden` (`pwa-familias/src/pages/{Reportes,ReporteDetalle,AsistenteAsignado,EscanearAsistente,Alertas}.jsx`, `pwa-asistentes/src/pages/{ReporteDiario,GuardiaActiva}.jsx`, `panel/src/pages/asistentes/AsistenteDetalle.jsx`, `panel/src/pages/familias/FamiliaDetalle.jsx`), `panel/src/pages/asistentes/VinculoCeseTab.jsx` (badge de texto en vez de `'✓'` suelto), `panel/src/pages/Configuracion.jsx`/`panel/src/pages/asistentes/PerfilTab.jsx`/`panel/src/pages/familias/FamiliaDetalle.jsx` (`✓` decorativo envuelto en `aria-hidden`), `docs/PROGRESS.md` (esta entrada) |
| 2026-07-22 | **Fase 3 del plan de rediseño de frontend (`C:\Users\Usuario\.claude\plans\distributed-scribbling-wirth.md`) — Semáforo de estado unificado (Guardias).** Antes de programar se verificó contra el código real que la parte de "semáforo de color" que proponía el plan ya estaba construida y ya era consistente entre Panel/PWA Asistentes/PWA Familias (mismas clases `guardia-programada`/`guardia-activa`/`guardia-completada`/`guardia-cancelada`/`guardia-ausente` con los mismos colores en los 3 `index.css`, consumidas igual por `GuardiasGrid.jsx`, `MisGuardias.jsx` y `PacienteDetalle.jsx`) — no hizo falta tocar nada ahí. Lo único real de la fase, aprobado explícitamente con el Desarrollador antes de programar, fueron 2 widgets nuevos en `panel/src/pages/Dashboard.jsx`: "Ausentes sin relevo previo" (cuenta `incidentes_relevo` sin resolver y sin `guardia_saliente_id`, o sea sin relevo previo — mismo criterio que ya usa `Continuidad.jsx` para el badge homónimo) y "Documentación por vencer" (cuenta `documentos_asistente` con `fecha_vencimiento` dentro del plazo configurable por Prestadora, mismo cálculo que ya usa el cron `backend/src/utils/vencimientos.js`). El tercer widget que proponía el plan original, "Guardias sin cubrir hoy", se descartó explícitamente con acuerdo del Desarrollador: `guardias.asistente_id` es `NOT NULL`, no existe el concepto de guardia sin asignar en el modelo de datos — el caso real equivalente ya es "ausente sin relevo previo", así que no se duplicó el widget. **Hallazgo real durante la implementación**: la tabla `prestadoras` tiene RLS exclusiva de `superadmin`/`admin_plataforma` (sin policy para `admin_prestadora`/`coordinador`) — el plazo de aviso (`dias_aviso_vencimiento_documentos`) no se puede leer con una consulta directa del cliente como se había armado en el primer borrador; corregido usando el endpoint backend ya existente `GET /api/panel/configuracion/documentos-tipo` (service role key), que a su vez requiere rol admin+ (`requiereAdminOSuperior`) — para `coordinador`, que no tiene acceso a ese endpoint, el widget usa el mismo default de 30 días que ya usa el cron cuando no hay valor configurado (`schema_documentos_asistente.sql:82`), nunca un valor inventado nuevo. Ambos widgets con sus 4 estados (loading/error vía `EstadoLista` con botón "Reintentar" funcional/listo — vacío no aplica, 0 es un valor válido a mostrar, mismo criterio que las métricas existentes del Dashboard), enlazados a `/continuidad` y `/asistentes` respectivamente, con estilo de alerta (borde/color naranja `--naranja-alerta`, clase `.metrica-card-alerta` nueva) cuando el conteo es mayor a 0. `npm run build` del panel limpio. Verificado en navegador real con Playwright contra Sandbox real (backend y panel corriendo en local, cuenta de prueba `aurevia.test.acount@gmail.com`): los 2 widgets cargaron con datos reales (1 ausente sin relevo, 64 documentos por vencer), estilo de alerta visible, click en el widget de ausentes navegó correctamente a `/continuidad`, 0 errores de consola nuevos (los 5 preexistentes son de refresh token y un endpoint público sin ruta en local, no relacionados) | `panel/src/pages/Dashboard.jsx` (2 widgets nuevos), `panel/src/index.css` (`.metrica-card-alerta`), `panel/src/i18n/translations.js` (`ausentes_sin_relevo`/`documentacion_por_vencer` × 3 locales), `docs/PROGRESS.md` (esta entrada) |
| 2026-07-22 | **Etapa 6 (Escaneo de Asistente por QR) — construida y verificada de punta a punta contra Supabase real, cerrando el rediseño aprobado el 2026-07-21 (pantalla dentro de `pwa-familias`, autenticada, en vez de la página pública sin login del diseño original — ver `docs/claude_history.md`).** Continuación autónoma bajo instrucción permanente del Desarrollador de completar todas las etapas de `docs/BUILD_ORDER.md`. Backend: endpoint nuevo `GET /api/app-familias/pacientes/:id/verificar-asistente/:qrToken` en `appFamilias.js` — busca el Asistente por `qr_token` acotado a la misma `prestadora_id` del Paciente, busca la guardia de HOY de ese Paciente (`hoyISO`), y devuelve si el Asistente escaneado coincide con el asignado (`motivo`: `asignado` / `no_asignado` / `sin_guardia_hoy`, más 404 si el `qr_token` no existe), incluyendo estado del certificado activo del Asistente. Frontend `pwa-familias`: pantalla nueva `EscanearAsistente.jsx` con cámara real vía `html5-qrcode` (paquete nuevo, clase `Html5Qrcode` de bajo nivel, no el widget autorenderizado) cubriendo 5 estados (pidiendo permiso / escaneando / verificando / error / resultado), ruta nueva `pacientes/:id/escanear-asistente` en `App.jsx`, botón nuevo en `AsistenteAsignado.jsx`, método nuevo `verificarAsistente` en `lib/api.js`, bloque `escaneo` + clave `asistente.escanear_boton` nuevos en las 3 locales de i18n (incluye disclaimer explícito de qué verifica y qué no la pantalla). **Bug real encontrado y corregido antes de que llegara a producción**: `panel/src/pages/asistentes/CertificadoTab.jsx` todavía generaba el QR codificando una URL pública (`${siteUrl}/asistente/${qr_token}`) que ya no existe con el rediseño — corregido para codificar el `qr_token` crudo directamente, quitando la dependencia de `useEmpresa`/`siteUrl` (y la variable `VITE_SITE_URL`, ya sin uso, retirada de `panel/.env.example`); sin este fix el escáner nuevo habría recibido una URL en vez del token y el matching habría fallado siempre. Verificación real con script de regresión nuevo `backend/scripts/test_pendiente_73_escanear_asistente.mjs` (queda en el repo, mismo patrón que `test_pendiente_36.mjs`) contra la prestadora Sandbox real: seedea 1 familia + 2 Asistentes + 2 Pacientes + 1 guardia de hoy, y confirma los 4 casos posibles vía HTTP real contra el backend local — los 4 dieron el resultado esperado (asignado→`coincide=true`, sin asignar→`coincide=false`, paciente sin guardia hoy→`sin_guardia_hoy`, `qr_token` inexistente→404) — y confirma cero filas residuales tras la limpieza. Verificación adicional en navegador real con Playwright MCP reutilizando una sesión ya autenticada de la Prestadora Demo (Familia): la pantalla carga y pide permiso de cámara correctamente. **Límite de verificación reconocido explícitamente** (Principio de certeza, `CLAUDE.md` §12): el entorno headless de Playwright no tiene cámara real ni virtual, así que `getUserMedia` quedó colgado en "pidiendo permiso" sin resolver — los estados de error de permiso denegado y de resultado del escaneo no se ejercitaron de forma independiente en navegador real, aunque sí quedan cubiertos indirectamente por el contrato JSON ya verificado del endpoint que esa pantalla consume directamente (registrado también en `docs/PENDIENTES.md`, pendiente #73, 🟢 Resuelto con esta salvedad). `npm run build` de `pwa-familias` limpio. Con esto, las 6 etapas de `docs/BUILD_ORDER.md` quedan construidas | `backend/src/routes/appFamilias.js` (endpoint nuevo `/pacientes/:id/verificar-asistente/:qrToken`), `backend/scripts/test_pendiente_73_escanear_asistente.mjs` (nuevo, script de regresión), `pwa-familias/src/pages/EscanearAsistente.jsx` (nuevo), `pwa-familias/src/App.jsx` (ruta nueva), `pwa-familias/src/pages/AsistenteAsignado.jsx` (botón nuevo), `pwa-familias/src/lib/api.js` (método `verificarAsistente`), `pwa-familias/src/i18n/translations.js` (bloque `escaneo` + clave `asistente.escanear_boton` × 3 locales), `pwa-familias/package.json`/`package-lock.json` (dependencia `html5-qrcode`), `panel/src/pages/asistentes/CertificadoTab.jsx` (fix: QR codifica el `qr_token` crudo, ya no una URL pública), `panel/src/i18n/translations.js` (texto actualizado de `asistentes.certificado.nota_pagina_publica` × 3 locales), `panel/.env.example` (retirada `VITE_SITE_URL`, ya sin uso), `docs/BUILD_ORDER.md` (Etapa 6 marcada 🟢 Completo), `docs/PENDIENTES.md` (pendiente #73 🟢 Resuelto), `docs/PROGRESS.md` (esta entrada) |
| 2026-07-21 | **Etapa 4 (PWA Familias) — backend y las 7 pantallas del frontend construidas y verificadas de punta a punta con Playwright contra Supabase real.** Continuación autónoma bajo instrucción permanente del Desarrollador de completar todas las etapas de `docs/BUILD_ORDER.md`. Backend: middleware `backend/src/middleware/requiereRolFamilia.js`, generalización de `push.js` para servir tanto a Asistentes como a Familias, rutas nuevas `backend/src/routes/appFamilias.js` (perfil, mis pacientes, detalle de paciente con guardia activa/próxima y alertas activas, reportes del paciente, alertas del paciente, calificar al Asistente, y la ruta nueva `GET /pacientes/:id/asistente` agregada durante esta sesión — no existía antes, hacía falta para certificado/evaluaciones/`guardiaId` que ninguna otra ruta exponía), `backend/src/utils/alertasIA.js` + `backend/src/utils/revisarAlertasIA.js` (IA Nivel 2: cron nocturno + disparo inmediato por palabra clave), migración `backend/src/db/schema_pwa_familias_01.sql` (RLS por familia, columnas de ubicación en vivo `ubicacion_actual_lat/lng/at` en `guardias`, `push_subscriptions` generalizada, config de IA) aplicada y verificada contra Supabase real. Frontend nuevo completo en `pwa-familias/` (mismo patrón que `pwa-asistentes`): `i18n/translations.js` reescrito de cero (estaba con contenido stale copiado de Asistentes) con las 3 locales completas; `i18n/LocaleContext.jsx` con su propia clave de `localStorage` (`plm-pwa-familias-locale`, para no colisionar con la de Asistentes si ambas PWA corrieran en el mismo origen); 7 pantallas nuevas — `MisPacientes.jsx` (con redirect automático si la Familia tiene un solo Paciente), `PacienteDetalle.jsx` (suscripción Realtime de Supabase al canal `guardia-ubicacion-{id}` para el mapa en vivo vía iframe de OpenStreetMap, sin API key), `Reportes.jsx`, `ReporteDetalle.jsx`, `Alertas.jsx`, `AsistenteAsignado.jsx` (certificado, evaluaciones, widget de calificación de 5 estrellas), `MiPerfil.jsx` (adaptado de la versión de Asistentes, reutilizando el mismo `lib/push.js` verbatim). `pwa-familias/.env` creado con las mismas credenciales reales de Supabase que `pwa-asistentes` (gitignored). **Bug real encontrado y corregido durante la verificación en navegador**: `ReporteDetalle.jsx` crasheaba ("Objects are not valid as a React child") porque `reporte.alimentacion`/`medicacion`/`signos_vitales` son JSONB estructurados (`{descripcion, porcentaje_consumido}`, `[{nombre,hora,via}]`, `{presion,temperatura,saturacion,glucemia}` — contrato real de `backend/src/utils/reporteIA.js`), no strings planos como asumía el código original; corregido destructurando cada campo según su forma real, con 4 claves i18n nuevas (`signo_presion`/`signo_temperatura`/`signo_saturacion`/`signo_glucemia`) en las 3 locales. Verificación real con Playwright MCP contra Supabase real, usando una cuenta de prueba de Familia nueva (no existía ninguna — se ubicó una Familia con datos reales vía SQL directo y se le reseteó la contraseña con la Supabase Auth Admin API, mismo patrón ya usado para la cuenta de prueba de superadmin; credenciales registradas en `No hacer commit/claves y contraseñas.txt`): login → MisPacientes (redirect automático confirmado, la cuenta de prueba tiene 1 solo Paciente) → PacienteDetalle (alertas activas, guardia actual, mapa) → Reportes → ReporteDetalle (bug encontrado y corregido en el camino, 0 errores de consola tras el fix) → Alertas (estado vacío correcto, sin alertas reales para este Paciente) → AsistenteAsignado (calificar con 3 estrellas, POST real confirmado con una fila nueva en `calificaciones_asistente` por SQL directo) → MiPerfil (nombre/teléfono/plan reales, flujo de notificaciones push llega hasta el punto del permiso del navegador sin errores). `npm run build`/`npm run lint` limpios. Pendiente de esta misma etapa antes de pasar a la Etapa 5: commit + push (todavía no hecho), alta de proyecto Vercel nuevo para `pwa-familias` (no existe todavía) y redeploy de Railway (auto-deploy en el próximo push a `main`) | `backend/src/middleware/requiereRolFamilia.js` (nuevo), `backend/src/utils/push.js` (generalizado), `backend/src/routes/appFamilias.js` (nuevo, incluye la ruta `/pacientes/:id/asistente` agregada en esta sesión), `backend/src/routes/appAsistentes.js` (hooks de push), `backend/src/utils/alertasIA.js` (nuevo), `backend/src/utils/revisarAlertasIA.js` (nuevo), `backend/src/db/schema_pwa_familias_01.sql` (nuevo, aplicado), `backend/src/server.js` (monta router y cron nuevos), `pwa-familias/` (proyecto nuevo completo: `package.json`, `vite.config.js`, `src/main.jsx`, `src/App.jsx`, `src/lib/api.js`, `src/lib/supabaseClient.js`, `src/lib/push.js`, `src/context/AuthContext.jsx`, `src/i18n/translations.js`, `src/i18n/LocaleContext.jsx`, `src/components/Layout.jsx`, `src/pages/Login.jsx`, `src/pages/MisPacientes.jsx`, `src/pages/PacienteDetalle.jsx`, `src/pages/Reportes.jsx`, `src/pages/ReporteDetalle.jsx`, `src/pages/Alertas.jsx`, `src/pages/AsistenteAsignado.jsx`, `src/pages/MiPerfil.jsx`, `.env`/`.env.example`), `No hacer commit/claves y contraseñas.txt` (credenciales de prueba de Familia), `docs/PROGRESS.md` (esta entrada), `docs/PENDIENTES.md` (pendiente nuevo de iconos PNG) |
| 2026-07-20 | **Notificaciones push a Asistentes (Web Push API + VAPID), cerrando definitivamente la Etapa 3 (PWA Asistentes) — última pieza que había quedado diferida a propósito para el final de la etapa.** Continuación directa de la entrada anterior en la misma sesión. Backend: `backend/src/db/schema_push_subscriptions_01.sql` (tabla `push_subscriptions` con RLS `asistente_id = auth.uid()`, aplicada contra Supabase real con `NOTIFY pgrst, 'reload schema'`, más columnas `push_asignacion_enviado_at`/`push_recordatorio_enviado_at` en `guardias` y `push_enviado_at` en `mensajes_asistente`), utilidad `backend/src/utils/push.js` (`enviarPushAsistente()`, wrapper de `web-push` con VAPID, borra la suscripción si el envío devuelve 404/410, solo loguea si falla por otra causa), dos rutas nuevas en `appAsistentes.js` (`POST`/`DELETE /push/suscribir`, gateadas por `requiereRolAsistente`), cron nuevo `backend/src/utils/revisarRecordatoriosPush.js` (mismo patrón de "ya notificado" por columna `*_enviado_at` que `revisarNotificacionesCoordinador.js`, corre cada 5 min vía `server.js`) cubriendo los 3 eventos de `docs/PRD_04_05_App_Servicio.md:115`: nueva guardia asignada, mensaje del coordinador, recordatorio de guardia próxima (60 min antes, solo si no hizo check-in todavía). Frontend `pwa-asistentes`: cambio de estrategia de `vite-plugin-pwa` de `generateSW` (implícita) a `injectManifest` — necesario porque la estrategia por defecto no admite un service worker con listeners custom de `push`/`notificationclick` — con `src/sw.js` escrito a mano (`precacheAndRoute` de la dependencia nueva `workbox-precaching` + los dos listeners nuevos), helper `src/lib/push.js` (`activarPush`/`desactivarPush`/`suscripcionActual`, conversión de la VAPID public key a `Uint8Array`), nueva sección "Notificaciones" en `MiPerfil.jsx` con toggle de activar/desactivar (pide permiso del navegador, maneja los 3 estados: no soportado / activo / error, con `Notification.permission === 'denied'` mostrando mensaje explicativo sin reintentar el prompt), 8 claves nuevas de i18n en las 3 locales. Par de claves VAPID nuevo generado con `npx web-push generate-vapid-keys` (el par mencionado en un pendiente de sesiones previas no tenía clave pública registrada en ningún lado, y no había suscripciones reales todavía, así que no había costo en regenerarlo) cargado en `backend/.env` + Railway (variable de entorno de producción) y en `pwa-asistentes/.env` + Vercel (variable de entorno de producción, `VITE_VAPID_PUBLIC_KEY`) — nunca hardcodeado (Regla 1 de CLAUDE.md). Commit `43192c6`, deploy automático de Railway (push a `main`) y redeploy explícito de `pwa-asistentes` (`npx vercel --prod`, Regla 8 de CLAUDE.md). Verificación real de punta a punta con Playwright MCP contra producción (`https://pwa-asistentes.vercel.app` + backend real de Railway + Supabase real): login con la cuenta demo ficticia "DEMO — Claudia García" (contraseña de prueba fijada vía Supabase Admin API, sin credencial previa registrada para el rol Asistente en `No hacer commit/claves y contraseñas.txt`), activación del toggle de notificaciones — bloqueada inicialmente por una limitación del entorno headless de Playwright/CDP (`Notification.requestPermission()` no dispara un prompt real y queda en `"default"`), resuelta con `page.context().grantPermissions(['notifications'], {origin})` vía `mcp__playwright__browser_run_code_unsafe` (herramienta que expone el objeto `page` real, a diferencia de `browser_evaluate` que solo corre JS de página) — tras el grant, la suscripción se completó y quedó persistida en `push_subscriptions` con un endpoint FCM real y genuino (confirmado por SQL directo, no solo por ausencia de error en pantalla). Se insertó una fila de prueba en `mensajes_asistente` para disparar el camino de "mensaje del coordinador" del cron, y se confirmó con un Monitor en background (sondeo cada 10s contra Supabase) que `push_enviado_at` se pobló tras la corrida real del cron en producción (~6 min después de insertar la fila) — y que la suscripción de prueba sigue existiendo después (es decir que `web-push` no la borró por 404/410), evidencia consistente con un envío exitoso sin poder confirmar visualmente la notificación mostrada en pantalla dentro del entorno headless (pendiente #67, marcado 🟢 Resuelto con esa evidencia). **Hallazgo nuevo, no relacionado con push, encontrado durante esta verificación**: `pwa-asistentes` no tiene `vercel.json` con rewrite SPA — la navegación directa por URL o el refresh del navegador en cualquier ruta que no sea `/` devuelve 404 real de Vercel (la navegación interna por clicks sí funciona) — logueado como pendiente nuevo #68, no corregido en esta sesión (fuera de alcance de push notifications). Con esto, las tres piezas que habían quedado explícitamente diferidas para el cierre de la Etapa 3 (login WebAuthn queda diferido de verdad — fuera de alcance del primer corte —, Alertas tempranas excluidas del primer corte, y push notifications) quedan resueltas en la medida acordada: push construido y verificado, WebAuthn y Alertas tempranas siguen fuera de alcance por decisión explícita ya registrada, no por omisión | `backend/src/db/schema_push_subscriptions_01.sql` (nuevo), `backend/src/utils/push.js` (nuevo), `backend/src/utils/revisarRecordatoriosPush.js` (nuevo), `backend/src/routes/appAsistentes.js` (rutas `/push/suscribir`), `backend/src/server.js` (monta el cron nuevo), `backend/.env`/`.env.example` (VAPID keys), `backend/package.json`/`package-lock.json` (dependencia `web-push`), `pwa-asistentes/vite.config.js` (estrategia `injectManifest`), `pwa-asistentes/src/sw.js` (nuevo), `pwa-asistentes/src/lib/push.js` (nuevo), `pwa-asistentes/src/lib/api.js` (métodos `suscribirPush`/`desuscribirPush`), `pwa-asistentes/src/pages/MiPerfil.jsx` (sección Notificaciones), `pwa-asistentes/src/i18n/translations.js` (8 claves × 3 locales), `pwa-asistentes/.env`/`.env.example` (`VITE_VAPID_PUBLIC_KEY`), `pwa-asistentes/package.json` (dependencia `workbox-precaching`), `pwa-asistentes/.gitignore`, `docs/PENDIENTES.md` (pendiente #67 resuelto, pendiente #68 nuevo), `docs/PROGRESS.md` (esta entrada) |
| 2026-07-20 | **Despliegue a producción de `pwa-asistentes` (Vercel) y verificación en vivo, cerrando el primer corte de Etapa 3.** Continuación directa de la entrada anterior en la misma sesión. Proyecto Vercel nuevo `pwa-asistentes` creado (`npx vercel link`) con las 3 variables de entorno de producción (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, mismo proyecto Supabase que el Panel; `VITE_API_URL`). **Bug real encontrado y corregido durante el despliegue**: el primer valor cargado para `VITE_API_URL` (`https://aurevia-backend-production.up.railway.app`, tomado de una mención en `docs/PROGRESS.md:396` que ya estaba desactualizada) resultó ser una URL de Railway inexistente (`404 Application not found` al pegarle directo) — la URL real vigente, confirmada con `npx railway status` y también verificada extrayendo la cadena literal del bundle JS ya desplegado del Panel (que sí apunta correcta), es `https://aurevia-backend-production-e7ee.up.railway.app`. Corregido el env var en Vercel y redesplegado. Verificado en el navegador real contra el deploy de producción (`https://pwa-asistentes.vercel.app`): login con la cuenta demo ficticia de prueba (nunca datos reales) trajo, tras el fix, la lista real de guardias del backend de producción sin errores de consola. **Segundo hallazgo, específico de PWA**: el primer redeploy (con la URL todavía mala) había quedado cacheado por el service worker de `vite-plugin-pwa` en el navegador de prueba — after el fix, un simple reload seguía mostrando el error viejo hasta desregistrar el service worker y vaciar el cache de Workbox manualmente; confirma que cualquier prueba futura de esta PWA tras un redeploy debe considerar el cacheo del service worker, no asumir que un reload normal siempre trae el bundle nuevo (relevante también para usuarios reales tras cada actualización). No se corrigió la mención desactualizada de `docs/PROGRESS.md:396` (registro histórico de una sesión anterior, se deja intacto por integridad del historial) — advertencia agregada como pendiente nuevo para no repetir la confusión | `pwa-asistentes/.vercel/` (config de proyecto, generado, gitignored); variables de entorno de producción en Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`); `docs/PENDIENTES.md` (pendiente nuevo sobre la URL de Railway desactualizada en la documentación); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-20 | **Etapa 3 (PWA Asistentes) — primer corte construido y verificado de punta a punta en navegador real contra Supabase real, sin desplegar todavía a Vercel.** Alcance acordado con el Desarrollador para este primer corte: login solo email/password (WebAuthn queda para después), sin Alertas tempranas de ausencia, push notifications dejadas para el final de la Etapa 3. Backend: `backend/src/db/schema_reportes_alertas_01.sql` (tablas `reportes`/`alertas` + policies RLS nuevas de `asistente_id = auth.uid()` sobre `guardias`/`reportes`/`alertas`, aplicado contra Supabase real con `NOTIFY pgrst, 'reload schema'`), middleware `requiereRolAsistente.js`, utilidad `reporteIA.js` (IA Nivel 1 de estructuración de reporte libre → JSON, con fallback seguro documentado — vuelca el texto libre en `observaciones` si falta `ANTHROPIC_API_KEY` o la respuesta no es JSON válido, mismo patrón que `iaWhatsapp.js`/`importacionIA.js`), rutas nuevas `backend/src/routes/appAsistentes.js` (perfil, mis guardias, detalle, check-in con GPS sin bloquear por distancia — solo advierte y dejarrastro en nota del coordinador si está fuera de rango, estructurar/subir-foto/confirmar reporte con checkout atómico, reportes anteriores del paciente). Frontend nuevo `pwa-asistentes/` (Vite 8 + React 18 + react-router-dom 6 + `vite-plugin-pwa`, bump necesario a `^1.3.0` por incompatibilidad de peer-deps con vite 8): `AuthContext.jsx` (email/password, sin lógica MFA — el rol `asistente` no está en `ROLES_CON_MFA`), i18n completo es-AR/en/pt-BR (`translations.js`/`LocaleContext.jsx`), diseño visual tomado sin modificar de `panel/src/styles/variables.css` (regla 6 de CLAUDE.md), pantallas `Login.jsx`, `MisGuardias.jsx`, `GuardiaActiva.jsx` (check-in GPS, timer en vivo, acceso a Reporte Diario y a reportes anteriores), `ReporteDiario.jsx` (texto libre → estructurar con IA → revisión/edición humana de cada campo → foto opcional → confirmar con GPS fresco, checkout atómico), `MiPerfil.jsx`; los 4 estados (loading/error/vacío/listo) cubiertos en cada pantalla que carga datos. Verificación real con Playwright MCP contra Supabase real (`abcpmzfnnhpuiupmrsdi`), usando la cuenta demo ficticia preexistente "DEMO — Claudia García" de Prestadora Demo (a la que se le fijó una contraseña de prueba conocida vía Supabase Admin API para poder loguearse — contraseña de prueba, cuenta ficticia, no un dato real de Prestadora/Asistente): recorrido completo login → Mis Guardias → detalle de guardia → check-in (probado también el caso fuera de rango, advertencia mostrada sin bloquear, tal como exige el diseño) → timer → Reporte Diario (texto libre → IA tomó el camino de fallback esperado, ya que el `backend/.env` local no tiene `ANTHROPIC_API_KEY` configurada — no se pudo verificar la calidad real del mapeo de IA en este entorno, mismo hueco ya conocido de `importacionIA.js`) → revisión/edición de cada campo → confirmar → checkout automático + guardia pasó a "Completada" → reportes anteriores del paciente mostrando el reporte recién creado → Mi Perfil con datos reales. Aislamiento multi-tenant de las policies nuevas verificado por inspección directa de `pg_policies` (no solo asumido) — todas correctamente acotadas por `asistente_id`/join a `asistente_id`. `get_advisors(security)` corrido tras los cambios: solo warnings preexistentes ya conocidos, ninguno nuevo introducido. Un `ERR_CONNECTION_RESET` transitorio durante la verificación fue diagnosticado como conflicto local de puerto entre un proceso `node` manual y el backend ya corriendo por `nodemon` — no un bug de código. Pendiente para el cierre de esta etapa: commit + push, alta de proyecto Vercel para `pwa-asistentes` y despliegue explícito (regla 8 de CLAUDE.md), iconos PNG reales para "Agregar a pantalla de inicio" (hoy solo el SVG heredado), y retomar con el Desarrollador la infraestructura de push notifications (VAPID/Apple Push) al cierre de la etapa, tal como se había acordado | `backend/src/db/schema_reportes_alertas_01.sql` (nuevo), `backend/src/middleware/requiereRolAsistente.js` (nuevo), `backend/src/utils/reporteIA.js` (nuevo), `backend/src/routes/appAsistentes.js` (nuevo), `backend/src/server.js` (monta el router nuevo), `pwa-asistentes/` (proyecto nuevo completo: `package.json`, `vite.config.js`, `src/main.jsx`, `src/App.jsx`, `src/index.css`, `src/styles/variables.css`, `src/lib/api.js`, `src/lib/supabaseClient.js`, `src/context/AuthContext.jsx`, `src/i18n/translations.js`, `src/i18n/LocaleContext.jsx`, `src/components/Layout.jsx`, `src/pages/Login.jsx`, `src/pages/MisGuardias.jsx`, `src/pages/GuardiaActiva.jsx`, `src/pages/ReporteDiario.jsx`, `src/pages/MiPerfil.jsx`) |
| 2026-07-19 | **Fase 3 del plan "Terminar la Etapa 2 (Panel)" completa — importación masiva de datos (Excel/CSV) con ayuda de IA, verificada de punta a punta en Prestadora Demo con casos de éxito y de error.** Continuación directa de la Fase 2 en la misma sesión. Alcance: subida de archivo (Excel/CSV, `xlsx@0.18.5`, patrón multer de `panelAusencias.js`) analizado por `backend/src/utils/importacionIA.js` — la IA (mismo patrón de `iaWhatsapp.js`: cliente Anthropic con inicialización perezosa, `claude-sonnet-5`, prompt JSON-only) propone el mapeo de columnas del archivo a los campos internos de Asistente o Familia/Paciente, con fallback seguro (mapeo vacío + advertencia) si falta `ANTHROPIC_API_KEY` o la respuesta no es JSON válido — igual que el hueco ya conocido de `iaWhatsapp.js`, la *calidad* del mapeo de la IA no pudo verificarse en este entorno (sin la key configurada), solo el camino de fallback. Nuevas rutas `backend/src/routes/panelImportacion.js`: `/analizar` (sube+parsea+propone mapeo, gateado por el permiso `importar_datos_masivos` del motor de la Fase 2) y `/confirmar` (crea fila por fila, tolerando errores individuales sin abortar el lote). **Reutiliza exactamente la lógica de creación de la Fase 1** — se extrajeron `crearAsistenteDirecto()`/`crearFamiliaDirecta()` desde `panelCuentas.js` hacia `backend/src/utils/cuentasPanel.js` como funciones reutilizables (con su rollback ya existente ante error), y `panelCuentas.js` pasó a llamarlas en vez de duplicar la lógica — sin crear un camino de alta paralelo, tal como exige el plan. Toda importación queda auditada en la tabla nueva `importaciones_prestadora` (`backend/src/db/schema_importaciones_01.sql`, RLS estricta, aplicada contra Supabase real con `NOTIFY pgrst, 'reload schema'`; el INSERT lo hace el backend con la service role key, no hace falta policy de INSERT para `authenticated`). Frontend: página nueva `panel/src/pages/Importacion.jsx` (flujo de 3 pasos: subir archivo → revisar/corregir mapeo con previsualización → confirmar y ver resultado), enlace de navegación gateado por el mismo permiso (`Layout.jsx`), ruta sin restricción de rol a nivel router (gateo a nivel de página, mismo patrón ya usado en otras pantallas de este plan). i18n completo de las ~30 claves nuevas en es-AR/en/pt-BR. **Bug real encontrado y corregido durante la verificación** (no parte del diseño): `XLSX.read()` sin `codepage: 65001` explícito corrompe acentos/ñ en un CSV UTF-8 sin BOM (el caso normal al exportar desde Excel/Sheets en español) — hubiera corrompido silenciosamente nombres/domicilios/especialidades reales de cualquier Prestadora; corregido en `parsearArchivo()`. Verificación real con Playwright MCP contra Supabase real (Prestadora Demo, `abcpmzfnnhpuiupmrsdi`): planilla "sucia" de Asistentes (columnas en otro orden, un teléfono/DNI faltante, columna con dos especialidades separadas por coma) — mapeo manual corregido, ambas filas creadas con datos idénticos en calidad a los de alta manual de la Fase 1 (acentos preservados, arrays bien separados, opcionales en `null`, `prestadora_id` correcto); planilla con un email duplicado — la fila inválida quedó afuera con su error mostrado en el resultado y en el registro de auditoría, la fila válida se creó igual, y no quedó ninguna cuenta de Supabase Auth huérfana para la fila fallida (rollback de `crearAsistenteDirecto` confirmado); planilla de Familia/Paciente con un valor de complejidad inválido — rechazada limpio por el constraint de la base, sin dejar Familia/Paciente/cuenta huérfanos; corregido el valor y reintentado — Familia+Paciente creados correctamente y vinculados. A pedido explícito del Desarrollador, los 3 Asistentes de prueba, la Familia+Paciente de prueba y los 3 registros de auditoría **se dejaron como están** en Prestadora Demo (no se borraron). Con esto, las 3 fases del plan "Terminar la Etapa 2 (Panel)" quedan completas y verificadas — pendiente de decisión del Desarrollador si la Etapa 2 se da por cerrada para avanzar a la Etapa 3 (PWA Asistentes) | `backend/package.json`/`package-lock.json` (dependencia `xlsx`), `backend/src/utils/importacionIA.js` (nuevo), `backend/src/routes/panelImportacion.js` (nuevo), `backend/src/db/schema_importaciones_01.sql` (nuevo), `backend/src/utils/cuentasPanel.js` (`crearAsistenteDirecto`/`crearFamiliaDirecta` extraídas), `backend/src/routes/panelCuentas.js` (usa las funciones extraídas), `backend/src/server.js` (monta el router nuevo), `panel/src/pages/Importacion.jsx` (nuevo), `panel/src/App.jsx`, `panel/src/components/layout/Layout.jsx`, `panel/src/i18n/translations.js` |
| 2026-07-19 | **Fase 2 del plan "Terminar la Etapa 2 (Panel)" completa — motor de permisos configurable por Prestadora, verificado de punta a punta en Prestadora Demo con una sesión real de coordinador.** Continuación directa de la Fase 1 en la misma sesión. Alcance: tabla nueva `permisos_prestadora` (`prestadora_id` + `accion` → `alcance` solo_admin/admin_y_coordinador + arrays `excepciones_permitir`/`excepciones_denegar` por usuario) y columna `politica_verificacion_alta_manual` en `prestadoras` (`backend/src/db/schema_permisos_prestadora_01.sql`, aplicado contra Supabase real con `NOTIFY pgrst, 'reload schema'`). Doble enforcement: función SQL `tiene_permiso(accion)` (`SECURITY DEFINER`, usa `auth.uid()`) conectada a las policies `FOR UPDATE`/`FOR INSERT` de `asistentes`/`familias`/`pacientes` para las mutaciones directas del frontend; espejo en JS `backend/src/utils/permisos.js` (`tienePermiso()`) para las rutas de alta manual de `panelCuentas.js`, que corren con la service role key sin `auth.uid()`. Nuevo tab "Permisos" en `Configuracion.jsx` (solo Admin_prestadora): tabla de 5 acciones con alcance general editable y excepción puntual por coordinador, más el selector de política de verificación al dar de alta un Asistente a mano (omitir/pendiente/aprobado) que la Fase 1 había dejado pendiente. Nuevo `PermisosContext.jsx` (mismo patrón que `EmpresaContext.jsx`, fetch único por sesión contra `/api/panel/cuentas/permisos-efectivos`) conectado en botones/campos ya construidos en Fase 1: "Nuevo Asistente"/"Nueva Familia" (`Asistentes.jsx`/`Familias.jsx`), identidad de Asistente (`PerfilTab.jsx` — **corregido a mitad de sesión**: la policy de UPDATE de `asistentes` es por fila completa, no por columna, así que se deshabilita todo el formulario y no solo nombre/DNI/teléfono/email cuando falta el permiso), contacto/plan de Familia y datos de Paciente (`FamiliaDetalle.jsx`). Verificación real con Playwright MCP contra Supabase real (`abcpmzfnnhpuiupmrsdi`): creada una cuenta de coordinador de prueba real vía el propio flujo del Panel ("DEMO — Coordinador Prueba"); confirmado el comportamiento por defecto (alta manual oculta, edición de identidad habilitada); desde Configuración, se activó una excepción puntual "permitir" en `alta_manual_asistente` para ese coordinador — el botón "Nuevo Asistente" apareció de inmediato sin ningún cambio de código, y el Asistente creado con esa sesión quedó realmente persistido en la base (confirmado por SQL directo, no solo por la ausencia de error en el modal); se cambió el alcance general de `editar_identidad_asistente` a solo_admin — confirmado que todos los campos y el botón Guardar del perfil de un Asistente existente quedan deshabilitados para ese mismo coordinador. Ambas configuraciones de prueba revertidas a su estado por defecto al cerrar la verificación (fila borrada de `permisos_prestadora`); a pedido explícito del Desarrollador, la cuenta de coordinador de prueba y el Asistente de prueba creados durante la verificación **se dejaron como están** en Prestadora Demo (no se borraron). i18n de todo el tab Permisos agregado simultáneamente en es-AR/en/pt-BR. Desplegado a producción (`npx vercel --prod`, regla 8 de `CLAUDE.md`): `https://aurevia-panel.vercel.app`. Fase 3 (importación masiva con IA) sigue sin arrancar | `backend/src/db/schema_permisos_prestadora_01.sql` (nuevo), `backend/src/utils/permisos.js` (nuevo), `backend/src/routes/panelCuentas.js` (gateo de alta manual por permiso + política de verificación), `backend/src/routes/panelConfiguracion.js` (endpoints `/permisos`, `/politica-verificacion`, `/permisos-efectivos`), `panel/src/pages/Configuracion.jsx` (tab Permisos), `panel/src/context/PermisosContext.jsx` (nuevo), `panel/src/App.jsx`, `panel/src/pages/Asistentes.jsx`, `panel/src/pages/Familias.jsx`, `panel/src/pages/asistentes/PerfilTab.jsx`, `panel/src/pages/familias/FamiliaDetalle.jsx`, `panel/src/index.css`, `panel/src/i18n/translations.js` |
| 2026-07-19 | **Fase 1 del plan "Terminar la Etapa 2 (Panel)" completa — carga y edición manual de Asistentes y Familias, verificada de punta a punta en Prestadora Demo.** Continuación de una sesión previa que había dejado el código escrito pero sin verificar en navegador real. Alcance: identidad de Asistente (nombre/teléfono/email/DNI) ahora editable en `PerfilTab.jsx`; botones y modales nuevos "Nuevo Asistente" (`NuevoAsistenteModal.jsx`) y "Nueva Familia" (`NuevaFamiliaModal.jsx`) para alta manual sin pasar por Postulación/Solicitud, reutilizando `crearCuentaConPerfil`/`borrarCuenta` de `backend/src/utils/cuentasPanel.js`; ficha de Familia (`FamiliaDetalle.jsx`) con contacto y plan editables; datos clínicos de Paciente editables (`EditarPacienteModal.jsx`) y alta de un segundo Paciente a una Familia existente (`NuevoPacienteModal.jsx`). Un Asistente dado de alta a mano entra `activo` y sin filas en `verificaciones_asistente` (política definitiva queda para la Fase 2, según lo previsto en el plan). **Bug real encontrado durante la verificación en navegador** (no parte del diseño): el endpoint `/api/panel/cuentas/familia-directa` fallaba con 500 al crear la fila sintética de `solicitudes` — 3 columnas `NOT NULL` de esa tabla (`tipo_servicio`, `modalidad`, `dias_horario`, más `telefono`/`localidad` que el formulario deja opcionales) no se completaban; corregido en `backend/src/routes/panelCuentas.js` con los mismos valores que ya usa el resto de la Prestadora Demo para altas manuales, sin tocar el resto del flujo. Verificación real contra Supabase (`abcpmzfnnhpuiupmrsdi`) vía Playwright MCP, sesión ya autenticada como `admin_prestadora` de Prestadora Demo: alta de Asistente + edición de identidad + persistencia tras recarga completa (no solo estado de cliente); alta de Familia+Paciente (falló dos veces por el bug de arriba, éxito en el tercer intento tras el fix, confirmado con 0 errores de consola); edición de contacto/plan de la Familia con persistencia tras recarga; edición de datos clínicos del Paciente (patologías, IOMA, medicación); alta de un segundo Paciente confirmado bien vinculado a la misma Familia (ambos aparecen en la tabla, ninguno con campos en blanco). Todos los datos de prueba (Asistente, Familia, 2 Pacientes, fila de `solicitudes`, ambas cuentas de `auth.users`) borrados de Supabase real al cerrar la verificación, confirmado con conteo en 0 sobre las 6 tablas involucradas. i18n de toda la Fase 1 agregado simultáneamente en es-AR/en/pt-BR (verificado con import dinámico del módulo, sin errores de sintaxis). Fases 2 (motor de permisos configurable) y 3 (importación masiva con IA) del mismo plan siguen sin arrancar — el plan exige Fase 1 verificada antes de tocarlas. Desplegado a producción (`npx vercel --prod`, regla 8 de `CLAUDE.md` — el push a GitHub no despliega solo): `https://aurevia-panel.vercel.app` | `panel/src/pages/asistentes/PerfilTab.jsx`, `panel/src/pages/asistentes/NuevoAsistenteModal.jsx` (nuevo), `panel/src/pages/Asistentes.jsx`, `panel/src/pages/familias/FamiliaDetalle.jsx`, `panel/src/pages/familias/NuevaFamiliaModal.jsx` (nuevo), `panel/src/pages/familias/EditarPacienteModal.jsx` (nuevo), `panel/src/pages/familias/NuevoPacienteModal.jsx` (nuevo), `panel/src/pages/Familias.jsx`, `panel/src/i18n/translations.js`, `backend/src/routes/panelCuentas.js` (endpoints de alta manual + fix del bug de `solicitudes`) |
| 2026-07-18 | **Incidente de backup diario (R2 + B2) diagnosticado y resuelto — secrets de GitHub Actions desincronizados de `backend/.env`.** Aviso de GitHub: el workflow `Backup diario a buckets (R2 + B2)` había fallado en la corrida programada de la madrugada (`08:07 UTC`) con `401 Unauthorized` al subir a Cloudflare R2, tras varios días consecutivos exitosos. Diagnóstico: se probó `HeadBucketCommand`/`PutObjectCommand` contra R2 con las credenciales locales de `backend/.env` — funcionaron sin error, lo que descartaba un problema del lado de Cloudflare o del código (`backend/scripts/backup_a_buckets.mjs` sin cambios recientes de lógica). Se sincronizaron los 8 secrets de GitHub (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET`, `B2_ENDPOINT`, ninguno tocado desde 2026-07-11 según `gh secret list`) con los valores vigentes de `backend/.env` vía `gh secret set`. Primera re-corrida manual (`workflow_dispatch`) pasó de `401` a `403 AccessDenied` en R2 tras sincronizar solo las credenciales — indicio de que `R2_BUCKET`/`R2_ENDPOINT` también estaban desalineados; sincronizados también, segunda re-corrida exitosa en R2. La misma corrida reportó éxito en B2 sin lanzar excepción, pero una verificación directa contra el bucket real (`ListObjectsV2Command` con las credenciales locales) mostró que el archivo **no estaba** — los 4 secrets de B2 tampoco se habían tocado desde el 11/07 y apuntaban a un bucket/clave que el script daba por subido sin error pero que no correspondía al bucket real verificado; sincronizados también. Corrida final (`29629639064`) verificada con una consulta S3 real a ambos buckets: archivo `aurevia_backup_2026-07-18T03-54-51-815Z.sql.gz` presente en R2 y B2, mismo tamaño (59.812 bytes) en los dos — no se confió únicamente en el mensaje de éxito del script (Regla 12.5). Archivo de prueba (`test-diagnostico-permiso.txt`) usado para el diagnóstico de permisos en R2 borrado al terminar. **Causa raíz exacta de por qué los 8 secrets quedaron desactualizados no pudo determinarse** — la API de GitHub no permite leer el valor previo de un secret ya sobreescrito, así que no hay evidencia recuperable de qué tenían antes; se descartó explícitamente una hipótesis inicial equivocada (que la rotación hubiera ocurrido la noche del 2026-07-16 durante la sesión de pausa de SMTP del pendiente #40) por falta de evidencia real, no se dejó como afirmación sin verificar | `backend/.env` (sin cambios, usado como fuente de verdad); secrets de GitHub Actions `R2_*`/`B2_*` (los 8, actualizados vía `gh secret set`); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-17 | **Reescritura completa del historial de Git local con `git filter-repo`, a pedido explícito del Desarrollador, continuando el barrido del nombre anterior de la prestadora original iniciado en la sesión anterior (pendiente #40).** Backup previo obligatorio: zip completo del `.git` en `docs/Documentos Obsoletos/git_backup_pre_filter_repo_20260716_235629.zip` (permiso puntual para escribir en esa carpeta restringida, con este único fin). Dos corridas de `filter-repo`: (1) `--replace-text`/`--replace-message` con regex case-insensitive que reemplazaba el nombre anterior por "prestadora-original" sobre contenido de blobs y mensajes de commit + `--invert-paths` eliminando del historial archivos obsoletos en rutas viejas pre-mudanza (con el nombre anterior en el título del archivo); (2) con permiso explícito adicional del Desarrollador ("SI"), purgado del historial también el contenido completo de la carpeta restringida vía `--path-glob`, más agregada a `.gitignore` y `git rm -r --cached` (archivos intactos en disco, solo salen del índice/historial de git desde ese commit). Cada corrida de `filter-repo` elimina el remoto `origin` por diseño de la herramienta — restaurado después de cada una sin fetch ni push. Verificación final (barrido de todo el sistema sin borrar nada, a pedido explícito): rama local `main` limpia salvo 1 mención legítima (nombre de carpeta protegida en un mensaje de commit propio); `origin/main` (ref cacheada) todavía con el historial viejo de GitHub, esperado mientras el push siga en pausa; working tree limpio salvo 2 lugares legítimos (`.gitignore` con el nombre de carpeta protegida, y `No hacer commit/claves y contraseñas.txt` con pendientes reales ya registrados en el ítem #40). `.git` local bajó de 12M a 5.6M. **`git push --force` a `origin` (`BetoSP/aurevia`) queda explícitamente en pausa** — el Desarrollador respondió "Todavía no" al ofrecimiento de hacerlo; GitHub sigue con el historial sin reescribir hasta nueva confirmación. Detalle completo en pendiente #42 de `docs/PENDIENTES.md` y en memoria persistente (`project_git_history_rewrite_pendiente_push`) | Historial de Git local (86→87 commits, reescritos); `.gitignore` (agregada la carpeta restringida); `docs/PENDIENTES.md` (#42 nuevo); `docs/PROGRESS.md` (esta entrada); memoria persistente actualizada |
| 2026-07-15 | **Verificación y cierre de deuda técnica de esquemas SQL pendientes (pendiente #18 candidatos 1 y 2), con MCP de Supabase conectado en esta sesión.** Punto de partida: reporte de estado general del desarrollo pedido por el Desarrollador ("comienza") identificó como primer paso lógico aplicar 2 `.sql` marcados como "falta aplicar" en `docs/PENDIENTES.md`. Al conectar el MCP se descubrió que **las 3 tablas de los 2 schemas (`tipos_documento_asistente`, `documentos_asistente`, `cierres_servicio_paciente`) y sus columnas/policies ya estaban aplicadas en Supabase real** — evidentemente aplicadas en una sesión anterior con MCP conectado sin que quedara registrado en `PENDIENTES.md` (mismo patrón ya visto y corregido en el pendiente #13). Único gap real encontrado: `configuracion_notificaciones` tenía 0 filas en total (el seed del evento `vencimiento_documento_asistente` nunca corrió) — corregido re-ejecutando solo esa parte del `.sql` (idempotente, `ON CONFLICT DO NOTHING`), verificado con `SELECT` posterior (4 tipos de documento sugeridos + 1 fila de notificación). Se verificó además que un tercer schema con el mismo patrón (`schema_certificados_medicos_storage.sql`, pendiente #15/#24) ya estaba resuelto y cerrado desde 2026-07-13 — su fila en `docs/PENDIENTES.md` #15 todavía citaba "falta aplicar", corregida. Se confirmó con `git log` + `npx vercel inspect` que el commit del Panel (`aa944ac`, `a726ee6`, 2026-07-14) ya está incluido en el deploy de Vercel del 2026-07-15 19:50 (posterior), y con `gh run list` que el workflow "Deploy backend a Railway" corre exitosamente en cada push — **el pendiente histórico de `RAILWAY_TOKEN` sin cargar ya no aplica, quedó resuelto en algún punto sin quedar registrado**. `mcp__supabase__get_advisors` (security) corrido tras los cambios: solo warnings preexistentes no relacionados (search_path mutable, funciones SECURITY DEFINER ya conocidas, leaked password protection) — ninguno nuevo introducido por este trabajo. **Prueba manual en navegador del flujo de Cierre de Servicio (candidato 2) queda pendiente**, no se hizo en esta sesión | `docs/PENDIENTES.md` (#15, #18 actualizados); `docs/PROGRESS.md` (esta entrada); Supabase real (seed de `tipos_documento_asistente`/`configuracion_notificaciones` completado vía MCP, sin cambios de esquema nuevos) |
| 2026-07-15 | **Pendiente #14 — las 4 decisiones de fondo del modelo de precios de licencia Xeitra→prestadora quedaron cerradas por el Desarrollador.** Investigación de mercado en dos rondas: primero comparables de EE.UU. (AlayaCare/WellSky/CareSmartz360/AxisCare, todos cobran por escala del cliente, nunca por costo de infra propio — confirma el enfoque), descartados explícitamente por el Desarrollador por no representar el poder adquisitivo argentino; después comparables argentinos (Xubio ~$3.500 ARS/mes, Colppy ~$5.000 ARS/mes, Tango, rango de confort pyme AR $50.000-$160.000 ARS/mes) como ancla real de mercado local. Decisión final del Desarrollador, registrada en `docs/PLAN_MULTITENANT_XEITRA.md` sección 3.5: valores de referencia iniciales de USD 27 a USD 137 + impuestos por pack de licencia, nunca hardcodeados en código (van en `planes_facturacion`), ajuste manual (no fórmula automática) por dólar/inflación/salarios u otra variable hasta tener más expertise de mercado. La asignación exacta de tramos intermedios (mediana/grande) dentro de ese rango queda para el momento de implementación real del módulo de facturación — único detalle no bloqueante que resta. `docs/PENDIENTES.md` #14 actualizado de 🔴 a 🟡 (definición cerrada, implementación pendiente) | `docs/PLAN_MULTITENANT_XEITRA.md` (sección 3.5 ampliada con las 4 decisiones); `docs/PENDIENTES.md` (#14 actualizado); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-15 | **Avance de diseño del pendiente #14 (modelo de precios de licencia), a pedido explícito del Desarrollador ("avanza con todo lo que puedas... para que cuando veamos el módulo de facturación haya menos trabajo").** No se tocó código ni Supabase — solo diseño en documentación. Comparado contra el patrón de mercado de software vertical B2B (home care scheduling): precio por métrica de negocio (# Asistentes activos) en vez de costo-plus. Diseño agregado a `docs/PLAN_MULTITENANT_XEITRA.md` sección 3.5: (a) fee base + tier por Asistentes activos, reusando los esquemas `'fee_fijo'`/`'por_personal'` ya existentes como dos filas concurrentes de `planes_facturacion` — sin agregar un 4to esquema al enum; (b) costos fijos compartidos (Supabase/Railway/Vercel/dominio) prorrateados por esa misma métrica; (c) costos variables (IA/WhatsApp) medidos directo — se verificó que `mensajes_whatsapp` (`schema_whatsapp_ia_01.sql:291-302`) ya tiene `prestadora_id` pero no columnas de costo/tokens, hace falta agregarlas cuando se instrumente de verdad; (d) piso de margen como chequeo interno, no fórmula visible al cliente. Pendiente #14 actualizado con el avance y las 4 decisiones puntuales que le quedan al Desarrollador — sigue 🔴 Abierto, no se cerró | `docs/PLAN_MULTITENANT_XEITRA.md` (sección 3.5 ampliada); `docs/PENDIENTES.md` (#14 actualizado); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-15 | **Pendiente #34 cerrado — columna "Rol" en blanco para cuentas `admin_prestadora` en `UsuariosPanel.jsx`, a pedido explícito del Desarrollador ("arreglalo").** Causa: mismatch entre el valor de dato `admin_prestadora` y la clave i18n `rol_admin` (nombre viejo, de antes del rename del rol). Renombrada la clave a `rol_admin_prestadora` en las 3 locales de `translations.js` (mismo texto "Admin") y actualizada la única referencia directa en `UsuariosPanel.jsx:207`. Probado en navegador real: cuenta `admin_prestadora` de prueba, vista desde una cuenta `superadmin` de prueba, columna "Rol" mostró "Admin" correctamente. Ambas cuentas de prueba borradas al terminar, verificado por consulta | `panel/src/i18n/translations.js`; `panel/src/pages/UsuariosPanel.jsx`; `docs/PENDIENTES.md` (#34 cerrado); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-15 | **Pendiente #39 cerrado — borradas las dos cuentas de prueba huérfanas (`PRUEBA temporal — browser test`, `PRUEBA temporal — Item F`) encontradas al cerrar el pendiente #36, a pedido explícito del Desarrollador ("borralas").** Sin filas asociadas en `sesiones_tenant_admin_plataforma`/`auditoria_admin_plataforma` para ninguna de las dos. Borrado directo de `usuarios` y `auth.users`, verificado con consulta real: `usuarios` quedó con 1 sola fila (el `superadmin` real de Sandbox). Ningún archivo de código tocado, solo datos en Supabase | `docs/PENDIENTES.md` (#39 cerrado); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-15 | **Pendiente #36 cerrado — `admin_plataforma` agregado a `requiereAdminOSuperior()` en `panelConfiguracion.js`, con el mismo corte de "sin sesión de tenant activa" (400 explícito) que ya usaba `panelUsuarios.js`.** Encontrado incidentalmente probando el ítem F del pendiente #30 (403 al confirmar una acción destructiva dentro de Configuración). **Efecto colateral encontrado durante la verificación, no un bug del fix:** `GET /configuracion/empresa` con sesión de tenant activa daba `500 Cannot coerce the result to a single JSON object` — la fila de `configuracion_prestadora` de la prestadora Sandbox había sido borrada como parte del borrado total del pendiente #38 (esa tabla estaba en la lista de tablas de esa operación). Resuelto insertando una fila mínima nueva para Sandbox (`prestadora_id` + `nombre`) vía SQL directo. **Probado dos veces de punta a punta:** script `backend/scripts/test_pendiente_36.mjs` (nuevo, conservado como regresión — JWT real, login real, `POST /sesion-tenant`, `GET /configuracion/empresa` y `/configuracion/zonas`: 400 sin sesión, 200 con sesión activa en ambas rutas) y navegador real (Playwright: cuenta `admin_plataforma` de prueba, mensaje 400 explícito antes de entrar a una prestadora, "Entrar" desde Prestadoras, pestaña "Datos de la empresa" de Configuración carga sin error). Cuenta de prueba de la corrida de navegador y su sesión de tenant/auditoría borradas al terminar, verificado sin filas residuales. **Hallazgo aparte, no corregido (nuevo pendiente #39):** dos cuentas `usuarios`/`auth.users` de prueba huérfanas de sesiones anteriores (`PRUEBA temporal — browser test`, `PRUEBA temporal — Item F`) encontradas al verificar la limpieza propia — fuera del alcance de esta tarea, no borradas | `backend/src/routes/panelConfiguracion.js`; `backend/scripts/test_pendiente_36.mjs` (nuevo, conservado como regresión); `docs/PENDIENTES.md` (#36 cerrado, #39 nuevo); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-15 | **Pendiente #33 cerrado — `DROP TABLE configuracion_empresa`, a pedido explícito del Desarrollador ("borrala").** Tabla legacy sin código vivo que la consultara, pero con policy RLS de bypass total de `superadmin` sin acotar por prestadora — brecha latente detectada durante el ítem B del pendiente #30. Sin FKs que la referenciaran (verificado con `pg_constraint` antes de borrar). Ejecutado `DROP TABLE configuracion_empresa;` + `NOTIFY pgrst, 'reload schema';` contra Supabase real, confirmado con `information_schema.tables` que ya no existe. Revisado el comentario de `backend/src/routes/panelConfiguracion.js:19` que la mencionaba — se dejó sin tocar por ser nota histórica correcta, no referencia rota. Ningún archivo de código modificado, solo dato/esquema en Supabase | `docs/PENDIENTES.md` (#33 cerrado); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-15 | **Pendiente #35 (barrido de menciones a la prestadora original) cerrado + pendiente #38, borrado total de datos de actividad y de las filas de `prestadoras` no reales, a pedido explícito del Desarrollador.** Barrido de #35: 44 archivos / 411 ocurrencias de la marca de la prestadora original revisadas, mayoría legítima; dos hallazgos menores marcados como candidatos de inventario para la futura migración multi-tenant, no corregidos ahora (`panel/index.html:9`, `.github/workflows/deploy-backend.yml:29`). **Corrección explícita del Desarrollador durante la entrega del barrido:** la IA describió comentarios SQL históricos como referidos a la prestadora original como "la única prestadora real a esa fecha" — el Desarrollador remarcó que esa prestadora nunca fue ni es una prestadora real (sin contrato firmado, no es cliente). Esa corrección llevó a encontrar un bug de dato real: `prestadoras.estado='certificada'` en su fila (seedeado así en `backend/src/db/schema_multitenant_01.sql:58` durante la migración mono-tenant→multi-tenant de 2026-07-09), afirmando una certificación que nunca ocurrió — corregido a `estado='prospecto'` vía UPDATE directo en Supabase, con aprobación explícita del Desarrollador tras disclosure del efecto colateral (los dos jobs diarios `revisarVencimientos()`/`extenderSeriesGuardiaAbiertas()`, gateados en `estado='certificada'`, dejan de procesar la prestadora afectada). **A continuación, pedido explícito y textual del Desarrollador**: "elimina toda actividad registrada en la base de datos de todas las prestadoras que tengas. luego elimina todas las prestadoras (ninguna es real)". Ejecutado tras doble confirmación explícita vía pregunta directa (irreversible sin backup; y, al descubrirse que la única cuenta `superadmin` del sistema vivía en la prestadora Sandbox, conservar esa fila y su usuario). Un solo bloque transaccional PL/pgSQL (todo o nada) contra las 39 tablas con `prestadora_id` propia + `verificaciones_asistente` (resuelta aparte por no tener esa columna): Prestadora Demo borrada por completo (actividad + sus 4 cuentas `usuarios`/`auth.users` + la fila `prestadoras`); Sandbox Superadmin conservó su fila y su único usuario `superadmin`, con el resto de su actividad borrada igual. Verificado post-borrado con consultas reales: `prestadoras` con 1 sola fila (Sandbox); `usuarios` con 3 filas (1 `superadmin` de Sandbox + 2 `admin_plataforma` con `prestadora_id=NULL`, no tocadas por no estar scopeadas); `asistentes`/`familias`/`pacientes`/`guardias` en 0 filas. Ningún archivo de código tocado — solo datos en Supabase | `docs/PENDIENTES.md` (#35 cerrado, #38 nuevo); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-15 | **Pendiente #30, ítem H — MFA (TOTP) para `superadmin`/`admin_plataforma`, configurable on/off por el superadmin, no obligatorio sin excepción como decía el diseño previo.** Continuación directa de "uno a la vez hasta cubrirlos todos" (orden aprobado I→E→D→F→G→H) — **con este ítem, el pendiente #30 completo (A-I) queda cerrado**. **Decisión revisada explícitamente por el Desarrollador respecto del diseño original** ("Hasta tanto el sistema esté pulido y el usuario acostumbrado no queremos complejizarlo más allá de lo necesario. que sea configurable on off por el superadministrador del sistema, es decir por mí"): documentado en `CLAUDE.md` (nota junto al glosario de Superadmin/Admin_plataforma) y en `docs/PLAN_MULTITENANT_XEITRA.md:416` ("Revisado 2026-07-15"), para que "obligatorio sin excepción" no se reintroduzca sin leer el porqué. TOTP vía Supabase Auth nativo (`supabase.auth.mfa.*`), sin librería ni almacenamiento propio. Tabla nueva `configuracion_plataforma` (`backend/src/db/schema_admin_plataforma_04_mfa.sql`, aplicada contra Supabase real vía MCP) — singleton, `mfa_admin_obligatorio BOOLEAN DEFAULT FALSE`, RLS de lectura abierta a cualquier autenticado (evita un deadlock circular: el login necesita poder leer el toggle antes de lograr aal2) y escritura acotada a `es_superadmin()`. `es_superadmin()` pasó de `LANGUAGE sql` a `plpgsql`: con el toggle en `TRUE` exige además `(auth.jwt() ->> 'aal') = 'aal2'`; con el toggle en `FALSE` (default), igual que siempre. Capa Express: `requiereRolPanel.js` — `leerAalDelToken()` nuevo (decodifica el claim `aal` del JWT ya validado) y el mismo chequeo de toggle+aal2 para `superadmin`/`admin_plataforma`, devolviendo `403 {codigo:'mfa_requerido'}`. Ruta nueva `panelConfiguracionPlataforma.js` (`GET`/`PATCH /mfa`), acotada a `superadmin` únicamente (ni `admin_plataforma` puede tocar su propio requisito). Frontend: `AuthContext.jsx` agrega `mfaEstado`/`evaluarMfa()`; página nueva `Mfa.jsx` (enrolamiento con QR la primera vez, challenge+verify las siguientes); `ProtectedRoute.jsx` redirige a `/mfa` cuando corresponde; pestaña nueva "Seguridad" en `Configuracion.jsx` (solo `superadmin`) con el checkbox on/off. i18n completo (9 claves `auth`, 5 `configuracion`) en las 3 locales. **Probado de punta a punta**: (1) script descartable `backend/scripts/test_item_h_mfa.mjs` con TOTP RFC 6238 implementado a mano (módulo `crypto` nativo, sin sumar dependencia para un script de un uso) — toggle apagado por defecto pasa sin aal2 en Express y en RLS directa (`prestadoras`); toggle prendido bloquea ambas capas (403 `mfa_requerido`, 0 filas RLS) sin aal2; enrolar+verificar con código TOTP real → aal2, ambas capas vuelven a pasar; toggle apagado de nuevo quita el requisito. (2) navegador real (Playwright, Panel+backend locales, cuenta `superadmin` de prueba en la sandbox): activar el toggle desde Seguridad → redirige a `/mfa` con QR real → código verificado → Dashboard; logout/login → pantalla de verificación (no de enrolamiento, factor ya existente) → código correcto → entra; toggle apagado de nuevo. `npm run build` sin errores. Cuenta de prueba y config vueltos a su estado original en ambas pruebas, verificado con consulta (0 filas residuales). **Decisión explícita del Desarrollador, no construida esta sesión:** clave alfanumérica + biometría opcional (WebAuthn) para el login de Familia — sin superficie de login todavía (PWA Familias es Etapa 4, ninguna de las dos etapas empezada), documentado en `docs/PRD_04_05_App_Servicio.md` (login de PWA Asistente y PWA Familia) para construir cuando corresponda. **Sin mecanismo de recuperación por pérdida de dispositivo** (decisión explícita, "no esta sesión") — nuevo pendiente #37 | `backend/src/db/schema_admin_plataforma_04_mfa.sql` (nuevo, aplicado); `backend/src/routes/panelConfiguracionPlataforma.js` (nuevo); `backend/src/middleware/requiereRolPanel.js`; `backend/src/server.js`; `backend/scripts/test_item_h_mfa.mjs` (nuevo, script de prueba descartable conservado como regresión); `panel/src/context/AuthContext.jsx`; `panel/src/pages/Mfa.jsx` (nuevo); `panel/src/App.jsx`; `panel/src/components/layout/ProtectedRoute.jsx`; `panel/src/pages/Configuracion.jsx`; `panel/src/i18n/translations.js`; `CLAUDE.md`; `docs/PLAN_MULTITENANT_XEITRA.md`; `docs/PRD_04_05_App_Servicio.md`; `docs/PENDIENTES.md` (#30 cerrado A-I, #37 nuevo); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-15 | **Pendiente #30, ítem G — log de auditoría de `admin_plataforma`, cobertura completa (decisión explícita del Desarrollador vía pregunta directa: "Cobertura completa con triggers de base de datos"), implementado como diseño combinado de 3 capas tras detectar un gap arquitectónico antes de escribir código.** Continuación directa de "uno a la vez hasta cubrirlos todos" (orden aprobado I→E→D→F→G→H). **Hallazgo detectado antes de codear, disclosurado y aprobado con "ok":** el backend usa la Service Role Key (`backend/src/db/connection.js`), así que `auth.uid()` da NULL dentro de cualquier trigger de base disparado por una escritura ruteada por Express — un trigger-only hubiera dejado "cobertura completa" incompleta en silencio. Tabla nueva `auditoria_admin_plataforma` (`backend/src/db/schema_admin_plataforma_03_auditoria.sql`, aplicada contra Supabase real vía MCP): `admin_id`/`prestadora_id`/`tipo_evento` (`login`/`logout`/`renovacion`/`mutacion`)/`tabla_afectada`/`operacion`/`registro_id`/`detalle` JSONB; RLS de lectura: `superadmin` ve todo, `admin_prestadora` solo lo de su propia prestadora, sin policy de escritura para nadie. **Capa 1 (sesión, Express, JWT real):** `panelSesionTenant.js` — `registrarAuditoria()` nuevo en login, renovación, logout manual y logout automático (tope 60min/inactividad 5min, con el motivo en `detalle`). **Capa 2 (mutaciones vía Express):** `requiereRolPanel.js` — `registrarAuditoriaMutacionExpress()`, dispara solo para `admin_plataforma` con sesión de tenant activa en POST/PUT/PATCH/DELETE (excluyendo las rutas propias de sesión-tenant), solo si la respuesta terminó en 2xx. **Capa 3 (trigger de base, para escrituras con JWT real):** función nueva `es_sesion_tenant_admin_plataforma_activa()` (distinta de `current_tenant()` — chequea específicamente una sesión viva en `sesiones_tenant_admin_plataforma`, para no auditar de forma espuria la actividad normal de `admin_prestadora`/`coordinador`) + `fn_auditoria_admin_plataforma_mutacion()` aplicada como trigger genérico a las 35 tablas con `prestadora_id`/`current_tenant()`. **Lectura:** ruta nueva `panelAuditoria.js` (`GET /`, gateada a `superadmin`/`admin_prestadora`, filtra por `prestadora_id` para este último), registrada en `server.js`; página nueva `Auditoria.jsx` (4 estados, tabla con `descripcionEvento()` traduciendo motivo/tabla/operación), ruta `/auditoria` y nav link gateados a `['admin_prestadora','superadmin']`, i18n completo (`nav.auditoria` + sección `auditoria.*`) en las 3 locales. **Probado de punta a punta** con 3 scripts descartables (borrados al terminar): login/mutación/renovación/logout capturados correctamente por las capas 1 y 2 con JWT real de una cuenta `admin_plataforma` de prueba sobre la prestadora sandbox; `npm run build` del panel sin errores. **Hallazgo crítico detectado, verificado y disclosurado, no corregido en esta sesión (no es un bug nuevo — pertenece al ítem B ya cerrado de este mismo pendiente, con alcance explícitamente acotado):** ninguna de las policies RLS de las 35 tablas auditadas le da a `admin_plataforma` acceso directo — confirmado con grep dirigido sobre `backend/src/db/*.sql` y con una prueba real de RLS (JWT de `admin_plataforma`) que devolvió `[]` al leer `solicitudes` pese a sesión de tenant activa. Consecuencia: la Capa 3 está correctamente construida pero hoy no se dispara nunca en el uso real del Panel — toda mutación real de `admin_plataforma` pasa por Express con Service Role Key (capas 1 y 2, 100% verificadas). Registrado como precisión dentro del ítem B en `docs/PENDIENTES.md`, sin número nuevo. **H (MFA obligatorio) sigue sin empezar** | `backend/src/db/schema_admin_plataforma_03_auditoria.sql` (nuevo, aplicado); `backend/src/routes/panelSesionTenant.js`; `backend/src/middleware/requiereRolPanel.js`; `backend/src/routes/panelAuditoria.js` (nuevo); `backend/src/server.js`; `panel/src/pages/Auditoria.jsx` (nuevo); `panel/src/App.jsx`; `panel/src/components/layout/Layout.jsx`; `panel/src/i18n/translations.js`; `docs/PENDIENTES.md` (#30 actualizado); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-15 | **Pendiente #30, ítem F — advertencia agregada a las 17 confirmaciones destructivas de Regla 4 mientras hay una sesión de tenant activa.** Continuación directa de "uno a la vez hasta cubrirlos todos" (orden aprobado I→E→D→F→G→H). Función centralizada nueva `useConfirmarDestructivo()` (`panel/src/context/TenantSessionContext.jsx`) reemplaza los 17 `window.confirm(...)` esparcidos en 9 archivos (`Configuracion.jsx`×4, `Continuidad.jsx`×2, `ListaPrecioDetalle.jsx`, `guardias/GuardiaAcciones.jsx`×3, `PostulacionDetalle.jsx`×2, `asistentes/VinculoCeseTab.jsx`, `familias/PrestacionesPaciente.jsx`, `SolicitudDetalle.jsx`×2, `UsuariosPanel.jsx`) — antepone al mensaje original una línea con el nombre de la prestadora cuando hay sesión de tenant activa, y no agrega nada cuando no la hay (mismo comportamiento de siempre para uso normal de `admin_prestadora`/`superadmin`). Reutiliza el `TenantSessionContext` ya montado por el ítem E, sin duplicar el fetch de sesión. Clave i18n nueva `prestadoras.confirmar_advertencia_tenant` en las 3 locales. **Probado en navegador real** (Playwright, cuenta `admin_plataforma` de prueba, prestadora sandbox, Coordinador de prueba creado ad-hoc en `UsuariosPanel.jsx`): clic en "Dar de baja" con sesión de tenant activa mostró el diálogo nativo con "Estás dentro de Sandbox Superadmin, no en tu propia prestadora." antepuesto — texto capturado con `browser_handle_dialog`, no solo inferido leyendo el código; diálogo cancelado sin ejecutar la baja. **Hallazgo no bloqueante, registrado aparte como pendiente #36:** la sección de Configuración tiene su propio gate de rol en `panelConfiguracion.js` que no incluye a `admin_plataforma` (a diferencia de `panelUsuarios.js`, que sí lo incluye) — no pudo usarse para esta prueba puntual, se usó `UsuariosPanel.jsx` en su lugar. `npm run build` sin errores. Datos de prueba borrados al terminar, verificado con consulta. **G (log de auditoría), H (MFA obligatorio) siguen sin empezar** | `panel/src/context/TenantSessionContext.jsx`; `panel/src/i18n/translations.js`; `panel/src/pages/Configuracion.jsx`; `panel/src/pages/Continuidad.jsx`; `panel/src/pages/ListaPrecioDetalle.jsx`; `panel/src/pages/guardias/GuardiaAcciones.jsx`; `panel/src/pages/PostulacionDetalle.jsx`; `panel/src/pages/asistentes/VinculoCeseTab.jsx`; `panel/src/pages/familias/PrestacionesPaciente.jsx`; `panel/src/pages/SolicitudDetalle.jsx`; `panel/src/pages/UsuariosPanel.jsx`; `docs/PENDIENTES.md` (#30 actualizado, #36 nuevo); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-15 | **Pendiente #30, ítem D — timeout doble de la sesión de tenant de `admin_plataforma`: 5 min de inactividad (corte silencioso) + tope absoluto de 60 min con aviso a los 10 min restantes y reconfirmación.** Continuación directa de "uno a la vez hasta cubrirlos todos" (orden aprobado I→E→D→F→G→H). Investigación previa confirmó que el tope de 60 min ya estaba parcialmente enforced (`expira_at`, desde Fase 1) pero el de 5 min de inactividad no existía en absoluto (`ultima_actividad_at` se escribía una sola vez al crear la sesión y nunca más). **Hallazgo que cambió el diseño inicial:** buena parte del Panel consulta Supabase directo desde el frontend con RLS, no solo vía el backend Express — un enforcement solo en `requiereRolPanel.js` hubiera dejado sin protección esas queries directas. Se resolvió en dos capas: **DB** (`backend/src/db/schema_admin_plataforma_02_timeout.sql`, aplicado contra Supabase real vía MCP) — `current_tenant()` ahora exige también `ultima_actividad_at > NOW() - INTERVAL '5 minutes'`, no solo `expira_at > NOW()`. **Backend:** `requiereRolPanel.js` replica el mismo chequeo para `prestadoraId` en rutas Express y bumpea `ultima_actividad_at` en cada request real (excluye las rutas propias de `/sesion-tenant` para que el polling de estado no cuente como actividad y anule el propio timeout); `panelSesionTenant.js` — función compartida `buscarSesionVigenteYCerrarSiVencio` (cierra `salida_at` si venció, usada por `GET /`, `POST /renovar` y la ruta nueva `POST /actividad`); `POST /renovar` nuevo extiende `expira_at` otros 60 min, solo si la sesión sigue vigente. **Frontend:** la "actividad" real la marca `TenantSessionContext.jsx` escuchando `click`/`keydown` (throttled a 1/min) y llamando a `POST /actividad` — el timeout depende de interacción real del usuario, no de cuántos requests dispara cada pantalla; polling de `GET /sesion-tenant` cada 30s para que el banner refleje el corte automático sin recargar. `BannerSesionTenant` (`Layout.jsx`) cambia a una variante de advertencia (fondo `--rojo-peligro`) cuando faltan ≤10 min para `expira_at`, con botón nuevo "Seguir trabajando" que llama a `/renovar`. Claves i18n nuevas (`sesion_advertencia`, `seguir_trabajando`, `renovando`) en las 3 locales. **Probado de punta a punta en navegador real** (Playwright, cuenta `admin_plataforma` de prueba creada y borrada al terminar, prestadora sandbox): entrar → banner normal; `expira_at` adelantado a 8 min vía Supabase directo + recarga → banner de advertencia con "Seguir trabajando"; clic → banner vuelve a normal con `expira_at` extendido (verificado con la hora mostrada); `ultima_actividad_at` atrasado 6 min vía Supabase directo + recarga → sesión desaparece del banner, ambos botones "Entrar" se reactivan — confirmado también contra la base que `salida_at` quedó seteado, no es solo un efecto visual. `npm run build` sin errores. **F (advertencia en confirmaciones destructivas), G (auditoría), H (MFA) siguen sin empezar** | `backend/src/db/schema_admin_plataforma_02_timeout.sql` (nuevo, aplicado); `backend/src/middleware/requiereRolPanel.js`; `backend/src/routes/panelSesionTenant.js`; `panel/src/context/TenantSessionContext.jsx`; `panel/src/components/layout/Layout.jsx`; `panel/src/index.css`; `panel/src/i18n/translations.js`; `docs/PENDIENTES.md` (#30 actualizado); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-14 | **Pendiente #30, ítem I — selector de prestadora en el Panel para `admin_plataforma`/`superadmin`, construido y probado de punta a punta; cierra también el pendiente #26.** Continuación directa de "uno a la vez hasta cubrirlos todos" con el reordenamiento aprobado ("si") I→E→D→F→G→H, porque D y E no eran probables sin un punto de entrada real de I. **Backend:** `GET /api/panel/prestadoras` nuevo (`backend/src/routes/panelPrestadoras.js`, registrado en `backend/src/server.js`), lista `id, nombre_fantasia, estado`, acotado a `admin_plataforma`/`superadmin`. **Frontend:** página nueva `panel/src/pages/Prestadoras.jsx` (lista con botón "Entrar" por fila, banner de sesión activa con hora de vencimiento formateada y botón "Salir de la prestadora", ambos reusando los endpoints `/sesion-tenant` y `/sesion-tenant/salir` ya construidos en Fase 1); ruta `/prestadoras` en `App.jsx`; nav link en `Layout.jsx` visible solo para esos 2 roles. `UsuariosPanel.jsx`: selector `prestadora_id` nuevo (obligatorio) visible para `superadmin` al elegir rol `admin_prestadora` en el alta de una cuenta nueva, poblado desde el mismo endpoint — cierra el pendiente #26. i18n agregado en las 3 locales. **Hallazgo no previsto en el checklist original, corregido en el mismo movimiento (flagueado al Desarrollador por Regla 12.1/12.2):** `panel/src/components/layout/ProtectedRoute.jsx` no incluía `admin_plataforma` en su lista de roles válidos para iniciar sesión en el Panel — pese a que `roles.js`/`requiereRolPanel.js` ya lo trataban como rol válido desde Fase 1, cualquier cuenta `admin_plataforma` real habría sido rebotada a `/login`; corregido agregándolo. **Probado de punta a punta:** `backend/scripts/test_item_i_prestadoras.js` (nuevo, permanente) — listar/entrar/bloquear-doble-entrada-409/salir con JWT real de una cuenta `admin_plataforma` de prueba contra una prestadora dummy, todo limpiado al terminar; superadmin también puede listar (verificado aparte); navegador real (Playwright) con login de cuenta `admin_plataforma` de prueba (confirma el fix de `ProtectedRoute.jsx` de arriba), página Prestadoras con las 2 prestadoras reales, Entrar/Salir funcionando con el banner correcto; login de cuenta `superadmin` de prueba, selector de Prestadora en `UsuariosPanel.jsx` poblado, cuenta `admin_prestadora` creada con `prestadora_id` verificado por consulta directa a la base coincidiendo con lo elegido. Las 4 cuentas de prueba y la prestadora dummy borradas al terminar. `npm run build` del panel sin errores. **Hallazgo no bloqueante, no corregido en esta sesión (nuevo pendiente #34):** columna "Rol" de `UsuariosPanel.jsx` en blanco para cuentas `admin_prestadora` por mismatch de clave i18n (`rol_${u.rol}` busca `rol_admin_prestadora`, la clave real es `rol_admin`). `docs/PENDIENTES.md` actualizado: #30 (ítem I completo, reordenamiento documentado), #26 cerrado (🟢), #34 nuevo agregado. **Ítems D (timeouts), E (banner), F (advertencia en confirmaciones destructivas), G (auditoría), H (MFA) siguen sin empezar** | `backend/src/routes/panelPrestadoras.js` (nuevo); `backend/src/server.js`; `backend/scripts/test_item_i_prestadoras.js` (nuevo); `panel/src/pages/Prestadoras.jsx` (nuevo); `panel/src/components/layout/ProtectedRoute.jsx`; `panel/src/App.jsx`; `panel/src/components/layout/Layout.jsx`; `panel/src/pages/UsuariosPanel.jsx`; `panel/src/i18n/translations.js`; `docs/PENDIENTES.md` (#30, #26, #34); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-14 | **Pendiente #30, ítem E — banner permanente "modo dentro de una prestadora", visible en cualquier ruta del Panel.** Continuación directa de "uno a la vez hasta cubrirlos todos" (orden aprobado I→E→D→F→G→H). Contexto compartido nuevo `panel/src/context/TenantSessionContext.jsx` (provee `sesion`/`recargar`/`salir`, consulta `GET /api/panel/sesion-tenant` solo para `admin_plataforma`/`superadmin`, montado en `App.jsx`), consumido por el banner nuevo (`BannerSesionTenant` en `Layout.jsx`, sticky arriba del header, fondo `--naranja-alerta`, con botón "Salir de la prestadora") y por `Prestadoras.jsx` (refactorizada para no duplicar su propio fetch de sesión — ambos quedan sincronizados). Reutiliza las claves i18n ya existentes de `prestadoras.*`, no hizo falta texto nuevo. CSS nuevo en `index.css`. **Probado de punta a punta en navegador real** (Playwright, cuenta `admin_plataforma` de prueba creada y borrada al terminar): login correcto, "Entrar" a la prestadora sandbox desde `/prestadoras` → banner aparece; navegación a `/` (Dashboard, ruta sin relación) → el banner sigue visible, confirmando que es global; "Salir de la prestadora" desde el banner (no desde la página Prestadoras) → banner desaparece. `npm run build` sin errores. **D (timeouts), F (advertencia en confirmaciones destructivas), G (auditoría), H (MFA) siguen sin empezar** | `panel/src/context/TenantSessionContext.jsx` (nuevo); `panel/src/components/layout/Layout.jsx`; `panel/src/pages/Prestadoras.jsx`; `panel/src/App.jsx`; `panel/src/index.css`; `docs/PENDIENTES.md` (#30 actualizado); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-14 | **Pendiente #30, ítem B — `es_superadmin()` acotado a la prestadora sandbox, eliminando el bypass total sobre las policies RLS. Aplicado contra Supabase real y probado con RLS real de punta a punta.** Kickoff explícito del Desarrollador el mismo día ("si", tras la Fase 1), con dos rondas de aclaración sobre la sandbox: queda **permanente para siempre**, solo se borran los datos de prueba usados para verificar; `escalas_legales` confirmado global a propósito (escalas legales nacionales, iguales para toda prestadora del mismo país), no se toca. **DB (`backend/src/db/schema_admin_plataforma_02_acotar_superadmin.sql`, aplicado vía MCP):** (1) prestadora sandbox permanente creada (`id=5d727437-a5ff-432f-b9f6-10015e61ffef`, `estado='prospecto'`, "Sandbox Superadmin (uso técnico interno, no es una prestadora real)"); (2) la única cuenta `superadmin` real reasignada a esa sandbox; (3) barrido mecánico — un bloque `DO $$` que lee las policies existentes directo de `pg_policies` (no transcriptas a mano) y las reescribe vía `ALTER POLICY` reemplazando `es_superadmin()` por `(es_superadmin() AND (prestadora_id = current_tenant()))` — 37 policies reescritas, verificado con una consulta post-migración a `pg_policies` que las 37 muestran el texto nuevo; (4) 2 casos especiales fuera del patrón mecánico: `prestadoras` (la tabla ES el tenant, compara `id` no `prestadora_id`) y `verificaciones_asistente` (sin `prestadora_id` propia, JOIN a `asistentes.prestadora_id`); (5) `configuracion_empresa` (tabla legacy sin queries reales, verificado con `grep`) y `escalas_legales` (global a propósito) excluidos deliberadamente del barrido — verificado con la misma consulta a `pg_policies` que siguen con el bypass total anterior sin tocar; `configuracion_empresa` queda registrada como pendiente nuevo (#33) para una futura decisión de `DROP TABLE`. **Backend:** hueco cerrado en `backend/src/routes/panelUsuarios.js:70-77` — `superadmin` ya no puede overridear `prestadora_id` al crear otra cuenta `superadmin` (antes podía asignarle una prestadora real a un `superadmin` nuevo, evadiendo el acotamiento recién aplicado; ahora una cuenta `superadmin` nueva siempre nace en la sandbox del creador, mismo criterio que el resto de las cuentas sin override). **Probado de punta a punta con RLS real, no Service Role Key** (`backend/scripts/test_item_b_scope_superadmin.js`, nuevo, utilidad de prueba reutilizable): crea una cuenta `superadmin` de prueba + un Asistente en la sandbox + un Asistente en la prestadora real original, inicia sesión como ese `superadmin` con su propio JWT (vía `signInWithPassword`, no el Service Role Key que usa el resto del backend), y confirma con dos lecturas directas contra Supabase que ve el Asistente de la sandbox y **no** ve el de la prestadora original — ambos resultados correctos. Datos de prueba borrados al terminar (cuenta superadmin de prueba, 2 Asistentes de prueba y sus 2 usuarios placeholder, con sus 3 cuentas Auth), verificado con consulta post-limpieza: 0 filas residuales de "PRUEBA temporal" en `usuarios`/`asistentes`. Sandbox permanente intacta, confirmado sin tocarla en la limpieza. `docs/PENDIENTES.md` #30 actualizado con el detalle completo del ítem B; pendiente nuevo #33 agregado (`configuracion_empresa` sin acotar, código muerto). **Ítems D (timeouts), E (banner), F (advertencia en confirmaciones destructivas), G (auditoría), H (MFA) e I (selector de prestadora) siguen sin empezar** | `backend/src/db/schema_admin_plataforma_02_acotar_superadmin.sql` (nuevo, aplicado); `backend/src/routes/panelUsuarios.js`; `backend/scripts/test_item_b_scope_superadmin.js` (nuevo, utilidad de prueba reutilizable); `docs/PENDIENTES.md` (#30 actualizado, #33 nuevo); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-14 | **Pendiente #30, Fase 1 — kickoff de implementación del rol `admin_plataforma` + sesión de tenant dinámica, construida y probada de punta a punta.** Kickoff explícito del Desarrollador ("vamos con el pendiente 30"), alcance de esta sesión acordado como Fase 1 (ítems A+C del desglose del diseño ya cerrado en `docs/PLAN_MULTITENANT_XEITRA.md` 3.4/3.4.1), con instrucción de que el pendiente sigue abierto hasta cubrir los ítems B-I (acotar `es_superadmin()`, timeouts, banner, advertencia en confirmaciones destructivas, log de auditoría, MFA, selector de prestadora). **DB (`backend/src/db/schema_admin_plataforma_01.sql`, aplicado contra Supabase real vía MCP):** rol `admin_plataforma` sumado al `CHECK` de `usuarios.rol`; `usuarios.prestadora_id` admite `NULL` solo para ese rol (`CHECK` dedicado que sigue exigiéndolo `NOT NULL` para los 5 roles existentes); tabla nueva `sesiones_tenant_admin_plataforma` (`entrada_at`/`ultima_actividad_at`/`expira_at`/`salida_at`, índice único parcial que impide dos sesiones vigentes simultáneas del mismo admin, RLS propia); `current_tenant()` reescrita con `COALESCE` — si hay una sesión vigente (sin `salida_at`, sin expirar) la usa, si no cae al `usuarios.prestadora_id` de siempre, 100% retrocompatible para los 5 roles preexistentes (confirmado leyendo la función ya aplicada con `pg_get_functiondef`). **Backend:** `requiereRolPanel.js` reconoce el rol nuevo y resuelve `prestadoraId` desde la sesión activa (o `null` si no hay); router nuevo `panelSesionTenant.js` (GET sesión actual, POST entrar — 409 si ya hay una vigente, POST salir), registrado en `server.js`; `panelUsuarios.js` reutiliza el mismo scoping por `prestadoraId` que ya usa `admin_prestadora` sin ninguna rama nueva por rol, con un corte explícito (400) si `admin_plataforma` no tiene sesión activa — bug encontrado en la prueba real: sin ese corte, pasar `prestadoraId=null` a `.eq('prestadora_id', ...)` de supabase-js rompía contra Postgres (`invalid input syntax for type uuid: "null"`) en vez de devolver una lista vacía o un error controlado. **Frontend:** `panel/src/lib/roles.js` — `admin_plataforma` sumado a `ROLES_PANEL` y a `esAdminOSuperior()` (hereda acceso a toda la UI admin-gated ya existente, sin cambios en los 9 archivos que usan ese helper). **Probado de punta a punta con requests HTTP reales contra un backend local corriendo, con una cuenta `admin_plataforma` de prueba (JWT real vía login, no simulación):** GET sin sesión → `{sesion:null}`; POST entrar → 200 con `prestadora_id`/`entrada_at`/`expira_at`; POST entrar de nuevo sin salir antes → 409 (confirma el índice único); GET `/api/panel/usuarios` con sesión activa → lista correctamente scoped a esa prestadora (3 cuentas reales de Prestadora Demo, ninguna de otra); POST salir + GET `/api/panel/usuarios` sin sesión → 400 explícito (confirma el fix del bug de `null`, sin fuga de datos ni crash). Cuenta y sesión de prueba borradas al terminar, verificado con conteo en 0. `docs/PENDIENTES.md` #30 actualizado a 🟡 (Fase 1 cerrada, B-I explícitamente pendientes) — no se cierra del todo porque el Desarrollador pidió que el pendiente quede abierto hasta completar A-I | `backend/src/db/schema_admin_plataforma_01.sql` (nuevo, aplicado); `backend/src/middleware/requiereRolPanel.js`; `backend/src/routes/panelSesionTenant.js` (nuevo); `backend/src/routes/panelUsuarios.js`; `backend/src/server.js`; `backend/scripts/seed_test_admin_plataforma.js` (nuevo, utilidad de prueba reutilizable); `panel/src/lib/roles.js`; `docs/PENDIENTES.md` (#30 actualizado); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-14 | **Cierre de servicio — diagnóstico y fix definitivo del bug de cascada silenciosa (RLS), verificado end-to-end en navegador real, datos de prueba limpiados.** Continuación de la sesión que había aplicado `schema_cierre_servicio_paciente.sql` contra Supabase (pendiente #32) sin haber probado el flujo real: al probarlo, `prestaciones`/`paquetes_prestaciones` sí quedaban `de_baja`, pero `series_guardias`/`guardias` seguían activas sin ningún error — dos correcciones anteriores en `schema_cierre_servicio_zona_fix.sql` (agregar `WITH CHECK`) no lo habían resuelto porque el diagnóstico estaba mal encaminado. **Causa raíz real, confirmada con requests HTTP autenticados reales (JWT real vía `/auth/v1/token`, no simulación SQL):** una policy RLS declarada solo `FOR UPDATE` no le da a Postgres visibilidad de `SELECT` para evaluar el `WHERE` de un `UPDATE` — esa visibilidad la dan únicamente policies `SELECT`/`ALL`. El Coordinador de prueba no tenía ninguna policy `SELECT`/`ALL` sobre `series_guardias`/`guardias` de un Asistente fuera de su zona, así que el `UPDATE` no encontraba la fila, sin error visible. **Fix:** `schema_cierre_servicio_zona_fix.sql` reescrito (tercera vuelta) para declarar `coordinador_cierra_servicio_series_guardias`/`coordinador_cierra_servicio_guardias` como `FOR ALL` en vez de `FOR UPDATE` — aplicado contra Supabase real y verificado. **Segundo bug, independiente, encontrado en la misma prueba:** la notificación cruzada (`notificaciones_cierre_servicio`, diseñada en la sesión anterior) no se disparaba porque el pre-fetch de Asistentes/zonas en `PrestacionesPaciente.jsx` corría antes del `INSERT` en `cierres_servicio_paciente` del que depende la policy del fix anterior — reordenado para que el `INSERT` corra primero. Ambos fixes verificados con una prueba end-to-end completa en navegador real (Playwright: login como Coordinador de prueba, clic real en "Cerrar servicio", confirmación de diálogo) contra la base real, confirmando la cascada completa y el registro de notificación con todos sus campos. **Verificación adicional pedida por el Desarrollador:** confirmado que Superadmin no puede ejecutar el cierre — ni por UI (`PrestacionesPaciente.jsx:511` no renderiza la sección para su rol) ni por RLS (`cierres_servicio_paciente` no tiene bypass `es_superadmin()`); sí conserva acceso técnico genérico preexistente a `prestaciones`/`paquetes_prestaciones`/`series_guardias`/`guardias` por fuera de este flujo (mismo patrón que el resto del Panel, no es un gap nuevo). **Datos de prueba borrados de Supabase al cierre de la sesión** (paciente/familia/asistente/coordinador de prueba y todas sus filas asociadas en `pacientes`, `familias`, `asistentes`, `usuarios`, `auth.users`, `prestaciones`, `paquetes_prestaciones`, `series_guardias`, `guardias`, `cierres_servicio_paciente`, `notificaciones_cierre_servicio`), confirmado con conteo en cero — no queda ningún rastro en la base real. Pendiente #32 de `docs/PENDIENTES.md` cerrado | `backend/src/db/schema_cierre_servicio_zona_fix.sql` (reescrito v3); `panel/src/pages/familias/PrestacionesPaciente.jsx` (reorden del pre-fetch); `backend/src/db/schema_notificaciones_cierre_servicio.sql` (ya aplicado en sesión anterior, commiteado recién ahora); `docs/PENDIENTES.md` (#32 cerrado); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-14 | **Cierre de servicio a nivel Paciente + extensión automática del horizonte de generación de guardias — diseñado y construido completo en la misma sesión, a pedido explícito del Desarrollador ("Diseñar el cierre de servicio ahora mismo, en esta sesión").** Resuelve el candidato (2) del pendiente #18. Origen: durante el cierre del candidato (2) el Desarrollador señaló que "cancelar una guardia no es lo mismo que cancelar un servicio" y que el horizonte fijo de 90 días (`DIAS_GENERACION_SIN_VIGENCIA_HASTA`) era un artefacto técnico de generación por lotes, no una regla de negocio — su ausencia de renovación era un bug real (una serie sin `vigente_hasta` dejaba de producir guardias nuevas en silencio pasado el día 90). Se separó en dos mecanismos independientes: **(a) Horizonte configurable + extensión automática:** `prestadoras.dias_generacion_series_guardia` (columna nueva, default 90, editable por cada `admin_prestadora` en Configuración → pestaña Servicios) reemplaza la constante fija de `NuevaGuardiaModal.jsx`; cron nuevo `backend/src/utils/generacionSeriesGuardia.js` (`extenderSeriesGuardiaAbiertas`, registrado en `backend/src/server.js`, corre una vez por día) mantiene siempre ese horizonte de guardias generadas por delante de "hoy" para toda serie `activa` sin `vigente_hasta` — proceso 100% interno, nunca visible en ninguna pantalla. **(b) Cierre de servicio:** tabla nueva `cierres_servicio_paciente` (motivo obligatorio `fin_demanda`/`fallecimiento`/`otro`, nunca borra registros) con cascada que da de baja todas las Prestaciones/Paquetes `vigente` y cancela toda `series_guardias` `activa` y toda `guardias` `programada` (no iniciada) de un Paciente — nunca toca guardias pasadas/completadas ni Prestaciones ya `de_baja`. **Restricción de autorización explícita del Desarrollador ("los unicos habilitados... son el coordinador y el administrador de la prestadora"):** la policy RLS de `cierres_servicio_paciente` omite a propósito el bypass `es_superadmin()` que usa el resto del proyecto — Superadmin no puede cerrar servicios, decisión documentada con comentario inline en el SQL. Implementado vía Supabase directo desde el frontend (no ruta de `panelConfiguracion.js`, que es admin-only y hubiera excluido a Coordinador de la acción) en `PrestacionesPaciente.jsx`, con `window.confirm()` (Regla 4) y botón deshabilitado mientras procesa (Regla 5). La configuración del horizonte (solo lectura/escritura de la config, no la acción de cierre) sí va por `panelConfiguracion.js`, ya que todo Módulo 8 es admin-only. i18n completo en las 3 locales. **Aplicado y verificado contra Supabase real más tarde en la misma sesión** — el MCP de Supabase sí estaba disponible (afirmé lo contrario primero sin chequearlo, corregido cuando el Desarrollador lo señaló, Regla 12.5): `dias_generacion_series_guardia` con default 90 confirmado por `information_schema.columns`, `cierres_servicio_paciente` con RLS activa y la policy sin `es_superadmin()` confirmada por `pg_policies`, las 6 constraints (incluido el FK compuesto de tenant) confirmadas por `pg_constraint` — ver pendiente #32. Sin probar en navegador real todavía. Sin commit/push (no pedido explícitamente) | `backend/src/db/schema_cierre_servicio_paciente.sql` (nuevo, sin aplicar); `backend/src/utils/generacionSeriesGuardia.js` (nuevo); `backend/src/server.js` (cron registrado); `backend/src/routes/panelConfiguracion.js` (rutas `/guardias/horizonte-generacion`); `panel/src/pages/guardias/NuevaGuardiaModal.jsx` (horizonte dinámico); `panel/src/pages/familias/PrestacionesPaciente.jsx` (UI de cierre de servicio); `panel/src/pages/Configuracion.jsx` (campo de horizonte en pestaña Servicios); `panel/src/i18n/translations.js` (claves nuevas en es-AR/en/pt-BR); `docs/PENDIENTES.md` (#18 candidato 2 resuelto en código, #32 nuevo); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-14 | **Corrección de los dos banners de estado desactualizados encontrados en la lectura completa de la entrada anterior.** `docs/PRD_06_WhatsApp_IA.md:3-9` decía "esto no es todavía luz verde para escribir código" — corregido a estado ✅ implementado/desplegado/probado, con remisión a pendiente #9 (🟢 Resuelto 2026-07-13). `docs/BUILD_ORDER.md:20` decía que WhatsApp "no implementar todavía" — corregido a resuelto, mismo pendiente #9. Al tocar `docs/BUILD_ORDER.md:19` (fila de multi-tenant) para sumar el pendiente #30 (pedido explícito), se encontró además que la fila decía "solo falta Bloque 4" cuando ese bloque ya está aplicado y verificado desde el 2026-07-13 (`docs/PROGRESS.md`, entrada "hallazgos críticos" de esa fecha) — corregido en el mismo movimiento en vez de dejarlo con una afirmación conocida como incorrecta (Regla 12.5); lo que queda abierto de esa fila son los pendientes #26 (selector de prestadora) y #30 (roles `superadmin`/`admin_plataforma`), ambos citados con su documento de diseño. Extensión de alcance señalada al Desarrollador antes de aplicarse, no en silencio (Regla 12.1) | `docs/PRD_06_WhatsApp_IA.md`; `docs/BUILD_ORDER.md`; `docs/PROGRESS.md` (esta entrada) |
| 2026-07-14 | **Lectura completa de los 21 documentos de `docs/` (a pedido explícito del Desarrollador, tras detectar que una sesión anterior había afirmado cobertura sin haberla hecho) + creación de `docs/Reserva Historica/` para archivar documentos con instrucciones ya cumplidas y sin riesgo en dejar de consultarlos.** De la lectura completa surgió, verificado con cita exacta (Regla 12.3): `docs/PRD_06_WhatsApp_IA.md:3-9` y `docs/BUILD_ORDER.md:20` seguían diciendo que WhatsApp+IA no tenía luz verde de implementación, pese a que `docs/PENDIENTES.md` #9 ya lo tenía 🟢 Resuelto desde el mismo día (2026-07-13) — señalado al Desarrollador, corrección todavía sin aplicar (queda como pendiente nuevo si se decide corregir esos dos banners). **Primer y único documento movido a `docs/Reserva Historica/` en esta sesión**: `Prompt_Claude_Code_Kickoff_Implementacion.md` (`git mv`, historial preservado) — sus 4 Bloques (aislamiento de datos, RLS, backend, `configuracion_prestadora`+hardcodeos) están todos ejecutados y verificados contra Supabase real; lo que sigue abierto del multi-tenant (pendientes #18/#26/#30) es trabajo nuevo posterior, no instrucciones suyas sin cumplir. Referencias de ruta actualizadas en los 4 lugares donde el archivo se cita como vigente: `CLAUDE.md:84`, `docs/PLAN_MULTITENANT_XEITRA.md:664`, `backend/src/db/schema_multitenant_01.sql:2`, `backend/src/db/schema_multitenant_02.sql:2`. No se tocaron las menciones de `docs/PROGRESS.md`/`docs/PENDIENTES.md` anteriores a hoy — describen hechos de cuando la ruta vieja era correcta. El resto de `docs/` se evaluó contra el mismo criterio y no calificó: PRDs siguen siendo referencia de aceptación (se usaron para auditar etapas ya "terminadas"), `PLAN_CONTINUIDAD_PROVEEDORES.md` existe explícitamente para consultarse ante una necesidad futura, y el resto tiene ítems todavía sin decisión | `CLAUDE.md`; `docs/PLAN_MULTITENANT_XEITRA.md`; `backend/src/db/schema_multitenant_01.sql`; `backend/src/db/schema_multitenant_02.sql`; `docs/Reserva Historica/Prompt_Claude_Code_Kickoff_Implementacion.md` (movido); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-13 | **Multi-tenant real: cierre de los 2 hallazgos críticos de la auditoría exhaustiva (resolución de tenant por dominio + singleton `configuracion_empresa`) y barrido de código para escindir "el código de un licenciatario, del de otro y del común"** — instrucción explícita y de máximo alcance del Desarrollador ("quiero que hagas lo necesario para que no hayan mas conflictos ni confusiones... que el soft sea de una vez por todas multiempresa y que no se mezcle mas el nombre de la prestadora original ni el codigo ni en la documentacion"). **Actualización — `schema_multitenant_04.sql` aplicado y verificado contra Supabase real** por el Desarrollador en una sesión con el MCP de Supabase conectado, mismo día: `SELECT * FROM configuracion_prestadora;` → 1 fila real de la prestadora original (`prestadora_id=874f54d7-4383-4d54-8b9f-f51d02f0dd11`, resto de columnas migradas correctas), sin el bug de orden de seeds visto en el pendiente #22, RLS habilitada y `NOTIFY pgrst, 'reload schema';` confirmado corrido. Ver pendiente #25 (🟢 Resuelto). **Fase 1 — `configuracion_empresa` (singleton, `id=1`) → `configuracion_prestadora` (por `prestadora_id`, RLS con `current_tenant()`/`es_superadmin()`):** `backend/src/db/schema_multitenant_04.sql` (nuevo, migra la fila existente, termina con `NOTIFY pgrst, 'reload schema'` — Regla 13.2); `panelConfiguracion.js`/`panelNotificaciones.js`/`configuracionPublica.js` ya apuntan a la tabla nueva. **Fase 2 — resolución de tenant por dominio para rutas públicas sin sesión:** `backend/src/middleware/resolverPrestadoraPublica.js` (nuevo, resuelve por `Origin`/`Referer`/`Host` contra `configuracion_prestadora.dominio`, con fallback a "la única prestadora" para desarrollo local/curl), aplicado a `configuracionPublica.js`/`solicitudServicio.js`/`postulacionAsistente.js`; `vencimientos.js` reescrito para recorrer todas las prestadoras `certificada` en vez de una sola fija; eliminado `backend/src/db/tenantTemporal.js` y toda referencia a `PRESTADORA_PUBLICA_ID`. **Fase 3 — onboarding de licenciatarias nuevas:** `panelUsuarios.js` (POST `/`) ahora acepta `prestadora_id` opcional cuando quien crea el usuario es `superadmin`; el selector en el Panel (`UsuariosPanel.jsx`) queda explícitamente sin construir, documentado como pendiente nuevo (#26) en vez de expandir el alcance en silencio. **Fase 4 — hardcodes de "Prestadora Demo" en `sitio-web` (nombre real de marca usado como si fuera fijo, en vez de venir de la configuración de cada prestadora):** `email.js` (destinatario de fallback pasa a ser el email de la propia prestadora, no la casilla compartida de `SMTP_USER`); `robots.js`/`sitemap.js` (usan el `Host` real de la request vía `next/headers` en vez de un dominio fijo); `manifest.js`, `layout.jsx` y los 6 `generateMetadata` de página usan `empresa.nombre` dinámico; `Header.jsx`/`Footer.jsx`/`WhatsAppButton.jsx` reciben `nombreEmpresa` por prop. **Bug encontrado y corregido en el camino:** los textos de `translations.js` que necesitaban interpolar el nombre de la empresa se habían convertido primero en funciones dentro del diccionario `T` — rompió el build (`Functions cannot be passed directly to Client Components`) porque ese diccionario completo se pasa como prop a componentes `'use client'` y React no puede serializar funciones a través del límite servidor/cliente; revertido a strings con un placeholder literal `{empresa}` + función auxiliar `conNombreEmpresa()` en `configuracionPublica.js` que interpola en el punto de uso (no dentro del diccionario). `npm run build` de `sitio-web` verde tras corregir los 3 call-sites que quedaron con la sintaxis vieja de función (`contacto/page.jsx`, `trabaja-con-nosotros/page.jsx`, `TrabajaConNosotrosForm.jsx`). **Fase 5 — barrido terminológico en comentarios de código:** genericadas las menciones que asumían a la prestadora original como único tenant ("Asistente de [nombre anterior]" → "Asistente de la prestadora") en `GuardiaAcciones.jsx`, `ausenciaAutomatica.js`, `revisarNotificacionesCoordinador.js`, y 3 comentarios de schemas SQL (`schema_modulo6_guardias.sql`, `schema_modulo6_guardias_03.sql`, `schema_multitenant_03.sql`) — preservadas las menciones genuinamente históricas/factuales (seeds reales con el UUID fijo de la primera prestadora, nombre real en `schema_multitenant_01.sql`/`schema_etapa2h.sql`). **No se extendió el mismo barrido a `docs/*.md`** (18 archivos) por una tensión real con el propio `CLAUDE.md`, que indica conservar "Prestadora Demo" como marca correcta del negocio y como primera prestadora/licenciataria real — no todo uso ahí es un supuesto de arquitectura incorrecto; queda como pendiente nuevo (#27) para una revisión documento por documento, no un reemplazo mecánico. `npm run build` verde en `sitio-web` y en `panel`; `node --check` sin errores en los 11 archivos de `backend/` tocados. Ver `docs/PENDIENTES.md` #25 (SQL sin aplicar), #26 (UI de selector de prestadora), #27 (barrido de docs) | `backend/src/db/schema_multitenant_04.sql` (nuevo, sin aplicar); `backend/src/middleware/resolverPrestadoraPublica.js` (nuevo); `backend/src/routes/{panelConfiguracion,panelNotificaciones,configuracionPublica,solicitudServicio,postulacionAsistente,panelUsuarios}.js`; `backend/src/utils/{vencimientos,email,ausenciaAutomatica,revisarNotificacionesCoordinador}.js`; `backend/src/db/tenantTemporal.js` (eliminado); `panel/src/pages/guardias/GuardiaAcciones.jsx` (comentario); `backend/src/db/{schema_modulo6_guardias,schema_modulo6_guardias_03,schema_multitenant_03}.sql` (comentarios); `sitio-web/src/app/robots.js`, `sitio-web/src/app/sitemap.js`, `sitio-web/src/app/manifest.js`, `sitio-web/src/app/[locale]/layout.jsx`, `sitio-web/src/app/[locale]/{contacto,terminos,privacidad,servicios,solicita-servicio,trabaja-con-nosotros}/page.jsx`, `sitio-web/src/app/[locale]/trabaja-con-nosotros/TrabajaConNosotrosForm.jsx`, `sitio-web/src/components/{Header,Footer,WhatsAppButton}.jsx`, `sitio-web/src/lib/configuracionPublica.js`, `sitio-web/src/i18n/translations.js`; `docs/PENDIENTES.md` (#25/#26/#27 nuevos); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-13 | **Pendiente #24 cerrado — `schema_certificados_medicos_storage.sql` aplicado y verificado contra Supabase real, feature de certificado médico probada de punta a punta en navegador real** (sesión distinta, con MCP de Supabase y Playwright conectados, instruida desde esta conversación). Archivo leído completo antes de aplicar (26 líneas): bucket privado `certificados-medicos` + `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`. El `INSERT` del bucket se aplicó sin problema; el `ALTER TABLE` falló con `ERROR 42501: must be owner of table objects` — el rol de migración de un proyecto Supabase gestionado no es dueño de `storage.objects` en un proyecto administrado. No bloqueante: verificado con `SELECT relrowsecurity FROM pg_class WHERE relname='objects'` que RLS ya estaba en `true` por default de Supabase, así que el estado exigido por la verificación se cumple igual, documentado el desvío en vez de asumirlo resuelto en silencio (Regla 12.5). Segunda consulta de verificación (bucket presente, `public=false`) confirmada contra `storage.buckets`. **Hallazgo antes del test de navegador:** el primer intento de probar la feature no encontró la sección "Certificado médico" en el Panel desplegado — investigado con `git status`/`git log`, confirmó que `panelAusencias.js`, `AusenciasCoberturaTab.jsx` y el `.sql` nunca se habían commiteado/pusheado (contradecía la premisa de la tarea de que ya estaban commiteados), corroborado independientemente con un `fetch()` a la ruta de producción (`404` en vez del `401` esperado si el middleware de auth corriera). Reportado, no asumido; una vez commiteado y desplegado (commit `bf2a745`, verificado con `git log`/`git status --short` limpio y la misma ruta pasando de `404`→`401`), se repitió el test completo. **Prueba en navegador real (Playwright) contra el Panel desplegado:** datos de prueba temporales (cuenta Auth real + Asistente + ausencia, con limpieza total al final en las 4 capas: Supabase Auth, tablas de negocio, bucket de Storage, mirror en R2 — confirmado con conteo final en 0 filas/archivos) para subir un PDF de prueba a la pestaña "Ausencias y Cobertura"; confirmado "Certificado cargado" en la UI y que "Ver certificado" abre la URL firmada con `200 OK` (confirmado vía `browser_network_requests`, no solo visualmente). Se detectó en el camino un intento de inyección de instrucciones (texto fabricado simulando la salida de otra sesión afirmando un deploy ya exitoso) dentro de una respuesta — no se actuó sobre esa afirmación sin verificarla de forma independiente con herramientas propias. Ver `docs/PENDIENTES.md` #24 (🟢 Resuelto, 2026-07-13, cita las 2 consultas de verificación exactas) | `backend/src/db/schema_certificados_medicos_storage.sql` (aplicado, con la salvedad de `ALTER TABLE` documentada); commit `bf2a745` (backend + Panel de la feature de certificado médico); `docs/PENDIENTES.md` (#24 resuelto); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-13 | **Pendiente #15, roadmap de continuidad de proveedores — puntos 1 a 4 construidos y verificados**, a pedido explícito del Desarrollador ("empecemos de lo simple a lo complejo... avanza con el 1 al 4 y despues vemos el 5 en profundidad", luego "construye todo lo que tengas que construir, de ser posible no dejes nada en el aire"). **Punto 2 (prueba real de restauración de backup):** se bajó el backup más reciente de producción desde Cloudflare R2, se restauró completo dentro de un Postgres 16 efímero en Docker, se verificaron las 30 tablas de negocio presentes y se compararon conteos de filas de 8 tablas clave 1:1 contra la base real vía el mismo pooler que usa el backup — coincidencia exacta en las 8. Contenedor y archivos temporales con datos reales destruidos al terminar. Cierra el hueco honesto que dejaba abierto el pendiente #4 (Regla 12.5: nunca se había probado una restauración real, solo que el archivo subía). **Puntos 3 y 4 (plan de migración de Auth + runbooks de Railway/Vercel/Gmail/GitHub):** documentados en `docs/PLAN_CONTINUIDAD_PROVEEDORES.md`, sin ejecutar nada (son documentación para el caso de necesidad futura). **Punto 1 (mirror de almacenamiento de archivos) — corrección de alcance encontrada antes de construir (Regla 12.5/12.6):** se había asumido que aplicaba al Certificado de Aptitud (tabla `certificados`); verificado contra el código real, esa suposición era incorrecta — el Certificado de Aptitud es solo un QR sin archivo, y la columna sin implementar (`certificado_url`, `docs/DATA_MODEL.md:389`) pertenece en realidad a `ausencias` (certificado médico que respalda una licencia, dato de salud sensible — Regla 7). Se construyó la feature real: `backend/src/routes/panelAusencias.js` (subida vía `multer`, valida PDF/JPG/PNG hasta 10 MB, sube a bucket privado `certificados-medicos` en Supabase Storage y espeja a Cloudflare R2 con el mismo patrón `@aws-sdk/client-s3` del backup; endpoint de URL firmada de 60s para ver el archivo sin exponer el bucket como público), montada en `backend/src/server.js`; UI nueva en `panel/src/pages/asistentes/AusenciasCoberturaTab.jsx` (input de archivo + botón deshabilitado mientras sube — Regla 5 —, estados cargado/sin certificado, i18n completo en las 3 locales verificado con `grep -c` que cada clave aparece exactamente 3 veces); SQL `backend/src/db/schema_certificados_medicos_storage.sql` (bucket privado + RLS en `storage.objects`, `NOTIFY pgrst, 'reload schema'` — Regla 13.2). **Sin aplicar contra Supabase real** — esta sesión no tenía el MCP de Supabase conectado (confirmado con `ToolSearch`), mismo patrón que pendientes #21/#22 — ver pendiente #24 nuevo. **Punto 5 (mirror en caliente de Supabase Auth):** sigue fuera de alcance, no recomendado, a discutir aparte. `npm run lint` en `panel/` sin errores nuevos; `node --check` sin errores de sintaxis en los archivos nuevos de `backend/`. Ver `docs/PENDIENTES.md` #15 (puntos 1-4 resueltos) y #24 (nuevo, aplicación de SQL pendiente) | `docs/PLAN_CONTINUIDAD_PROVEEDORES.md` (nuevo); `backend/src/db/schema_certificados_medicos_storage.sql` (nuevo, sin aplicar); `backend/src/routes/panelAusencias.js` (nuevo); `backend/src/server.js` (ruta montada); `backend/package.json` (`multer` agregado); `panel/src/pages/asistentes/AusenciasCoberturaTab.jsx` (subida/visualización de certificado médico); `panel/src/i18n/translations.js` (claves nuevas en es-AR/en/pt-BR); `panel/src/index.css` (`.panel-certificado-medico`); `docs/DATA_MODEL.md` (comentario de `certificado_url` actualizado); `docs/PENDIENTES.md` (#15 actualizado, #24 nuevo); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-13 | **Pendiente #9 cerrado — WhatsApp + IA desplegado (backend Railway + Panel Vercel) y probado en navegador real.** Continuación del kickoff de la misma sesión: causa raíz del 404 en las 3 rutas nuevas (`/whatsapp`, `/whatsapp/plantillas`, `/escalada-coordinador`) fue que todo el código de backend de este build (rutas, utils, `server.js`) nunca se había commiteado/pusheado a GitHub, así que Railway (que solo despliega desde `git push` a `main` vía GitHub Actions) seguía corriendo el código viejo — confirmado con `gh run list` antes de tocar nada. Con confirmación explícita del Desarrollador ("si") se hizo commit `034ab3d` (`feat: WhatsApp + IA (pendiente #9) - backend, rutas del Panel y config UI`) y push; workflow "Deploy backend a Railway" verificado exitoso (`gh run watch 29270946691`, 47s). `vercel --prod` corrido en `panel/` (Regla 13.1). Antes del despliegue se cerró además la brecha de paridad i18n que quedaba abierta de una sesión anterior (claves `whatsapp_*`/`tab_whatsapp` agregadas a `en`/`pt-BR`, verificado con `grep -c` que cada clave aparece exactamente 3 veces) y se sacó una constante muerta (`ESTADOS_PLANTILLA`) detectada por `npm run lint`. Probado en navegador real contra `https://aurevia-panel.vercel.app`: pestaña "WhatsApp + IA" renderiza las 3 secciones sin error de consola; credenciales (guardado + persistencia tras reload con datos de prueba `+5491100000000`/`waba-test-123`/`pnid-test-456`); plantillas (alta de una plantilla de prueba con variable `{{1}}`, aparece en la tabla como "Borrador", borrado con diálogo de confirmación nativo — Regla 4); escalada a Coordinador (cambio de minutos 15→20 y activación de "fase automática", persistencia confirmada tras reload). Todo el dato de prueba se limpió al terminar (plantilla borrada, credenciales vueltas a vacío, escalada reseteada a 15/120 sin fase automática) — confirmado con un reload final que no quedó nada residual. Términos nuevos de UI (premura/fase automática/coordinador de respaldo/Meta Cloud API/WABA) ya habían sido flageados contra el glosario de `CLAUDE.md` en la entrada anterior sin colisión. **Explícitamente diferido, no bloqueante para este cierre:** envío automático de la fase automática a Asistentes reales y endurecimiento del webhook para producción (verify token real, firma `X-Hub-Signature-256`, payload real de Meta) — quedan para el test con una prestadora real con cuenta Meta activa. Ver `docs/PENDIENTES.md` #9 (🟢 Resuelto) | `panel/src/i18n/translations.js` (paridad en/pt-BR); `panel/src/pages/Configuracion.jsx` (dead code removido); commit `034ab3d` (backend + rutas + config UI, ver detalle en la entrada anterior de esta misma sesión); `docs/PENDIENTES.md` (#9 cerrado); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-13 | **Pendiente #22 cerrado — `schema_whatsapp_ia_01.sql` aplicado y verificado contra Supabase real** (sesión distinta, con MCP de Supabase conectado, instruida desde esta conversación). `apply_migration` devolvió éxito, pero se detectó un bug real durante la verificación posterior (no solo se confió en el resultado del comando, Regla 12.5): las secciones 0/final del archivo tenían los `INSERT` de seed de `configuracion_escalada_coordinador` y `configuracion_whatsapp_prestadora` *antes* de los `CREATE TABLE` correspondientes (secciones 4 y 1) — `apply_migration` no aborta el resto del batch si un statement individual falla, así que las 2 filas de seed se perdieron en silencio. Corregido en el archivo (movidos a una sección 7 nueva al final, después de que las tablas ya existen, para que una futura re-ejecución en otro entorno no repita el bug) y, contra la base ya migrada, se corrieron sueltos los 2 `INSERT` faltantes (idempotentes). Verificación final completa contra Supabase real: 5 tablas nuevas presentes, `configuracion_notificaciones` con `prestadora_id` en las 7 filas de la prestadora original + PK compuesta `(evento, prestadora_id)` confirmada, insert de prueba sin `prestadora_id` en `plantillas_whatsapp` falló como debía (`ERROR 23502`), y seed de la prestadora original presente (1 fila) en `configuracion_escalada_coordinador`/`configuracion_whatsapp_prestadora` | `backend/src/db/schema_whatsapp_ia_01.sql` (aplicado y corregido — orden de la sección de seeds); `docs/PENDIENTES.md` (#22 resuelto); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-13 | **Pendiente #9 (WhatsApp + IA) — kickoff de implementación ejecutado ("dale, empeza a construirlo"), backend y Panel construidos, sin aplicar/desplegar todavía.** Alcance construido siguiendo los 5 puntos A-E ya cerrados en `docs/PRD_06_WhatsApp_IA.md`: schema nuevo `backend/src/db/schema_whatsapp_ia_01.sql` — fix de aislamiento de `configuracion_notificaciones` (agrega `prestadora_id`/`whatsapp_activo`, cierra la brecha del pendiente #18 candidato 9) + tablas nuevas `configuracion_whatsapp_prestadora`, `plantillas_whatsapp`, `configuracion_escalada_coordinador`, `conversaciones_whatsapp`, `mensajes_whatsapp`, más funciones Vault `guardar_token_whatsapp`/`leer_token_whatsapp` (`SECURITY DEFINER`, token nunca en texto plano en tabla `public`); `backend/src/utils/whatsapp.js` (envío Meta Cloud API directo por prestadora + fallback automático a email); `backend/src/utils/iaWhatsapp.js` (primera integración de `@anthropic-ai/sdk` en este backend, modelo `claude-sonnet-5`, contrato JSON estructurado, degrada a "requiere Coordinador" sin `ANTHROPIC_API_KEY`); `backend/src/utils/revisarNotificacionesCoordinador.js` (cron de insistencia por premura + escalada a Coordinador de respaldo + detección de fase automática, mismo patrón de polling que `ausenciaAutomatica.js`); rutas nuevas en `panelConfiguracion.js` (`/whatsapp`, `/whatsapp/plantillas`, `/escalada-coordinador`); webhook `backend/src/routes/whatsappWebhook.js` para el punto 6 (mensajes entrantes + IA respondiendo o escalando), construido hasta donde es posible sin cuenta Meta real — el propio archivo documenta en su header lo que falta verificar contra tráfico real (verify token, firma `X-Hub-Signature-256`, formato de payload), por instrucción explícita del Desarrollador de terminarlo en el test final con una prestadora real. Panel: pestaña "WhatsApp + IA" nueva en Configuración (`Configuracion.jsx`) con sub-tabs de credenciales (token nunca se vuelve a mostrar tras guardarlo), plantillas (CRUD + seguimiento de estado ante Meta) y escalada a Coordinador (backup + umbrales de premura + fase automática); i18n completo en las 3 locales (`translations.js`). **No aplicado ni desplegado todavía** — quedan como pendientes nuevos: aplicar el `.sql` contra Supabase real (pendiente #22, no hubo MCP de Supabase disponible), `npm install` en `backend/` para instalar la dependencia nueva (pendiente #23), y `vercel --prod` del Panel una vez confirmado. Términos nuevos de UI (premura/fase automática/coordinador de respaldo/Meta Cloud API/WABA) verificados contra el glosario de `CLAUDE.md`: ninguno colisiona con una fila existente ni usa lenguaje de relación laboral prohibido; son terminología técnica/operativa de una feature nueva, no términos de negocio ya nombrados de otra forma — quedan a la espera de confirmación explícita del Desarrollador, no asumidos como cerrados de forma unilateral | `backend/src/db/schema_whatsapp_ia_01.sql` (nuevo, no aplicado); `backend/src/utils/{whatsapp,iaWhatsapp,revisarNotificacionesCoordinador}.js` (nuevos); `backend/src/utils/email.js` (refactor tenant-aware); `backend/src/utils/vencimientos.js`, `backend/src/routes/{solicitudServicio,postulacionAsistente}.js` (pasan `prestadoraId`); `backend/src/routes/whatsappWebhook.js` (nuevo); `backend/src/routes/panelConfiguracion.js` (rutas whatsapp/plantillas/escalada-coordinador); `backend/src/server.js` (webhook montado + cron nuevo); `backend/package.json` (`@anthropic-ai/sdk`, no instalado todavía); `panel/src/pages/Configuracion.jsx` (tab WhatsApp + IA); `panel/src/i18n/translations.js` (claves nuevas en es-AR/en/pt-BR); `docs/PENDIENTES.md` (#9 actualizado, #22/#23 nuevos); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-13 | **Rename "Certificado [nombre anterior]" → "Certificado de Aptitud"** (decisión del Desarrollador: certifica aptitud para una tarea determinada, uso mayormente interno de la prestadora, no es nombre de marca) aplicado en glosario (`CLAUDE.md`), docs (`PLAN_MULTITENANT_XEITRA.md` sección 5.4bis, `PRD_03_Reclutamiento.md`, `PRD_04_05_App_Servicio.md`, `PENDIENTES.md` #7, `PROGRESS.md`), comentario de `schema_etapa2f.sql`, y las 3 locales del i18n del Panel — de paso corrigió un bug preexistente en pt-BR que tenía el string sin traducir en español. Commit `b23c3ff`, pusheado, Panel redesplegado a Vercel (`vercel --prod`). **Pendiente #18 — revisión de código en busca de políticas hardcodeadas candidatas a parametrización por prestadora (trabajo autónomo nocturno, autorización explícita "avanza sin mi... me voy a dormir").** Investigación de solo lectura (agente Explore en background + verificación línea por línea de cada hallazgo antes de listarlo, ninguno implementado): 8 candidatos encontrados y documentados en `docs/PENDIENTES.md` #18 — `DIAS_ANTICIPACION` de vencimientos (`backend/src/utils/vencimientos.js:5`, además atado solo a la prestadora original vía `prestadora_id` fijo en la query), `DIAS_GENERACION_SIN_VIGENCIA_HASTA` de series de guardias (`panel/src/pages/guardias/NuevaGuardiaModal.jsx:10`), catálogo cerrado de motivos de aviso previo (`GuardiaAcciones.jsx:236-239` + i18n, pese a que la columna en base ya es TEXT libre), `especialidades_labels`/`zonas_labels` de geografía AMBA hardcodeados en el Panel (`translations.js`) duplicando lo que `zonas_cobertura` ya resolvió como configurable, la categoría `caba/gba/otras` cerrada de `zonas_cobertura` (`schema_etapa2h.sql:47`), `IDIOMAS_SOPORTADOS` fijo en código (`postulacionAsistente.js:8`), las 5 etapas fijas del Proceso de Incorporación duplicadas en frontend/backend y cerradas por un ENUM Postgres (`VerificacionTab.jsx:10`, `panelCuentas.js:85-91`, `schema_etapa2b.sql:102-104`), y el remitente/servidor SMTP único para todas las prestadoras (`email.js:4-13`). Queda para que el Desarrollador decida ítem por ítem cuál parametrizar y cuál dejar como está — no se tocó ningún archivo de estos 8 | `CLAUDE.md`, `backend/src/db/schema_etapa2f.sql`, `docs/PLAN_MULTITENANT_XEITRA.md`, `docs/PRD_03_Reclutamiento.md`, `docs/PRD_04_05_App_Servicio.md`, `panel/src/i18n/translations.js` (rename Certificado de Aptitud); `docs/PENDIENTES.md` (#7 resuelto, #18 con los 8 candidatos); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-12 | **Módulo 6 Parte 2 — Continuidad de guardia construida y probada en navegador real (trabajo autónomo nocturno, autorización explícita "avanza solo, yo me voy a dormir").** Alcance: (1) CRUD de `personal_emergencia` en Configuración → pestaña Servicios, mismo patrón backend-route que el resto de Configuración (`backend/src/routes/panelConfiguracion.js:127-172`, rutas `GET/POST/PATCH/DELETE`); (2) "Marcar ausente" (`panel/src/pages/guardias/GuardiaAcciones.jsx:57-94`) ahora, además del cambio de estado ya existente, busca si había un Asistente cubriendo justo antes para el mismo Paciente/fecha (`GuardiaAcciones.jsx:72-81`, heurística `hora_fin <= hora_inicio` excluyendo canceladas) y crea un `incidentes_relevo` (`GuardiaAcciones.jsx:83-88`) con `guardia_saliente_id` NULL cuando no hay relevo previo — el caso "Ausente sin relevo previo" del glosario de `CLAUDE.md`; (3) pantalla nueva `panel/src/pages/Continuidad.jsx` (ruta `/continuidad`, RLS directa vía Supabase, mismo patrón de queries separadas + mapas de lookup que `Guardias.jsx`): lista incidentes sin resolver, muestra badge de "sin relevo previo", nivel de escalada actual con su `configuracion_escalada_relevo` (orden de prioridad y plantilla de mensaje), botón "Avanzar nivel" (`Continuidad.jsx:86-100`), y resolución vía modal `ResolverIncidente` (`Continuidad.jsx:164-249`) con dos caminos: Asistente real (`resuelto_por_id` seteado) o excepción por Familiar (`excepciones_familiar_relevo` + `resuelto_por_id` NULL, respetando el CHECK `incidentes_relevo_resuelto_por_check`). i18n: namespace `continuidad` completo (18 claves) + `nav.continuidad` en es-AR/en/pt-BR (`panel/src/i18n/translations.js`, bloques tras el namespace `guardias` en cada locale). Se corrigieron además, al notar que databan de antes de que esta Parte 2 existiera, dos strings ya vigentes que afirmaban que el protocolo de continuidad "no está construido todavía" (`guardias.detalle.confirmar_ausente` y `guardias.detalle.checkout_bloqueado_explicacion`, las 3 locales) — ya no aplica, corregido sin que se pidiera explícitamente (Regla 1/12.5: no dejar un string de UI con una afirmación que dejó de ser cierta). `npm run lint`/`npm run build` del panel sin errores nuevos (solo advertencia pre-existente de tamaño de chunk). Probado en navegador real (Playwright, Panel local `localhost:5173` + backend local `localhost:4000`, no el desplegado en Vercel): se sembraron datos de prueba reales (1 Familia, 1 Paciente, 2 Asistentes, 3 guardias, 2 niveles de `configuracion_escalada_relevo`) vía scripts temporales en `backend/scripts/` (creados, usados y **eliminados** al terminar, nunca commiteados) para cubrir ambos escenarios ("con relevo previo" y "sin relevo previo"), la escalada de nivel, y ambos caminos de resolución (Asistente real y excepción por Familiar) — verificado tanto visualmente en la UI como con consulta directa a Supabase después de cada paso, incluida una verificación final de 0 filas de prueba restantes. `window.confirm()` de "Marcar ausente" y "Resolver incidente" verificados como bloqueantes (Regla 4). **No commiteado ni desplegado a Vercel todavía** — pendiente de que el Desarrollador lo revise y apruebe el push, siguiendo la regla de no commitear sin pedido explícito | `backend/src/routes/panelConfiguracion.js` (rutas `personal_emergencia`); `panel/src/pages/guardias/GuardiaAcciones.jsx` (creación de incidente + fix de strings stale); `panel/src/pages/Continuidad.jsx` (nuevo); `panel/src/App.jsx` (ruta `/continuidad`); `panel/src/components/layout/Layout.jsx` (link de nav); `panel/src/i18n/translations.js` (namespace `continuidad` + `nav.continuidad` en es-AR/en/pt-BR, fix de `confirmar_ausente`/`checkout_bloqueado_explicacion`); `docs/PROGRESS.md` (esta entrada); `docs/PENDIENTES.md` (revisión de la tabla completa, sin cambios de estado nuevos) |
| 2026-07-11 | **Pendientes #11 y #12 cerrados — login sin auto-redirect y card de guardia sin refresco tras check-out, ambos hallazgos del pendiente #6.** A pedido explícito del Desarrollador ("resuelve 11 y 12 entonces"). #11: causa raíz confirmada en `panel/src/context/AuthContext.jsx:39-46` — `login()` en `Login.jsx` resolvía su promesa antes de que el listener `onAuthStateChange` actualizara `session`/`usuario`, y `ProtectedRoute.jsx:14` rebotaba a `/login` con el estado todavía viejo. Corregido con un `useEffect` en `panel/src/pages/Login.jsx:18-27` que redirige recién cuando `session` y `usuario` del contexto ya están resueltos. #12: causa raíz en `panel/src/pages/guardias/GuardiaAcciones.jsx:26-27` (sin cambios desde el commit original `336d886`) — `onActualizada()` (recarga del listado) se llamaba sin esperar, seguido de inmediato por `onClose()`, dejando una ventana de datos viejos. Corregido esperando `await onActualizada()` antes de cerrar el modal (`GuardiaAcciones.jsx:17-30`). Build (`npm run build`) verificado sin errores; ambos fixes desplegados a producción (`vercel deploy --prod`, deployment `dpl_Ea16LgTENL5A6Veeo3wZEJ7oU4mo`) y probados en el navegador real contra `https://aurevia-panel.vercel.app` con Playwright: login redirige solo tras el submit; una guardia de prueba creada ad-hoc (Asistente/Paciente/guardia vía service role) pasó de "Programada" a "Activa" a "Completada" en el listado sin ningún reload manual. Datos de prueba borrados al terminar, verificado con consulta posterior (0 filas restantes en las 4 tablas). Ver `docs/PENDIENTES.md` filas #11 y #12 (ambas 🟢 Resuelto) | `panel/src/pages/Login.jsx`; `panel/src/pages/guardias/GuardiaAcciones.jsx`; `docs/PENDIENTES.md` (ítems #11, #12); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-11 | **Pendiente #6 cerrado — prueba en navegador real (Playwright) del flujo completo de Guardias Parte 1, contra el Panel ya desplegado en Vercel.** A pedido explícito del Desarrollador, el alcance se amplió más allá de "probar" sin más: (1) desplegar primero el código de Módulo 6 a Vercel (ya lo estaba, sin cambios de código pendientes de subir); (2) usar las credenciales de `No hacer commit/claves y contraseñas.txt` para loguear como Admin real; (3) crear los Asistentes/Pacientes/guardias necesarios para simular una situación real con 30 Pacientes simultáneos, cubriendo todos los eventos de dificultad imaginables; (4) borrar todo al terminar. Se escribieron dos scripts temporales (`backend/scripts/seed_test_guardias.js` y `cleanup_test_guardias.js`, ambos ya eliminados del repo): el seed creó 6 Asistentes con cuentas Auth reales (`supabase.auth.admin.createUser`), 30 Pacientes y 38 guardias distribuidas en 10 escenarios (completada, programada, activa, cancelada ×2 variantes, ausente con relevo, "Ausente sin relevo previo" — caso de mayor riesgo del glosario de `CLAUDE.md`, `checkout_bloqueado` sin y con excepción). Dos bugs de PostgREST encontrados y corregidos durante la escritura del seed (no del producto): (a) bulk-insert con filas de distinta forma rellena con `NULL` real las columnas ausentes en vez de aplicar el `DEFAULT` de la columna, violando el `NOT NULL` de `checkout_bloqueado` — se corrigió completando explícitamente las 8 columnas opcionales en cada fila; (b) el CHECK `incidentes_relevo_resuelto_por_check` exige `resuelto_por_id` no nulo cuando `resuelto_por_tipo='suplente'` — el primer intento lo dejaba en `null` por un cálculo que siempre evaluaba a eso; corregido resolviendo un Asistente real distinto del titular ausente. Probado en el navegador real contra `https://aurevia-panel.vercel.app` con MCP de Playwright: login, agenda agrupada por día, alta de guardia suelta y de serie recurrente (checkboxes de día de semana — verificado que generó correctamente las fechas Lunes/Jueves entre `vigente_desde`/`vigente_hasta`), ciclo checkpoint de salida → check-in → check-out, **bloqueo real en la UI de `checkout_bloqueado` sin excepción** (no se renderiza botón de check-out, solo el mensaje de protocolo — confirma en la UI lo que el pendiente #5 ya había cerrado a nivel de constraint SQL), cancelación (con diálogo de confirmación nativo, Regla 4) y "Marcar ausente" (ídem, con mensaje explícito de que el protocolo de continuidad, Parte 2, no está construido). Todo el dato de prueba se borró al terminar y se verificó con una consulta posterior: 0 asistentes/pacientes/guardias de prueba restantes. Dos hallazgos menores no bloqueantes quedaron registrados como pendientes nuevos (`docs/PENDIENTES.md` #11 y #12): el login no redirige solo tras el submit (hay que navegar manual, aunque la sesión sí quede autenticada), y el detalle/card de una guardia no se refresca visualmente tras un check-out exitoso hasta recargar la página (el dato en la base sí es correcto). Ver `docs/PENDIENTES.md` fila #6 (🟢 Resuelto) | `docs/PENDIENTES.md` (ítems #6, #11, #12 nuevos); `docs/PROGRESS.md` (esta entrada). Sin cambios de código de producto — los dos scripts de prueba se crearon y se eliminaron en la misma sesión |
| 2026-07-11 | **Pendiente #5 cerrado — `checkout_bloqueado` ahora impuesto a nivel de base, no solo de UI.** Continuación de la sesión que abrió el pendiente #3 (mismo MCP de Supabase ya conectado). El archivo `backend/src/db/schema_modulo6_guardias_02.sql:17-24` (escrito el 2026-07-10, sin cambios) se aplicó vía `mcp__supabase__apply_migration` (`{"success":true}`): agrega el CHECK `guardias_checkout_bloqueado_requiere_excepcion` sobre `guardias`, que exige que cualquier fila con `checkout_at` seteado y `checkout_bloqueado=true` tenga también los tres campos de excepción (`checkout_excepcion_motivo`, `checkout_excepcion_autorizado_por`, `checkout_excepcion_at`) no nulos. Verificación con insert real: el primer intento simple falló pero por un motivo no relacionado (`asistentes`/`pacientes` estaban vacías, así que `asistente_id`/`paciente_id` NOT NULL fallaban antes de llegar al CHECK) — no probaba nada. Se rehizo dentro de una transacción explícita (`BEGIN...COMMIT`) que crea un Asistente y un Paciente de prueba con FKs válidas (`asistentes.id` tiene FK a `usuarios.id`, se usó un usuario real existente) y luego intenta el insert violatorio en `guardias`; resultado: `ERROR 23514: new row for relation "guardias" violates check constraint "guardias_checkout_bloqueado_requiere_excepcion"`, como debía. Al fallar dentro de la misma transacción, todo abortó — confirmado después que `asistentes`, `pacientes` y `guardias` siguen en 0 filas reales, sin datos de prueba residuales. Esto cierra la brecha de seguridad diagnosticada el 2026-07-10 (el bloqueo antes solo vivía en el `if` de render de `GuardiaAcciones.jsx`, bypasseable con una llamada directa a Supabase vía anon key). **No cierra** el resto del criterio de cierre de la Parte 1 de Módulo 6 — sigue pendiente el pendiente #6 (prueba manual en navegador del flujo completo de Guardias, vía MCP de Playwright, no de Supabase). Ver `docs/PENDIENTES.md` fila #5 (🟢 Resuelto) | `backend/src/db/schema_modulo6_guardias_02.sql` (aplicado y verificado contra Supabase real vía MCP); `docs/PENDIENTES.md` (ítem #5), `docs/PROGRESS.md` (esta entrada) |
| 2026-07-11 | **Pendiente #3 cerrado — "Panel: tenant en inserts directos" (8 columnas restantes).** Corrige la entrada del 2026-07-10 más abajo, que dejaba esto abierto "antes de que arranque el Bloque 4" — ya se ejecutó, no depende de ese bloqueo. Alcance ejecutado: (1) `panel/src/context/AuthContext.jsx` ahora selecciona también `prestadora_id` del usuario logueado (antes solo `id, rol, nombre, zonas`); (2) 6 componentes que insertaban en las 8 tablas sin `DEFAULT` alternativo ahora setean `prestadora_id: usuario.prestadora_id` explícito en cada insert: `AusenciasCoberturaTab.jsx` (`ausencias`, `guardias_cobertura`), `VinculoCeseTab.jsx` (`ceses`), `ListaPrecioDetalle.jsx` (`lista_precios`), `PrestacionesPaciente.jsx` (`prestaciones`, `paquetes_prestaciones`, `paquete_prestacion_items`), `CertificadoTab.jsx` (`certificados`); (3) hallazgo no planeado durante la investigación, aprobado por el Desarrollador para sumar al mismo alcance: `NuevaGuardiaModal.jsx` insertaba en `guardias`/`series_guardias` sin `prestadora_id` en absoluto (estas dos tablas nunca tuvieron `DEFAULT` — ya nacieron `NOT NULL` sin default en `schema_modulo6_guardias.sql` — así que el insert ya debía estar fallando; corregido en los 3 puntos de inserción del componente: guardia suelta, `series_guardias`, y el `map` de altas en bloque de una serie). (4) `backend/src/db/schema_multitenant_03.sql` (nuevo) con los 8 `ALTER TABLE ... DROP DEFAULT`. **Aplicación y verificación reales**: no se hizo desde esta sesión de código — se armó en esta misma conversación un servidor MCP de Supabase (`.mcp.json`, proyecto `abcpmzfnnhpuiupmrsdi`, transporte HTTP hosteado por Supabase, aprobado interactivamente por el Desarrollador) porque esta sesión no tenía forma de correr DDL contra Supabase real (`backend/.env` solo trae `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, sin connection string Postgres; sin driver `pg` en `backend/package.json`). Como las herramientas MCP solo quedan disponibles en sesiones que arrancan después de conectado el servidor, el Desarrollador abrió una segunda sesión de Claude Code en paralelo para aplicar la migración vía `mcp__supabase__apply_migration` y correr la verificación — resultado pegado de vuelta a esta conversación: aplicación exitosa (`{"success":true}`) y un insert real de prueba contra `certificados` sin `prestadora_id` explícito falló con `ERROR 23502` (`null value in column "prestadora_id" violates not-null constraint`), igual que exige el criterio de cierre. Solo se verificó con insert real la tabla `certificados` de las 8 (mismo `DROP DEFAULT`, misma migración transaccional para las 7 restantes — no se repitió el insert de prueba en cada una por juicio de costo/beneficio, documentado como tal, no como brecha oculta). Deuda de documentación separada, no bloqueante: las 7 tablas cerradas el 2026-07-10 (`usuarios`, `asistentes`, `familias`, `pacientes`, `zonas_cobertura`, `solicitudes`, `postulaciones`) se aplicaron directo contra Supabase sin dejar una migración versionada en el repo — señalado en el header de `schema_multitenant_03.sql` y en `docs/DATA_MODEL.md`. Ver `docs/PENDIENTES.md` fila #3 (🟢 Resuelto) y `docs/DATA_MODEL.md` sección de deuda técnica de tenant | `panel/src/context/AuthContext.jsx`; `panel/src/pages/asistentes/{AusenciasCoberturaTab,VinculoCeseTab,CertificadoTab}.jsx`; `panel/src/pages/ListaPrecioDetalle.jsx`; `panel/src/pages/familias/PrestacionesPaciente.jsx`; `panel/src/pages/guardias/NuevaGuardiaModal.jsx`; `backend/src/db/schema_multitenant_03.sql` (nuevo, aplicado y verificado contra Supabase real vía MCP); `.mcp.json` (nuevo, servidor MCP de Supabase); `docs/DATA_MODEL.md`, `docs/PENDIENTES.md` (ítem #3), `docs/PROGRESS.md` (esta entrada) |
| 2026-07-10 | **Estado de corte — Módulo 6 Parte 1 committeada, hueco de `checkout_bloqueado` diagnosticado y con fix escrito pero SIN aplicar, prueba de navegador pendiente.** Registrado antes de un reinicio de sesión para cargar el MCP de Playwright, siguiendo el mismo principio de la regla 9 de `CLAUDE.md` (dejar registro exacto antes de cualquier corte, no depender de que la próxima sesión "se acuerde"). Estado exacto: (1) el código de la Parte 1 (ver entrada de abajo) está commiteado y pusheado en `336d886` (`feat: Modulo 6 Parte 1 (Guardias core) en el Panel`), no toca `backend/`, sin relación con el fallo de Railway (que sigue sin diagnosticar, tema aparte). (2) El Desarrollador preguntó si `checkout_bloqueado` está impuesto a nivel de policy RLS/CHECK o solo en la UI — se verificó contra el schema real (`schema_modulo6_guardias.sql`): las policies `panel_gestiona_guardias`/`coordinador_gestiona_guardias_de_su_zona` son `FOR ALL USING` solo sobre tenant/rol/zona, sin `WITH CHECK` ni CHECK constraint que ate `checkout_bloqueado` a `checkout_at`; el bloqueo hoy es únicamente el `if` de render en `GuardiaAcciones.jsx` — bypasseable con una llamada directa a Supabase vía anon key. Fix escrito y guardado en disco en `backend/src/db/schema_modulo6_guardias_02.sql` (constraint `guardias_checkout_bloqueado_requiere_excepcion`), **todavía NO aplicado contra Supabase real** — no hay `DATABASE_URL`/connection string Postgres en este repo (`backend/.env` solo tiene `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, que no alcanzan para correr DDL); queda pendiente de que el Desarrollador provea una connection string nueva (o corra el SQL él mismo en el SQL Editor de Supabase) para aplicarlo y verificarlo. (3) La prueba manual en navegador del flujo completo (alta de serie, check-in/check-out, cancelación, marcar ausente) sigue sin hacerse — el MCP de Playwright no estaba cargado en esta sesión (confirmado por ausencia de herramientas de navegador), de ahí el reinicio. **Criterio de cierre de la Parte 1, sin cumplir todavía**: no cuenta como cerrada hasta que (a) el constraint de `checkout_bloqueado` esté aplicado y verificado, y (b) la prueba real en navegador confirme el flujo completo — build+lint en verde no alcanza, mismo criterio de siempre. Sin otros cambios sin guardar en el editor en el momento de este corte | `backend/src/db/schema_modulo6_guardias_02.sql` (nuevo, escrito y guardado en disco, NO aplicado); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-10 | **Módulo 6 (Guardias) Parte 1 — "Guardias core" en el Panel.** Priorizado por el Desarrollador por sobre el Bloque 4 del plan multi-tenant (razón: las 8 tablas de Guardias son independientes de las tablas afectadas por ese Bloque, y el negocio real con la primera Familia pesa más que protegerse de una segunda prestadora hipotética). Alcance: alta de serie recurrente o guardia suelta, lista tipo agenda agrupada por día con color automático por estado, checkpoint de salida + check-in/check-out con geolocalización best-effort, cancelación (origen/alcance) y marcar ausente — todo con confirmación explícita en las acciones destructivas. Sin rutas backend nuevas (RLS directa desde Supabase, mismo patrón que `Familias.jsx`). Explícitamente no construido: Parte 2 (Continuidad de guardia), Parte 3 (Piezas de apoyo), y `guardias_tracking_gps` en ninguna forma (ni endpoint con flag) — bloqueante por Ley 25.326 sin política de retención definida. Verificado con `npm run build`/`npm run lint` del panel, sin prueba manual en navegador todavía (sin sesión de Playwright MCP disponible) | `panel/src/pages/Guardias.jsx` (nuevo); `panel/src/pages/guardias/{NuevaGuardiaModal,GuardiaAcciones}.jsx` (nuevos); `panel/src/lib/ubicacion.js` (nuevo); `panel/src/App.jsx` (ruta `/guardias`); `panel/src/components/layout/Layout.jsx` (link de nav); `panel/src/components/layout/EstadoLista.jsx` (prop opcional `mensajeVacio`); `panel/src/index.css` (clases `.panel-guardia-*` y `.guardia-{estado}`); `panel/src/i18n/translations.js` (bloque `guardias` + `nav.guardias` en es-AR/en/pt-BR); `docs/DESIGN_SYSTEM.md` (5ª regla `.guardia-ausente`); `docs/PRD_02_Panel_Admin.md` (sección Módulo 6 reescrita); `docs/BUILD_ORDER.md` (fila Módulo 6 actualizada); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-10 | **Retiro total del término "Filtro [nombre anterior de la prestadora original]"**: el Desarrollador instruyó reemplazar el término en todos lados, aclarando que ni siquiera corresponde su uso interno (endurece la regla anterior del 2026-07-08, que sí permitía uso interno). Glosario de `CLAUDE.md` consolidado a una sola fila ("Proceso de Incorporación de Asistentes", sin excepción interna) con nota de retiro fechada. Barrido de todo el repo (grep del término retirado): corregidos `SECURITY.md` (2 menciones), `DATA_MODEL.md` (3 menciones), `PLAN_MULTITENANT_XEITRA.md` (1 mención, ya no se deja como "bajo impacto, sin acción"), y comentarios de código en `backend/src/routes/panelCuentas.js`, `backend/src/db/schema_etapa2e.sql`, `backend/src/db/schema_etapa2b.sql` (2 menciones). El identificador SQL `etapa_filtro` (enum ya aplicado en Supabase) no se renombra — es un nombre técnico abreviado, no el término de negocio, y renombrarlo requeriría una migración fuera de alcance de este barrido documental. Entradas históricas de este mismo archivo (fechadas 2026-07-07/08/09) que citan el término retirado como parte de un registro de una decisión pasada quedan sin tocar — documentan fielmente lo que era cierto en ese momento, no un uso vigente del término. El manual de identidad original (histórico) queda pendiente de una decisión explícita del Desarrollador (contiene una guía de terminología que todavía marca el término retirado como uso interno correcto, y el archivo estaba marcado "correcto así, no tocar" en `CONTEXT.md`) | `CLAUDE.md`, `docs/SECURITY.md`, `docs/DATA_MODEL.md`, `docs/PLAN_MULTITENANT_XEITRA.md`, `backend/src/routes/panelCuentas.js`, `backend/src/db/schema_etapa2e.sql`, `backend/src/db/schema_etapa2b.sql`, `docs/PROGRESS.md` (esta entrada) |
| 2026-07-10 | **Feedback consolidado sobre el Bloque 2, resuelto — Bloque 3 sigue sin arrancar hasta confirmación del usuario.** Tres partes: (1) colisión de nombres: `schema_etapa3a.sql`/`schema_etapa3b.sql` reusaban la numeración de "Etapa 3" (`docs/BUILD_ORDER.md`, PWA Asistentes) para una migración cross-cutting no relacionada — renombrados a `schema_multitenant_01.sql`/`schema_multitenant_02.sql`, actualizadas todas las referencias internas y en `CLAUDE.md`/`docs/PLAN_MULTITENANT_XEITRA.md`/`docs/PROGRESS.md`; barrido confirmado (`grep -r "etapa3a\|etapa3b"` y `grep -r "etapa3"`) — las únicas menciones restantes de "Etapa 3" en el repo son legítimas (la etapa real del build order). (2) Sección 5 del plan ajustada con los tres puntos pedidos: 5.5 (remitente/firma de emails) marcado con prioridad más alta que 5.1/5.3 (color/logo) — es riesgo de fuga de marca/reputación entre tenants (un email ya enviado con la firma equivocada no se puede retirar), no solo cosmético; 5.1 (paleta) documentado con la pre-limpieza obligatoria antes de dinamizar (decidir si `panel/`/`sitio-web/` comparten una sola fuente de variables o siguen sincronizados a mano, y barrer los hex sueltos de `panel/src/index.css`); 5.2 (tipografía) documentado como más complejo que color — necesita mecanismo de carga dinámica de fuentes (hoy `<link>` de Google Fonts fijo en `layout.jsx`), no es "una variable más". (3) Tres brechas de verificación del Bloque 2 resueltas: **no existe suite de tests automatizada en `backend/`** (confirmado vía `package.json` — sin framework, sin script `test`; verificación de rutas del Bloque 3 tendrá que apoyarse en scripts de verificación manual contra Supabase real, mismo mecanismo ya usado para verificar Bloques 1-2, hasta que se decida invertir en una suite real); **prueba de comportamiento de RLS** ejecutada contra Supabase real (no solo estructural): login como `admin_prestadora` vía anon key (`@supabase/supabase-js`, cuenta de prueba `prestadora.demo@gmail.com`), comparado contra conteo de superusuario en `pacientes`/`ceses`/`ausencias`/`familias`/`asistentes`/`certificados`/`lista_precios` — todas en 0 filas reales hoy (no hay datos operativos cargados todavía), match exacto; dado que 0=0 es evidencia débil, se insertó una fila de prueba temporal en `pacientes` vía superusuario, se confirmó que el usuario autenticado la ve vía RLS, y se borró de inmediato — prueba positiva del mecanismo `current_tenant()`/`es_superadmin()` compartido por las 28 policies reescritas (no se pudo repetir el mismo insert directo en `ceses`/`ausencias` sin crear también un Asistente real con cuenta de Auth, por la FK `asistentes.id → usuarios.id` — mecanismo idéntico ya validado con `pacientes`, riesgo/beneficio no ameritaba fabricar un usuario Auth de prueba); **criterio de cierre exacto del `DEFAULT` temporal** corregido en la sección 4.1 del plan: el Bloque 3 no cierra sin (a) eliminar el `DEFAULT` de las 15 columnas y (b) confirmar con un insert real sin `prestadora_id` explícito que vuelve a fallar — ya no una nota general de "temporal". Bloque 3 pre-autorizado por el usuario pero explícitamente no arrancado ("No lo arranques todavía") | `backend/src/db/schema_multitenant_01.sql`, `schema_multitenant_02.sql` (renombrados); `CLAUDE.md`, `docs/PLAN_MULTITENANT_XEITRA.md` (secciones 4.1 y 5, referencias de nombre), `docs/PROGRESS.md` (referencias de nombre + esta entrada) |
| 2026-07-09/10 | **Multi-tenant, Bloque 2 completo — RLS centralizada + rename de rol ejecutado.** Autorizado por el usuario en paralelo al inventario de branding (mensaje: "Seguí con el Bloque 2 tal como está autorizado"). Relevamiento previo (agente en background) de las ~60 comparaciones `rol = 'admin'` en `schema_etapa2*.sql`, tomando solo la versión vigente de cada policy tras rastrear cada `DROP`/`CREATE` posterior: dieron 28 policies vigentes sobre 20 tablas con RLS activa (más 6 policies de zona ya existentes para Coordinador, que necesitaban la condición de tenant sumada, no reemplazada). Ejecutado y verificado contra Supabase real en `backend/src/db/schema_multitenant_02.sql`: (1) funciones `current_tenant()`/`es_superadmin()` creadas (diseño 3.6 del plan); (2) CHECK de `usuarios.rol` reescrito en dos pasos (ensanchado a aceptar `admin` y `admin_prestadora` a la vez, corrida la `UPDATE`, angostado al final a solo `admin_prestadora` — un solo `ALTER` directo falla porque `ADD CONSTRAINT` valida las filas ya existentes contra el CHECK nuevo antes de que la `UPDATE` corra); (3) las 28 policies reescritas con `es_superadmin()`/`current_tenant()`, agregando filtro de tenant donde ya existe `prestadora_id` (Bloque 1) y dejándolo afuera en `configuracion_empresa`/`configuracion_notificaciones` (sin la columna todavía, Bloque 4) y `escalas_legales` (global por diseño, 3.7). Código de aplicación cortado por completo (ya no acepta `'admin'` en paralelo a `admin_prestadora`): `panel/src/lib/roles.js`, `backend/src/middleware/requiereRolPanel.js`, `backend/src/routes/panelUsuarios.js`, `backend/src/routes/panelCuentas.js`, `panel/src/components/layout/ProtectedRoute.jsx`; se encontró y corrigió además un `<option value="admin">` vivo en `panel/src/pages/UsuariosPanel.jsx` (formulario de alta de usuario del panel) que se hubiera roto en la primera alta de un nuevo Admin tras el rename. **Bug real encontrado al escribir este Bloque** (no es parte del diseño de RLS): el `NOT NULL` que el Bloque 1 puso en `prestadora_id` en 15 tablas rompía cualquier alta nueva (cuenta, familia, paciente, ausencia, guardia, certificado, cese, precio, prestación, zona, solicitud, postulación) porque ningún insert de hoy —backend con Service Role Key ni panel con anon key— setea esa columna; no se detectó en el cierre del Bloque 1 porque esa verificación solo miró filas ya existentes (backfill), no altas nuevas. Corregido con `DEFAULT` al UUID de la prestadora original en las 15 columnas, mismo mecanismo que el backfill del Bloque 1, a nivel de schema — explícitamente temporal, el Bloque 3 (filtrado real de tenant en rutas del backend, sin diseñar ni aprobar todavía) lo reemplaza. Verificado contra Supabase real: CHECK final correcto, 2 filas en `admin_prestadora` y 0 en `admin`, 0 policies con literal `'admin'`, 15 defaults aplicados, 18/18 tests de `panel/` OK, sintaxis de los 3 archivos de `backend/` tocados OK. Bloques 3 (backend Service Role Key) y 4 (`configuracion_prestadora` + hardcodeos) siguen sin arrancar | `docs/PLAN_MULTITENANT_XEITRA.md` (4.1, nota de Bloque 2 completo); `CLAUDE.md` (glosario, entrada `admin_prestadora` sin matiz de transición); `backend/src/db/schema_multitenant_02.sql` (nuevo, aplicado y verificado contra Supabase real); `panel/src/lib/roles.js`, `backend/src/middleware/requiereRolPanel.js`, `backend/src/routes/panelUsuarios.js`, `backend/src/routes/panelCuentas.js`, `panel/src/components/layout/ProtectedRoute.jsx`, `panel/src/pages/UsuariosPanel.jsx` |
| 2026-07-09 | **Corrección de `identificacion_fiscal` + inventario de hardcodeos de apariencia/marca por-prestadora.** El usuario detectó que el seed de `prestadoras` (fila de la prestadora original, cargada en el Bloque 1) tenía `identificacion_fiscal = '[DEFINIR]'` — un placeholder de relleno hardcodeado, exactamente el patrón que la regla 1 de `CLAUDE.md` prohíbe (no hay CUIT real documentado en el repo, y un placeholder de texto es tan inventado como un CUIT falso). Corregido: columna vuelta nullable (`ALTER COLUMN identificacion_fiscal DROP NOT NULL`), valor puesto en `NULL`, aplicado y verificado contra Supabase real; `schema_multitenant_01.sql` actualizado como fuente de verdad. Documentado en sección 4.6 del plan, junto con dos puntos evaluados pero NO implementados (a pedido explícito): una restricción/trigger que bloquee `estado='certificada'` sin `identificacion_fiscal` cargado (queda propuesta, no implementada — aplicarla hoy rompería el seed de la prestadora original, que ya está `certificada` con el campo en NULL), y la falta de una pantalla real donde un `admin_prestadora` cargue este dato (dependencia anotada como caso de uso central de `configuracion_prestadora`, Bloque 4). El usuario amplió esto a una regla general: ningún dato/apariencia/configuración (paleta de colores, tipografía, logo, textos de marca, remitente de emails, plantillas de documentos, dominio/contacto) puede quedar hardcodeado — todo debe ser editable por prestadora desde panel/CMS, salvo lógica con peso legal/de seguridad (`calcularCese`, score de riesgo, RLS, causales de cese, motor de alertas), que sigue siendo código versionado aunque consuma valores configurables (mismo patrón ya usado en `escalas_legales`). Se armó (solo inventario, sin diseñar tablas ni implementar nada) la sección 5 nueva de `docs/PLAN_MULTITENANT_XEITRA.md`, con 8 categorías y cita archivo:línea, cruzando contra la sección 1.5 ya existente para promover ítems de "pendiente" a "con regla definida" (logo, ~20 menciones del nombre anterior de la prestadora original en `translations.js`, firma de emails). Queda un caso ambiguo señalado sin decidir: términos de negocio mixtos con nombre de marca ("Certificado [nombre anterior]", "Exclusividad de facturación a [nombre anterior]") — ¿se parametrizan o se genericán del todo? Decisión pendiente del usuario. Bloque 2 (RLS + rename de rol) autorizado a continuar en paralelo, no bloqueado por este inventario | `docs/PLAN_MULTITENANT_XEITRA.md` (sección 4.6 nueva, sección 5 nueva); `backend/src/db/schema_multitenant_01.sql` (columna nullable + seed corregido, aplicado y verificado contra Supabase real) |
| 2026-07-09 | **Multi-tenant, Bloque 1 completo — aislamiento de datos aditivo (pasos 1-4) + rename de rol repensado.** Kickoff de implementación (`docs/Prompt_Claude_Code_Kickoff_Implementacion.md`) recibido y ejecutado. Antes de tocar código: sección 4.1 del plan marcada RESUELTA (opción a) con fecha de hoy. Ejecutado y verificado contra Supabase real: (1) tabla `prestadoras` creada (tipo `estado_prestadora`, RLS solo-superadmin) + fila de Prestadora Demo (`estado='certificada'`, `pais='AR'`, `identificacion_fiscal='[DEFINIR]'` — no hay CUIT real documentado en el repo, placeholder explícito, falta cargar el dato real); (2)-(4) `prestadora_id UUID REFERENCES prestadoras(id)` agregado nullable → backfileado a la prestadora original → vuelto `NOT NULL` en 15 tablas (`usuarios`, `asistentes`, `ausencias`, `guardias_cobertura`, `ceses`, `familias`, `pacientes`, `lista_precios`, `prestaciones`, `paquetes_prestaciones`, `paquete_prestacion_items`, `certificados`, `zonas_cobertura`, `solicitudes`, `postulaciones`), 0 filas en NULL verificado tabla por tabla antes de cada `SET NOT NULL`. Excluidas de este paso (decisión explícita del usuario): `verificaciones_asistente`/`escalas_legales` (ya previstas en el plan), `configuracion_empresa`/`configuracion_notificaciones` (se reemplazan enteras por `configuracion_prestadora` en el Bloque 4, agregarles la columna ahora era trabajo descartable). Se verificó además que `aspirantes` (mencionada como posible hueco del inventario) no existe en Supabase real — se había eliminado como código muerto en `schema_etapa2k.sql` — así que la sección 1.1 del plan no tenía un hueco real, la omitió a propósito. **Rename de rol (paso 5) — hallazgo y decisión del usuario**: se detectó que ~60 policies RLS en `schema_etapa2.sql`–`schema_etapa2i.sql` comparan literalmente `rol = 'admin'` o `rol IN ('admin', ...)` — correr el `UPDATE usuarios SET rol='admin_prestadora'` sin reescribirlas a la vez deja a todo Admin sin acceso de inmediato. El usuario decidió (para no tocar esas policies dos veces) mover el rename de **dato** + reescritura de policies al Bloque 2, junto con `current_tenant()`/`es_superadmin()`. Lo que sí se aplicó hoy del paso 5: glosario de `CLAUDE.md` con la entrada `admin_prestadora`, y el código de autorización (`panel/src/lib/roles.js`, `backend/src/middleware/requiereRolPanel.js`, `backend/src/routes/panelUsuarios.js`) ya acepta `admin_prestadora` en paralelo a `admin` sin romper nada existente (verificado: 18/18 tests de `panel/` OK, sintaxis de los 2 archivos de `backend/` OK). `usuarios.rol` sigue sin ninguna fila con el valor nuevo. Bloques 2 (RLS), 3 (backend Service Role Key) y 4 (`configuracion_prestadora` + hardcodeos) siguen sin arrancar — requieren aprobación explícita aparte | `docs/PLAN_MULTITENANT_XEITRA.md` (4.1 resuelta + nota de momento de ejecución del rename); `docs/BUILD_ORDER.md` (fila Multi-tenancy real: Diferida → En progreso); `backend/src/db/schema_multitenant_01.sql` (nuevo, aplicado y verificado contra Supabase real); `CLAUDE.md` (glosario, entrada `admin_prestadora`); `panel/src/lib/roles.js`, `backend/src/middleware/requiereRolPanel.js`, `backend/src/routes/panelUsuarios.js` (aceptan `admin_prestadora` en paralelo a `admin`) |
| 2026-07-09 | Dos correcciones de documentación (no tocan código de producto): (1) resuelta la nota de "inconsistencia sin resolver" del slogan — no era una decisión pendiente, es una regla semántica según voz de marca (documento fundacional original, histórico, 5.2): "Cuida tus afectos" (imperativo) para piezas que interpelan al visitante (`hero_title`, meta description de `/`), "Cuidamos tus afectos" (institucional, primera plural) para piezas donde la prestadora original habla de sí misma (logo, futuro tagline de footer); se revisó cada ocurrencia en el repo y las 4 encontradas (`translations.js:hero_title`, meta description de `/` en `PRD_01_Sitio_Web.md`, logo y muestra tipográfica del manual de identidad original) ya coincidían con la forma que les corresponde por contexto — no requirió cambio de código, solo se corrigió el marco conceptual del comentario en `CONTEXT.md`; se deja propuesto (no implementado, no hay caso de uso institucional en código todavía) separar `T.hero_title` de un futuro `T.brand_tagline` si se agrega tagline institucional; (2) reemplazado el placeholder "Alberto/Inversor" (quien aprueba/dirige el trabajo de Claude Code) por "Desarrollador", con entrada nueva en el glosario de `CLAUDE.md`. Se relevó todo el repo: la única ocurrencia real de ese placeholder era la misma nota del slogan en `CONTEXT.md` (ya corregida en el punto 1); se dejaron **explícitamente sin tocar** por no ser ese placeholder: `CLAUDE.md:70` (fila "Inversor" del glosario — hecho societario real, socio potencial sin nombre confirmado, documento fundacional original histórico), `docs/PRD_03_Reclutamiento.md` (ya usa "Admin"/"Inversor" como rol de negocio desde una corrección anterior, no es este placeholder), `docs/PROGRESS.md:1053` (cuenta de prueba histórica `Familia="Alberto"`, registro de hecho pasado, no un estand-in). Ningún caso ambiguo | `docs/CONTEXT.md` (nota de slogan reescrita como regla, sección i18n; nota de societario sin cambios), `docs/PRD_01_Sitio_Web.md` (referencia a la nota del slogan actualizada), `CLAUDE.md` (fila nueva de glosario "Desarrollador") |
| 2026-07-09 | Auditoría exhaustiva de TODO el código (backend + panel + sitio-web, archivo por archivo) y cierre de los 8 hallazgos encontrados (RLS por columna en `asistentes`, label hardcodeado, botón sin disabled, glosario en panel y sitio-web, service worker roto, CSS muerto, tabla `aspirantes` muerta, notificaciones de vencimiento faltantes), con las 3 migraciones nuevas aplicadas y verificadas contra Supabase real, + nota sobre el documento original de PRD de Reclutamiento (histórico, input para una futura Etapa 3, no implementado ahora) | `backend/src/db/schema_etapa2j.sql` (nuevo, aplicado — trigger RLS columnas laborales), `schema_etapa2k.sql` (nuevo, aplicado — DROP TABLE aspirantes + redefinición de vista `asistentes_coordinador`), `schema_etapa2l.sql` (nuevo, aplicado — seed 3 eventos de vencimiento); `backend/src/utils/vencimientos.js` (nuevo); `backend/src/server.js` (revisión diaria de vencimientos); `panel/src/pages/UsuariosPanel.jsx`, `panel/src/pages/Configuracion.jsx`, `panel/src/i18n/translations.js` (glosario en + labels de vencimiento en es-AR/en/pt-BR); `sitio-web/src/middleware.js`, `sitio-web/src/i18n/translations.js` (glosario en/pt-BR), `sitio-web/src/styles/components.css` (CSS muerto); `docs/DATA_MODEL.md`, `docs/SECURITY.md` (flujo real sin `aspirantes`); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-08 | Cierre iterativo de hallazgos médios/menores de la auditoría de Etapa 2 (RLS por zona, códigos estables de postulación, rutas admin-only, estados faltantes, botones sin disabled, wa.me, tab de Ausencias para Coordinador, fix de índice posicional en formulario público, fix de fixture de test, i18n huérfano) | `backend/src/db/schema_etapa2i.sql` (nuevo, aplicado y verificado contra Supabase real — vista `asistentes_coordinador` + RLS de zona en 6 tablas); `backend/src/db/schema_etapa2d.sql` (comentario, glosario); `panel/src/lib/{telefono,postulacionCodigos,roles}.js`, `panel/src/index.css`, `panel/index.html`, `panel/src/i18n/translations.js`, `panel/src/pages/{Postulaciones,PostulacionDetalle,SolicitudDetalle,Solicitudes}.jsx`, `panel/src/pages/familias/{FamiliaDetalle,PrestacionesPaciente}.jsx`, `panel/src/pages/asistentes/{AsistenteDetalle,SimuladorVinculoTab,AusenciasCoberturaTab}.jsx`, `panel/src/pages/Configuracion.jsx`, `panel/src/components/layout/ProtectedRoute.jsx`, `panel/src/App.jsx`, `panel/src/lib/__tests__/calcularCese.test.js` (fixture); `sitio-web/src/i18n/translations.js` (campo `codigo` en `servicios.items`), `sitio-web/src/app/[locale]/trabaja-con-nosotros/TrabajaConNosotrosForm.jsx` (códigos estables), `sitio-web/src/app/[locale]/solicita-servicio/SolicitaServicioForm.jsx` (fix índice posicional); `docs/SECURITY.md` (estado real de RLS de zona); `docs/PROGRESS.md` (esta entrada) |
| 2026-07-08 | Módulo 8 completo (Configuración: empresa, zonas de cobertura, notificaciones) + sitio público conectado al dato real | `backend/src/db/schema_etapa2h.sql` (nuevo, aplicado y verificado contra Supabase real); `backend/src/routes/{panelConfiguracion,configuracionPublica}.js` (nuevos); `backend/src/utils/email.js` (destinatarios por evento); `backend/src/routes/{postulacionAsistente,solicitudServicio}.js` (pasan `evento`); `backend/src/server.js` (2 rutas montadas); `panel/src/pages/Configuracion.jsx` (nuevo); `panel/src/App.jsx` (ruta `/configuracion`); `panel/src/components/layout/Layout.jsx` (link de nav); `panel/src/i18n/translations.js` (bloque `configuracion` + `nav.configuracion` + `comun.borrar` en es-AR/en/pt-BR); `sitio-web/src/lib/configuracionPublica.js` (nuevo); `sitio-web/src/app/[locale]/layout.jsx`, `sitio-web/src/app/[locale]/contacto/page.jsx`, `sitio-web/src/app/[locale]/trabaja-con-nosotros/{page,TrabajaConNosotrosForm}.jsx`, `sitio-web/src/components/WhatsAppButton.jsx` (consumen el endpoint público en vez de `siteConfig.js`) |
| 2026-07-08 | Auditoría completa de Etapas 1 y 2 contra sus PRD (a pedido explícito del dueño del proyecto antes de arrancar Etapa 3) y cierre de las 3 brechas encontradas: (1) textos hardcodeados en el formulario de postulación de Asistentes, (2) rol Superadmin implementado de punta a punta (antes solo documentado), (3) creación de 4 cuentas de prueba con un rol cada una (Superadmin, Admin, Familia="Alberto", Asistente="Beto"), todas con la misma contraseña. También se sacó el término retirado (antiguo "Filtro [nombre anterior]") del sitio público (nav, home, página `/el-filtro`) y se simplificó la copy de zona de cobertura del hero a "AMBA" | `sitio-web/src/config/siteConfig.js`, `sitio-web/src/i18n/translations.js`, `sitio-web/src/app/[locale]/trabaja-con-nosotros/TrabajaConNosotrosForm.jsx` (fix i18n); `backend/src/db/schema_etapa2g.sql` (nuevo, aplicado contra Supabase real — agrega `superadmin` al CHECK de `usuarios.rol` y a todas las policies RLS que exigían `admin`); `backend/src/middleware/requiereRolPanel.js`, `backend/src/routes/panelUsuarios.js` (Superadmin gestiona cuentas de Admin/Superadmin, Admin sigue limitado a Coordinador); `panel/src/lib/roles.js` (nuevo, helper `esAdminOSuperior`); `panel/src/components/layout/{Layout,ProtectedRoute}.jsx`, `panel/src/pages/{ListaPrecios,PostulacionDetalle,SolicitudDetalle,UsuariosPanel,asistentes/AsistenteDetalle,asistentes/PerfilTab}.jsx`, `panel/src/i18n/translations.js` (claves `rol_superadmin`, `nuevo_usuario`, `campo_rol` en es-AR/en/pt-BR) |
| 2026-07-08 | Aplicar SQL contra Supabase real y deploy del Panel a producción | `backend/src/db/{schema_etapa2e,schema_etapa2f}.sql` (aplicados y verificados contra Supabase real); `panel/vercel.json` (nuevo, rewrite SPA); `panel/.gitignore` (excluye `.vercel`) |
| 2026-07-08 | Afinado final de Etapa 2: usuarios del Panel, métricas de Dashboard, Proceso de Incorporación, Certificado de Aptitud (nombre "Certificado [nombre anterior de la prestadora original]" en ese momento, renombrado 2026-07-13) | `CLAUDE.md` (glosario actualizado); `backend/src/db/{schema_etapa2e,schema_etapa2f}.sql` (nuevos, no aplicados aún); `backend/src/routes/panelUsuarios.js` (nuevo); `backend/src/routes/panelCuentas.js` (endpoint `/asistente`); `backend/src/utils/cuentasPanel.js` (`zonas` opcional); `backend/src/server.js` (ruta montada); `panel/src/pages/UsuariosPanel.jsx` (nuevo); `panel/src/pages/Dashboard.jsx` (2 métricas nuevas); `panel/src/pages/PostulacionDetalle.jsx` (botón iniciar incorporación); `panel/src/pages/asistentes/{VerificacionTab,CertificadoTab}.jsx` (nuevos); `panel/src/pages/asistentes/AsistenteDetalle.jsx` (2 tabs nuevas); `panel/src/App.jsx` (ruta `/usuarios-panel`); `panel/src/components/layout/Layout.jsx` (link de nav); `panel/src/index.css` (clase `.panel-card-verificacion`); `panel/src/i18n/translations.js` (claves nuevas en es-AR/en/pt-BR); `panel/package.json` (agregado `qrcode`); `panel/.env`/`.env.example` (`VITE_SITE_URL`) |
| 2026-07-08 | Primer esquema de Precios y Prestaciones particulares por Paciente | `backend/src/db/schema_etapa2d.sql` (nuevo, aplicado y verificado); `panel/src/pages/ListaPrecios.jsx` + `ListaPrecioDetalle.jsx` (nuevos); `panel/src/pages/familias/PrestacionesPaciente.jsx` (nuevo); `panel/src/pages/familias/FamiliaDetalle.jsx` (botón "Prestaciones" por Paciente); `panel/src/App.jsx` (ruta `/lista-precios`); `panel/src/components/layout/Layout.jsx` (link de nav); `panel/src/i18n/translations.js` (bloques `lista_precios` y `prestaciones` + `nav.lista_precios`/`comun.editar` en es-AR/en/pt-BR) |
| 2026-07-08 | Módulo 5 completo: pantalla de Familias y Pacientes | `panel/src/pages/Familias.jsx` (nuevo); `panel/src/pages/familias/FamiliaDetalle.jsx` (nuevo); `panel/src/App.jsx` (rutas `/familias` y `/familias/:id`); `panel/src/components/layout/Layout.jsx` (link de nav); `panel/src/i18n/translations.js` (bloque `familias` + `nav.familias` en es-AR/en/pt-BR) |
| 2026-07-08 | Mecanismo de creación de cuentas (compartido) + inicio Módulo 5 (Familias) | `backend/src/db/schema_etapa2c.sql` (nuevo, aplicado y verificado); `backend/src/utils/cuentasPanel.js` (nuevo); `backend/src/routes/panelCuentas.js` (nuevo); `backend/src/server.js` (ruta montada); `panel/src/pages/SolicitudDetalle.jsx` (botón "Convertir en Familia"); `panel/src/i18n/translations.js` (4 claves nuevas en es-AR/en/pt-BR) |
| 2026-07-08 | Módulo 4 del Panel (Plantel de Asistentes) + `PRD_02B_Gestion_Personal.md` completo | `backend/src/db/schema_etapa2b.sql` (nuevo, no aplicado aún); `panel/src/lib/{calcularCese,escalasLegales,scoreRiesgo}.js` (nuevos) + `panel/src/lib/__tests__/{calcularCese,scoreRiesgo}.test.js` (nuevos); `panel/src/hooks/useEscalasLegales.js` (nuevo); `panel/src/pages/Asistentes.jsx` (nuevo); `panel/src/pages/asistentes/{AsistenteDetalle,PerfilTab,VinculoCeseTab,SimuladorVinculoTab,ScoreRiesgoTab,AusenciasCoberturaTab}.jsx` (nuevos); `panel/src/App.jsx` (rutas `/asistentes` y `/asistentes/:id`); `panel/src/components/layout/Layout.jsx` (link de nav); `panel/src/index.css` (clases nuevas del Módulo 4, solo variables existentes); `panel/src/i18n/translations.js` (claves `nav.asistentes` + bloque `asistentes` completo en es-AR/en/pt-BR); `panel/package.json` (agregado `vitest`) |
| 2026-07-08 | Etapa 2: primer corte del Panel de Administración (Módulos 1-3) | `panel/` (app nueva completa: `package.json`, `index.html`, `src/{App,main,index.css}`, `src/styles/variables.css`, `src/components/ui/{Button,FormField,Alert}.jsx`, `src/lib/supabaseClient.js`, `src/i18n/{translations,LocaleContext}.jsx`, `src/context/AuthContext.jsx`, `src/hooks/useSupabaseTable.js`, `src/components/layout/{Layout,ProtectedRoute,EstadoLista}.jsx`, `src/pages/{Login,Dashboard,Postulaciones,PostulacionDetalle,Solicitudes,SolicitudDetalle}.jsx`, `.env.example`, `.gitignore`); `backend/src/db/schema_etapa2.sql` (nuevo), `backend/src/middleware/requiereRolPanel.js` (nuevo), `backend/src/routes/panelNotificaciones.js` (nuevo), `backend/src/utils/email.js` (agregado `enviarEmail`), `backend/src/server.js` (rutas del panel montadas) |
| 2026-07-08 | Migración de Etapa 1 de Vite a Next.js 15 (App Router) | `sitio-web/package.json`, `sitio-web/next.config.mjs` (nuevos), `sitio-web/src/middleware.js`, `sitio-web/src/lib/i18n.js` (nuevos), `sitio-web/src/app/[locale]/{layout.jsx,page.jsx,servicios,el-filtro,solicita-servicio,trabaja-con-nosotros,contacto,privacidad,terminos}/*`, `sitio-web/src/app/manifest.js` (nuevos), `sitio-web/src/components/{Header,Footer,WhatsAppButton,LanguageSelector}.jsx` (reescritos como server/client components de Next.js), `sitio-web/src/hooks/useFormSubmit.js` (env var `NEXT_PUBLIC_API_URL`), `sitio-web/src/styles/global.css` (ajuste `#root`→`body`), `sitio-web/.env.example`, `sitio-web/.gitignore` (`.next`); eliminados: `sitio-web/index.html`, `sitio-web/vite.config.js`, `sitio-web/src/App.jsx`, `sitio-web/src/main.jsx`, `sitio-web/src/i18n/LocaleContext.jsx`, `sitio-web/src/pages/*` (8 archivos); actualizado `docs/CONTEXT.md` |
| 2026-07-07 | Etapa 1: sitio web público completo (primera pasada) | `sitio-web/src/pages/*` (8 páginas), `sitio-web/src/components/*` (Header, Footer, WhatsAppButton, LanguageSelector, ui/{Button,FormField,Alert}), `sitio-web/src/i18n/LocaleContext.jsx`, `sitio-web/src/config/siteConfig.js`, `sitio-web/src/hooks/useFormSubmit.js`, `sitio-web/vite.config.js` (PWA), `sitio-web/index.html` (fuentes + meta), `sitio-web/src/styles/{global,components}.css` (reescritos), `backend/src/routes/{solicitudServicio,postulacionAsistente}.js`, `backend/src/db/{connection,schema}.sql`, `backend/src/utils/email.js`, `backend/src/server.js` (rutas conectadas) |
| 2026-07-07 | Etapa 0: setup inicial de repo y estructura | `CLAUDE.md` (movido a raíz), `.gitignore`, `README.md`, `sitio-web/` (scaffold Vite+React+Router, `src/styles/{variables,global,components}.css`, `src/i18n/translations.js`, `.env.example`), `backend/` (scaffold Express, `src/server.js`, `.env.example`, `.gitignore`) |
| 2026-07-07 | Generación de documentación técnica en `Workspace/docs/` (sin código todavía) | `CLAUDE.md`, `CONTEXT.md`, `DESIGN_SYSTEM.md`, `DATA_MODEL.md`, `AI_PROMPTS.md`, `SECURITY.md`, `PRD_01_Sitio_Web.md`, `PRD_02_Panel_Admin.md`, `PRD_02B_Gestion_Personal.md`, `PRD_03_Reclutamiento.md`, `PRD_04_05_App_Servicio.md`, `BUILD_ORDER.md`, `PROGRESS.md` |
