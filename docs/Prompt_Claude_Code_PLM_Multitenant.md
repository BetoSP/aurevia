# Prompt para Claude Code — Preparar el software para el modelo PLM Systems / prestadora-original

> Copiá y pegá este prompt completo como mensaje inicial en Claude Code, dentro del repositorio del software de gestión (Panel Admin / App Servicio). Ajustá las rutas y nombres de archivo del bloque "Contexto del repo" antes de enviarlo.

---

## Contexto de negocio (leer antes de tocar código)

Hasta ahora, el software que estamos construyendo (Panel Admin + App de Servicio) fue diseñado como una herramienta interna de una sola empresa: prestadora-original, que provee cuidadores a domicilio ("Asistentes") y gestiona todo — verificación de personal, reportes diarios, alertas, check-in/check-out por GPS, certificado con QR — para su propio plantel y sus propias familias clientas.

Esto está cambiando. Vamos a separar el negocio en dos empresas:

1. **PLM Systems** (nueva empresa, aún en formación): va a ser la dueña del software y va a licenciarlo como producto — no solo a prestadora-original, sino potencialmente a **cualquier empresa prestadora de cuidado domiciliario**, dentro y fuera de la Argentina. prestadora-original es su primer cliente, pero el software tiene que dejar de estar diseñado "para prestadora-original" y pasar a estar diseñado "para cualquier prestadora que lo licencie".
2. **prestadora-original** sigue con su negocio de cuidado domiciliario (modelo directo a familias y marketplace), y además vende un servicio de auditoría/certificación B2B a otras prestadoras — apoyado en la tecnología que le licencia a PLM, pagando como cualquier otro cliente.

**La consecuencia técnica central**: el sistema tiene que pasar de ser mono-tenant (una sola organización, la de prestadora-original) a **multi-tenant real**, donde cada prestadora que licencia el software es un cliente aislado, con su propio personal, sus propios pacientes, y sin visibilidad de los datos de ningún otro cliente — incluida la propia prestadora-original, que a estos efectos es "un cliente más" del sistema.

No estamos pidiendo que implementes todo esto de una — primero necesitamos que relevés el estado actual del código y nos propongas un plan. Léelo todo antes de escribir nada.

---

## Qué tiene que poder hacer el sistema a partir de ahora

### 1. Multi-tenancy real, no solo un campo nullable

Cada **prestadora licenciataria** (llamalas "organización" o "tenant" en el modelo de datos, el nombre de negocio es "prestadora") necesita:

- Su propio espacio de datos: personal certificado, pacientes, reportes, alertas, historial de auditoría — completamente aislado del de cualquier otra prestadora, incluida prestadora-original.
- Aislamiento a **nivel de query / row-level security**, no solo de UI. Si en algún momento hay una auditoría regulatoria sobre cómo se manejan datos de salud de afiliados de una obra social, "el frontend no muestra lo que no debería" no es una respuesta aceptable.
- Un plan de branding por tenant: el certificado con QR y la app que ve la familia del paciente deberían poder mostrar la marca de la prestadora licenciataria, no necesariamente la de prestadora-original ni la de PLM — esto es parte de lo que se vende (la prestadora quiere que su marca sea la que ve el cliente final, no la del proveedor de tecnología).

### 2. Modelo de datos — entidad `prestadoras` (u `organizaciones`), no un campo suelto

No alcanza con agregar un campo `prestadora_id` nullable a la tabla de personal. Necesitamos como mínimo:

- Una entidad propia `prestadoras` con: razón social, identificación fiscal, estado (prospecto / en proceso de certificación / certificada / suspendida / dada de baja), zona geográfica de operación, plan de licencia contratado, fecha de alta.
- Cada persona de "personal de cuidado" (hoy "Asistente") tiene que poder pertenecer a exactamente una prestadora, con una restricción de integridad que impida que un registro tenga a la vez datos de "personal propio, contratado directamente" (los que hoy tiene prestadora-original) y datos de "personal de una prestadora tercera licenciataria" — son dos regímenes distintos y no se pueden mezclar en el mismo registro. Que el esquema lo prohíba, no solo la lógica de negocio.
- Un módulo de **compliance documental por prestadora**: checklist versionado de qué documentación laboral se le pidió y verificó a cada prestadora y cuándo (identificación de cada trabajador, constancias de pago, seguro de riesgos del trabajo vigente), con alertas automáticas de vencimiento, y un registro con fecha cierta e inmutable de cada verificación. Esto no es opcional ni cosmético: es lo que sostiene legalmente el modelo de negocio completo (protege a quien licencia el software de responsabilidad por incumplimientos laborales de terceros), así que necesita ser confiable y auditable, no un campo de texto libre.

### 3. Roles y permisos nuevos

