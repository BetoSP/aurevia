# PRD_02 — Panel de Administración

> Fuente: `prestadora-original_DOCUMENTO_UNICO_v1.md` Parte N. Etapa 2 del build order. Herramienta
> interna — solo Admin_prestadora y Coordinador acceden (Superadmin también, con acceso
> técnico adicional — ver `SECURITY.md`). SPA separada del sitio público, deployada
> en el mismo Vercel. Acceso: `admin.prestadora-originalsalud.com.ar` (o `/admin`).

## Stack

React 18 + Vite. Auth: Supabase Auth (email + password, sin magic link — ver
`SECURITY.md`). En esta etapa se migra de MySQL a Supabase: el sitio público sigue en
Express/MySQL, el panel ya usa Supabase directamente.

## Roles y permisos

| Rol | Ve | Hace |
|---|---|---|
| Admin_prestadora | Todo el negocio de su propia prestadora | Todo, dentro de su prestadora |
| Coordinador | Sus asignaciones, sus zonas | Gestionar guardias y Asistentes de su zona |

## Módulos

### Módulo 1 — Dashboard
Métricas en tiempo real: postulaciones recibidas hoy/semana, solicitudes pendientes,
guardias activas ahora, Asistentes disponibles, familias activas, alertas de IA sin
resolver.

### Módulo 2 — Postulaciones de Asistentes
Lista (nombre, especialidad, zona, fecha, situación fiscal, estado) + filtros (texto,
especialidad, zona, estado, disponibilidad urgencias). Acciones: ver perfil, cambiar
estado (con nota), email automático al Asistente, iniciar verificación (avanza las 5
etapas — tabla `verificaciones_asistente` en `DATA_MODEL.md`). Vista mapa con Asistentes
del plantel activo agrupados por zona; al llegar una solicitud, filtra automáticamente los
más cercanos.

### Módulo 3 — Solicitudes de Servicio (Familias)
Lista (nombre, teléfono, localidad, tipo de servicio, modalidad, fecha, estado) + filtros.
Acciones: ver detalle, asignar Asistente (por zona + especialidad + disponibilidad),
cambiar estado, click-to-call, nota interna.

### Módulo 4 — Plantel de Asistentes

Lista de Asistentes verificados y activos (nombre, especialidades, zonas, estado,
monotributo activo, seguro vencimiento, guardias activas) + filtros.

Perfil individual: datos personales, etapas de verificación con fechas, guardias
históricas, evaluaciones recibidas, estado de monotributo/seguro, botón generar/ver
Certificado QR.

**Este módulo se extiende, no se reemplaza, por `PRD_02B_Gestion_Personal.md`** —
el vínculo laboral dual-track (monotributo/dependencia), el simulador de costos y el
motor de cese viven dentro de este mismo módulo.

### Módulo 5 — Familias y Pacientes
Lista de familias activas; por familia: contacto, pacientes, guardias activas, historial
de reportes, alertas activas.

### Módulo 6 — Guardias

**Estado 2026-07-10: Parte 1 ("Guardias core") construida en el Panel**, sobre el schema
existente (`backend/src/db/schema_modulo6_guardias.sql`, 8 tablas, RLS multi-tenant
verificada contra Supabase real — ver `DATA_MODEL.md` y `SECURITY.md`). Sin rutas backend
nuevas: la UI consulta/escribe directo contra Supabase (anon key), confiando en las policies
RLS ya definidas en el schema para el aislamiento por prestadora/zona — mismo patrón que
`Familias.jsx`/`Asistentes.jsx`.

Piezas de la Parte 1, ya construidas (`panel/src/pages/Guardias.jsx`,
`panel/src/pages/guardias/NuevaGuardiaModal.jsx`,
`panel/src/pages/guardias/GuardiaAcciones.jsx`):

- **Alta de serie o guardia suelta**: un modal con un checkbox "es una guardia recurrente"
  que alterna entre cargar una guardia de fecha única o una serie (`series_guardias`, con
  días de la semana + vigencia) que genera las filas concretas de `guardias` en el momento de
  crearla, acotado a 90 días si no se carga `vigente_hasta` (ventana práctica, no indefinida).
- **Vista lista, agrupada por día** (no calendario visual con grilla — una agenda por fecha
  cumple la misma función de escaneo rápido sin sumar una librería de calendario): fecha,
  Asistente, Paciente, modalidad, estado con color automático (clases `.guardia-*` de
  `DESIGN_SYSTEM.md`, incluye el `.guardia-ausente` que faltaba). Alerta visual si la guardia
  está activa con check-in y sin check-out pasadas 2hs del horario pactado.
