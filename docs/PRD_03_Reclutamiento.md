# PRD_03 — Reclutamiento (Sitio de Captación + Postulación + Verificación)

> Fuente: documento original de PRD de Reclutamiento (histórico, fuera del repo, v1.0, Mayo 2026). Condensado para
> ejecución directa, con las siguientes correcciones respecto del original: (1) el original
> menciona un nombre propio ("Alberto Sánchez") como responsable de entrevistas —
> reemplazado por "Inversor" o "Admin_prestadora", igual que en el resto de
> `Workspace/docs/`, ver nota del glosario en `CLAUDE.md`; (2) se documenta explícitamente una discrepancia de stack, ver
> sección "Nota de stack" abajo, en vez de elegir en silencio; (3) el original usa
> "Cuidadora"/"Cuidadoras" en varios lugares (tabla de usuarios del sistema, catálogo de
> especialidades) — reemplazado por "Asistente"/"Asistente Integral" en todo el documento,
> regla del glosario obligatorio; (4) se agregó la sección "Landing page de reclutamiento"
> (contenido de la página pública — perfiles buscados, beneficios, zonas — del original, que
> no estaba condensada acá todavía); (5) queda fuera de alcance la Sección 8 del original
> (comparativa de posicionamiento frente a la competencia) y la mención a explorar aval
> institucional de terceros (Cruz Roja, AAGG) — son decisiones de negocio/marketing, no
> generan código.

## Objetivo

La prestadora necesita mínimo 20 Asistentes Integrales certificados antes del lanzamiento
comercial. El proceso de incorporación completo tarda 4-7 días hábiles por persona — el
reclutamiento arranca en Etapa 0/1, antes que el resto del producto.

## Nota de stack (discrepancia a resolver, no a ignorar)

Este documento fuente (v1.0, Mayo 2026) especifica Supabase + Railway/Render + Twilio +
Resend/SendGrid desde el arranque. `CONTEXT.md`/prompt maestro original (histórico) especifican
Etapa 1 = Express + MySQL en Railway, migración a Supabase recién en Etapa 2. **Se sigue el
build order de `CONTEXT.md`/`BUILD_ORDER.md` como fuente de verdad para la secuencia de
stack** — este PRD de Reclutamiento aporta el detalle funcional (campos de formulario,
etapas de verificación, panel), no la decisión de infraestructura. Twilio (SMS) no aparece
en ningún otro PRD oficial — no implementar verificación por SMS hasta que haya una decisión
de negocio explícita al respecto.

## Proceso de Incorporación de Asistentes — 6 etapas

**Nota de nomenclatura (corregida 2026-07-10):** esta tabla es la que directamente alimenta
las pantallas de Panel (Módulo 2/4 de `PRD_02_Panel_Admin.md`, tabla `verificaciones_asistente`)
— dentro del Panel, uso interno, se llama "Proceso de Incorporación de Asistentes". El nombre
anterior quedó retirado por completo, de cualquier contexto interno o público
(ver glosario de `CLAUDE.md`) — no reintroducirlo ni siquiera como "concepto general".

| Etapa | Descripción | Responsable | SLA |
|---|---|---|---|
| 0 — Postulación | Formulario público, estado inicial `pendiente` | Sistema | Inmediato |
| 1 — Verificación de identidad | Foto DNI + foto de perfil, comparación por IA | Sistema + Coordinador | < 24hs |
| 2 — Antecedentes penales | Consulta Registro Nacional de Reincidencia, renovación anual | Coordinador | 1-2 días |
| 3 — Entrevista estructurada | Videollamada 30 min, evalúa competencia técnica/emocional/valores | Admin_prestadora | 1 día |
| 4 — Referencias laborales | Mínimo 2 referencias verificadas por teléfono | Coordinador | 1-2 días |
| 5 — Capacitación y certificación | 8hs online, aprobación mínima 80%, emite Certificado de Aptitud con QR | Sistema + aspirante | 1-2 días |

Estas 5 etapas post-postulación son exactamente `etapa_filtro` en `verificaciones_asistente`
(`DATA_MODEL.md`) — mismos nombres, no inventar variantes: `postulacion`,
`verificacion_identidad`, `antecedentes_penales`, `entrevista`, `capacitacion`.