Además de los roles que ya existen (administrador de prestadora-original, Asistente, familia/paciente), necesitamos:

- **Administrador de prestadora**: acceso de solo lectura/gestión limitada a los datos de su propia prestadora — su propio personal, sus propios pacientes/casos, sus propios reportes y alertas. Cero visibilidad de otras prestadoras o del plantel propio de prestadora-original.
- Dejar **contemplado en el diseño de roles** (no implementar todavía) un futuro rol de "financiador" (obra social/prepaga) con acceso agregado y de solo lectura a métricas de cumplimiento, sin acceso a historia clínica detallada — para no tener que rediseñar permisos desde cero cuando se pida.

### 4. Facturación / licenciamiento — implementación completa, no solo el modelo de datos

Esto se corrige respecto a una versión anterior de este prompt: **sí necesitamos el módulo de facturación implementado ahora**, no solo un esquema que "no lo bloquee después". Tiene que soportar, desde el arranque, los tres esquemas de precio siguientes, configurables por prestadora sin cambios de código (todavía no se definió cuál se va a usar comercialmente con cada cliente, así que tiene que poder convivir más de uno a la vez):

- Por caso/paciente activo por mes.
- Por persona de personal certificada activa.
- Fee fijo mensual por prestadora (licencia plana).

Tiene que generar, distinguir y emitir por separado **dos facturaciones que corren sobre la misma plataforma pero son de dos empresas distintas**: lo que le factura **PLM a la prestadora por la licencia del software**, y lo que **prestadora-original le factura a la prestadora por su servicio de auditoría/certificación** (cuando prestadora-original sea quien presta ese servicio a esa prestadora en particular). Esto incluye numeración y comprobantes separados por empresa emisora, no una sola factura combinada.

### 5. Soporte multi-idioma y multi-moneda — implementar ahora

También se corrige: no esperamos a tener el primer cliente fuera de Argentina para resolver esto — tiene que estar desde el diseño inicial:

- Toda la interfaz (panel admin, app de servicio) preparada para internacionalización (i18n) desde el arranque, aunque el único idioma cargado hoy sea español — que agregar un idioma nuevo sea un trabajo de traducción de contenido, no de refactor de código.
- Todo campo de precio, factura o monto en el modelo de datos tiene que llevar moneda asociada explícitamente (no asumir ARS de forma implícita en ningún lado), y el motor de facturación del punto 4 tiene que poder emitir en la moneda que corresponda a cada prestadora/contrato, con el tipo de cambio de referencia que se use registrado en cada comprobante (para trazabilidad, no para conversión automática en tiempo real — eso no hace falta todavía).

### 6. Residencia de datos por región (dejar preparado, no implementar ya)

Como el software se va a licenciar potencialmente a prestadoras de otras provincias argentinas y de otros países, y maneja datos de salud (dato sensible bajo cualquier régimen de protección de datos de la región), dejá identificado en el diseño dónde habría que introducir un concepto de "región de datos" por tenant, aunque hoy todo viva en la misma infraestructura. No lo implementes todavía — solo señalá en tu propuesta dónde impactaría.

---

## Lo que NO estamos pidiendo todavía (para que no te desvíes de foco)

- No hace falta portal para financiadores (obras sociales) — es una fase futura. Sí dejá **contemplado en el diseño de roles** (ver punto 3) un futuro rol de "financiador", para no tener que rediseñar permisos desde cero cuando se pida, pero no lo implementes.
- No hace falta implementar la residencia de datos por región (punto 6) — solo dejarla señalada en el plan.
- No toques nada del modelo directo a familias ni del marketplace — este cambio es aditivo, no debería romper lo que ya funciona para prestadora-original como empresa de cuidado.

---

## Lo que sí te pedimos ahora

1. Explorá el repo actual (modelo de datos, backend, frontend del panel admin y de la app de servicio) y hacé un inventario de qué partes hoy asumen "una sola organización" (prestadora-original) de forma implícita — hardcodeos, falta de scoping por tenant en queries, falta de un concepto de organización en el modelo de autenticación, etc.
2. Proponé un plan de migración de datos concreto — cómo pasamos del esquema actual a uno con la entidad `prestadoras` y el aislamiento descripto, sin perder los datos existentes de prestadora-original ni romper producción.
3. Proponé el diseño de la entidad `prestadoras`, el modelo de compliance documental, y el esquema de roles nuevo — con el nivel de detalle de un diagrama de tablas/modelos, no solo prosa.
4. Marcá explícitamente cualquier punto donde el diseño actual haga esto más difícil de lo necesario, para que lo discutamos antes de que empieces a escribir código de producción.

No implementes nada todavía en este primer paso — quiero ver el plan y el inventario antes de que toques código.