- **Checkpoint de salida, check-in de llegada y check-out**: capturan timestamp +
  geolocalización best-effort (`panel/src/lib/ubicacion.js` — nunca bloquea la acción si el
  navegador no expone o niega la geolocalización, por la regla 11 de `CLAUDE.md`). El
  check-out respeta `checkout_bloqueado` (lo bloquea y explica por qué), aunque nada en esta
  Parte 1 pone ese flag en `true` todavía — eso es de la Parte 2.
- **Cancelar guardia** (origen + alcance) y **marcar ausente**, ambas con confirmación
  explícita (regla 4) — "marcar ausente" solo cambia el estado de la guardia; no crea todavía
  ningún `incidentes_relevo` ni dispara escalada (eso es la Parte 2, sin construir).

**Explícitamente fuera de esta Parte 1** (no construido, ni siquiera parcialmente):

- **Continuidad de guardia — Parte 2**: `incidentes_relevo`, `configuracion_escalada_relevo`,
  `excepciones_familiar_relevo`. Tiene que contemplar desde el diseño que
  `personal_emergencia` puede estar vacío en el momento en que se activa (la Parte 3 puede no
  existir todavía) sin romper — degradar con un mensaje, no fallar.
- **Piezas de apoyo — Parte 3**: `domicilios_temporales_paciente`, `personal_emergencia`.
- **`guardias_tracking_gps`**: no se construye ni el endpoint ni ninguna forma parcial/con
  flag — bloqueante explícito por Ley 25.326 sin política de retención definida (ver
  comentario en el propio schema). No reproponer una versión "detrás de un flag" sin resolver
  antes esa política.

No diseñar ni construir el resto de este módulo (Partes 2 y 3) sin releer el schema real
primero.

### Módulo 7 — Reportes y Alertas (IA Nivel 2)
Lista de alertas activas (ROJA/AMARILLA) por paciente. Clic → ver reportes que generaron
la alerta. Marcar resuelta (con nota). Historial de alertas resueltas.

### Módulo 8 — Configuración
Datos de la empresa, **precios por modalidad** (se cargan desde acá, nunca hardcodeados),
zonas de cobertura activas, usuarios del panel (crear/modificar Coordinadores),
configuración de notificaciones.

Nota de arquitectura a futuro (no construir todavía, no bloquea Etapa 2): si el panel
llega a ofrecerse a distintas coordinaciones u obras sociales con alcances distintos, vale
la pena que los módulos del panel sean activables/desactivables por configuración (patrón
visto en el Back Office de GlamourOS) en vez de si-el-rol-lo-permite hardcodeado en cada
componente. Evaluar solo si surge ese escenario de negocio, no diseñar para él ahora.

## Flujo de asignación de guardia

1. Llega solicitud → aparece en Módulo 3 como "Nueva".
2. Coordinador abre la solicitud.
3. Sistema sugiere Asistentes por zona + especialidad + disponibilidad.
4. Coordinador selecciona Asistente.
5. Notificación al Asistente (email; push cuando la PWA esté lista).
6. Asistente confirma → guardia "Programada".
7. Check-in GPS en fecha/hora acordada → "Activa".
8. Reporte diario + check-out → "Completada".

## Notificaciones automáticas

| Evento | Notifica a |
|---|---|
| Nueva solicitud de servicio | Admin_prestadora + Coordinador de turno |
| Nueva postulación de Asistente | Admin_prestadora |
| Asistente no hizo check-in en horario | Coordinador + Admin_prestadora |
| Guardia activa sin check-out +2hs del horario pactado | Coordinador + Admin_prestadora |
| Alerta IA Nivel 2 ROJA | Coordinador + Familia |
| Alerta IA Nivel 2 AMARILLA | Coordinador |
| Seguro del Asistente vence en 30 días | Admin_prestadora |
| Monotributo del Asistente no activo | Admin_prestadora |

## Datos y RLS

Ver `DATA_MODEL.md` para las tablas que este panel lee/escribe y `SECURITY.md` para las
políticas RLS exactas. Ningún dato de `escalas_legales`/`ceses` es visible fuera de
Admin_prestadora (y Coordinador solo si el PRD de Gestión de Personal lo habilita
explícitamente para su zona — por defecto, no).