**UI del progreso del aspirante:** mostrar estas 5 etapas como checklist con % de
completitud (ej. "3 de 5 etapas completas — 60%"), no solo como un estado de texto plano —
le da al aspirante una noción clara de cuánto falta, igual que un onboarding progresivo.

## Roles

| Rol | Quién | Acceso |
|---|---|---|
| Aspirante | Postulante sin verificar | Formulario público + estado de su postulación |
| Asistente | Verificada e incorporada al plantel | App + panel propio |
| Admin_prestadora | Gestión de negocio de la prestadora (rol técnico — distinto del Inversor como persona, ver glosario de `CLAUDE.md`) | Panel de administración completo |
| Familia | Contrata el servicio | Portal de seguimiento |
| Coordinador | Rol operativo | Gestión de su zona |

## Landing page de reclutamiento (sitio público)

Cara pública de la campaña de incorporación — comunica a quién busca la prestadora, qué ofrece y
cómo es el proceso, antes de llevar al aspirante al formulario. Corrección de terminología
respecto del documento fuente: donde el original dice "Cuidadoras" se usa "Asistentes
Integrales" (glosario de `CLAUDE.md`).

**Perfiles buscados** (checklist visual, no un formulario todavía): Asistente Integral /
Auxiliar de Enfermería / Enfermero/a profesional / Kinesiólogo/a / Acompañante Terapéutico/a
/ Fonoaudiólogo/a / Psicólogo/a / Terapista Ocupacional / Nutricionista / otras
especialidades vinculadas al cuidado de personas — mismo catálogo que `especialidades` en
`asistentes` (`DATA_MODEL.md`), no crear una lista paralela.

**Beneficios que comunica el sitio**: trabajo registrado; honorarios acordados según
especialidad y experiencia (sin publicar montos — ver regla abajo); Certificado de Aptitud
con QR verificable; respaldo operativo permanente; aplicación propia de gestión de guardias;
capacitación continua.

**Zonas de cobertura**: mismo catálogo de zona/municipios que la Sección E del formulario
(ver abajo) — no duplicar como una lista independiente en el código, es contenido estático
de la landing que puede leer del mismo catálogo.

## Formulario de postulación (landing pública)

Regla explícita del PRD original: **no publicar honorarios en el sitio** — se relevan en el
formulario sin sesgar la respuesta del aspirante, se acuerdan individualmente en la
entrevista (Etapa 3).

### Sección A — Datos personales

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| Nombre / Apellido | texto | Sí | |
| DNI | numérico | Sí | validar formato |
| Fecha de nacimiento | date | Sí | validar mayoría de edad (18+) |
| Teléfono/WhatsApp | tel | Sí | |
| Email | email | Sí | con confirmación |
| Domicilio | texto + Maps | Sí | confirmar en mapa |
| Localidad/Barrio | texto | Sí | |
| Nacionalidad | select | No | |
| CUIL | numérico | No | |
| Género | select (Femenino/Masculino/No binario/Prefiero no contestar) | Sí | |
| Foto de perfil | file (imagen) | Sí | detectar rostro antes de aceptar |

### Sección B — Situación fiscal

| Campo | Opciones | Obligatorio |
|---|---|---|
| Situación ante AFIP | Monotributista / Me comprometo a inscribirme / Otra | Sí |
| Tipo de registro AFIP | No inscripto / Monotributo social / Monotributista / Responsable inscripto | Sí |
| Obra social | texto libre | No |

Regla de negocio (bloqueante para asignación, no solo informativa): ser monotributista es
obligatorio para recibir guardias. Si el aspirante no está inscripto, el sistema **bloquea
la asignación** hasta que Admin_prestadora confirme el alta de monotributo — este es el mismo campo
`tipo_vinculo`/monotributo de `asistentes` en `DATA_MODEL.md`, no una tabla nueva.

### Sección C — Formación y certificaciones

