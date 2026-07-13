# BUILD_ORDER.md — Orden de construcción del código

> Fuente: `prestadora-original_DOCUMENTO_UNICO_v1.md` (tabla de etapas, Parte D) + `prestadora-original_PROMPT_MAESTRO_v1.md`.
> Cada etapa requiere la anterior funcionando en producción — no paralelizar etapas de
> código salvo que se indique lo contrario.

| Etapa | Qué se construye | Condición de entrada | Estimación | PRD de referencia |
|---|---|---|---|---|
| 0 | Setup: repo, estructura, variables de entorno | — | — | `CLAUDE.md` |
| 1 | Sitio web público (6-8 páginas + formularios + backend Express/MySQL) | Ninguna, arranca ahora | 2-3 semanas | `PRD_01_Sitio_Web.md` |
| 2 | Panel de administración (web desktop, migra a Supabase) | Sitio web activo | 1-2 semanas | `PRD_02_Panel_Admin.md` |
| 2B | Gestión de Personal (vínculo, cese, riesgo, cobertura) | Panel de admin funcionando, Módulo 4 del panel construido | Integrada a Etapa 2 | `PRD_02B_Gestion_Personal.md` |
| 3 | PWA Asistentes (login, guardias, GPS check-in/out, reporte diario + IA Nivel 1) | Panel de admin funcionando | 2-3 semanas | `PRD_04_05_App_Servicio.md` |
| 4 | PWA Familias (login, pacientes, reportes, alertas IA Nivel 2) | PWA Asistentes funcionando | 1-2 semanas | `PRD_04_05_App_Servicio.md` |
| 5 | Planillas IOMA (Planilla 3 + Resumen Mensual en PDF) | Reportes funcionando | 1 semana | `PRD_04_05_App_Servicio.md` |
| 6 | Perfil público del Asistente con QR verificable | Asistentes certificados | 1 semana | `PRD_04_05_App_Servicio.md` |
| Diferida | App nativa (Capacitor o React Native) | 50+ familias activas, negocio validado | 1-5 semanas | — |
| Diferida | IA Niveles 3-5 (matching, asistente virtual, análisis predictivo) | Datos históricos suficientes | Variable | — |
| En progreso | Multi-tenancy real (entidad `prestadoras`, aislamiento por organización, roles y facturación PLM/prestadora-original) | Plan y diseño aprobados (`docs/PLAN_MULTITENANT_PLM.md`); Bloques 1-3 aplicados y verificados contra Supabase real (2026-07-09/10: aislamiento de datos, RLS centralizada `current_tenant()`/`es_superadmin()`, rol `admin`→`admin_prestadora`, filtrado de tenant en backend); solo falta Bloque 4 (`configuracion_prestadora`) | Variable | `docs/PLAN_MULTITENANT_PLM.md` |
| En progreso | Módulo 6 — Guardias (series, GPS check-in/out, incidentes de relevo, escalada) | Módulo 4/5 del Panel funcionando | Variable | schema aplicado (`backend/src/db/schema_modulo6_guardias.sql`); **Parte 1 (Guardias core) construida en Panel** (2026-07-10): alta de series/guardias sueltas, lista agenda por día, checkpoint de salida, check-in/check-out, cancelación, marcar ausente — sin rutas backend nuevas (RLS directa). **Parte 2 (Continuidad de guardia) construida 2026-07-12, commiteada (`4e94afa`)**. Rediseño del pendiente #20 (detección automática de ausencia + alertas tempranas extensibles) **construido, schema aplicado y probado en navegador real 2026-07-13** (commit `d61b7f2`, desplegado a Vercel): schema `backend/src/db/schema_modulo6_guardias_03.sql` (aplicado contra Supabase real, tablas `configuracion_ausencia_automatica`/`alertas_tempranas_guardia` verificadas — ver pendiente #21), cron `backend/src/utils/ausenciaAutomatica.js`, acción "Registrar aviso previo" en `GuardiaAcciones.jsx`, sección "Alertas tempranas" en `Continuidad.jsx` — probado end-to-end con 30 Pacientes/60 Asistentes/33 guardias cubriendo 7 escenarios (ver pendiente #20). Falta todavía Parte 3 (Piezas de apoyo) — sin PRD dedicado, ver `docs/PROGRESS.md`. El envío de mensajes de escalada por WhatsApp tiene diseño preliminar en `docs/PRD_06_WhatsApp_IA.md`, marcado explícitamente "en discusión — no implementar todavía" |

El reclutamiento (`PRD_03_Reclutamiento.md`) no es una etapa de código separada — sus
pantallas y formularios se reparten entre Etapa 1 (formulario público de postulación) y
Etapa 2 (panel de postulantes, verificación, capacitación). Empieza en paralelo a Etapa 1
porque el plantel de 20 Asistentes debe estar listo antes del lanzamiento comercial, pero el
código que lo soporta se construye dentro de esas dos etapas, no aparte.

## Regla de secuencia

No empezar una etapa de código sin que la anterior esté funcionando en producción (no solo
"código escrito" — desplegado y probado). Esto es una regla de gestión de riesgo del
proyecto, no una preferencia arbitraria: cada etapa valida supuestos de negocio (familias
reales, Asistentes reales) que las etapas siguientes dan por sentado.

## Fuera del alcance de código (para contexto, no bloquean desarrollo)

Fase 0 (meses 1-3) también incluye trámites legales/societarios (constitución SAS, alta
AFIP, contrato con abogado laboralista, póliza de RC, registro de marca) que corren en
paralelo al desarrollo pero no son tareas de código — no se listan acá en detalle porque no
son accionables desde este repositorio.