Profesión/especialidad (checkboxes múltiples — mismo catálogo que `especialidades` en
`asistentes`: Asistente Integral, Acompañante Terapéutico/a, Enfermero/a, Auxiliar de
Enfermería, Asistente Gerontológico/a, Kinesiólogo/a, Fonoaudiólogo/a, Psicólogo/a,
Terapista Ocupacional, Nutricionista, Voluntario/a, Otro — mínimo 1 obligatorio;
corregido respecto del documento fuente, que decía "Cuidadora Domiciliaria" — término
prohibido por el glosario de `CLAUDE.md`). Estudios/cursos y experiencia
laboral: formularios dinámicos (múltiples entradas), opcionales pero mejoran ranking.
Referencias laborales: nombre/apellido/teléfono, 0 a 5, mínimo 2 para aprobar.

### Sección D — Experiencia clínica

Checkboxes en 5 subgrupos: discapacidades con experiencia, patologías clínicas atendidas,
tareas de cuidado directo, tareas de acompañamiento, tareas domésticas — catálogo completo
en el documento fuente, usar como opciones fijas de un multi-select, no texto libre.

### Sección E — Zonas de cobertura

Selector múltiple de zona + municipio + distancia máxima desde el domicilio. Catálogo de
zonas (mismas que usa el resto del proyecto — no crear un catálogo paralelo):

| Zona | Municipios |
|---|---|
| CABA | Todos los barrios |
| GBA Norte | San Isidro, Vicente López, San Martín, Tres de Febrero, San Miguel, Malvinas Argentinas, José C. Paz, Tigre, Pilar, Escobar |
| GBA Oeste | Morón, Ituzaingó, Haedo, Castelar, El Palomar, Merlo, Moreno, La Matanza |
| GBA Sur | Lomas de Zamora, Lanús, Avellaneda, Quilmes, Berazategui, Florencio Varela, Almirante Brown |
| La Plata y alrededores | La Plata, Berisso, Ensenada, Brandsen |

### Sección F — Disponibilidad horaria

Grilla días (L-D) x franjas (Mañana 6-14 / Tarde 14-22 / Noche 22-6) — mapea directo a
`asistentes.disponibilidad` (JSONB) en `DATA_MODEL.md`. Más checkboxes: disponible para
urgencias, disponible con retiro (por horas), disponible sin retiro (cama adentro).

## Panel de administración — sección Postulantes

Estadísticas en tiempo real: total postulantes, pendientes de revisión, en verificación,
aprobadas y disponibles, aprobadas sin monotributo (bloqueadas), rechazadas.

Tabla de postulantes — columnas: nombre, especialidad, zona, pretensión de honorario/hora,
años de experiencia, condición fiscal, disponible para urgencias, estado, canal de llegada.
Orden por defecto: más reciente primero.

Filtros: texto libre, especialidad, estado (Pendiente/En revisión/Aprobada/Rechazada/
Suspendida), zona, franja horaria, disponibilidad urgencias, distancia máxima, condición
fiscal, rango de honorario/hora, tipo de servicio.

Mapa geolocalizado del plantel activo agrupado por municipio — al llegar una solicitud de
familia, filtra automáticamente las Asistentes disponibles más cercanas (mismo componente
de mapa que `PRD_02_Panel_Admin.md` Módulo 2/3, no duplicar implementación).

## Programa de capacitación (Etapa 5 del Proceso de Incorporación de Asistentes)

8 horas online en 4 bloques (2hs c/u): 1) La persona mayor, 2) Cuidados esenciales, 3)
Seguridad y prevención, 4) El rol del Asistente (incluye uso de la app: check-in/out, reporte
diario, registro de medicación, código de conducta). Evaluación: 20 preguntas de opción
múltiple, aprobación mínima 80% (16 correctas). Emite Certificado de Aptitud digital (nombre,
especialidad, fecha, QR verificable) — mismo `qr_token` que ya existe en `asistentes`
(`DATA_MODEL.md`), no crear un segundo mecanismo de certificado.

## Fuera de alcance de este documento

Alianzas institucionales para avalar la capacitación (mencionadas como pendientes en el
original) y comparativas de posicionamiento frente a competidores — son decisiones de
negocio/marketing, no generan código.
