# PLAN_MULTITENANT_PLM.md — Inventario + plan de migración a multi-tenant (PLM Systems)

> Responde a los 4 puntos de "Lo que sí te pedimos ahora" en
> `docs/Prompt_Claude_Code_PLM_Multitenant.md`. Es un documento de **plan**, no de
> implementación — ningún código de producto se tocó para escribir esto. No arrancar la
> implementación de ninguna sección sin aprobación explícita del usuario, punto por punto
> (hay varias decisiones de diseño con implicancias grandes marcadas explícitamente en la
> sección 4).

## 1. Inventario — qué asume hoy "una sola organización" (prestadora-original)

Relevamiento completo del repo (`backend/`, `panel/`, `sitio-web/`, `docs/DATA_MODEL.md`,
`docs/SECURITY.md`). Resumen ejecutivo:

- El **único eje de segmentación de datos hoy es el rol** (`usuarios.rol`), combinado
  opcionalmente con **zona geográfica** (`usuarios.zonas`/`asistentes.zonas`, array-overlap).
  No existe ningún eje de "organización" en ninguna tabla.
- El patrón RLS dominante — "admin/superadmin ven todo", "coordinador ve por zona (`&&` de
  arrays)", consolidado en `backend/src/db/schema_etapa2i.sql` — es **extensible casi 1:1**
  al patrón de tenant: donde hoy hay `u.zonas && tabla.zonas`, el equivalente sería
  `u.prestadora_id = tabla.prestadora_id`. Buena noticia arquitectónica: hay un molde ya
  probado, no hace falta inventar el patrón de RLS desde cero.
- El caso mono-tenant más **literal y duro** (no solo ausencia de columna, sino constraint
  SQL que lo prohíbe) es `configuracion_empresa` (`backend/src/db/schema_etapa2h.sql`):
  `id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1)`. Esta tabla no puede evolucionar por
  `ALTER TABLE` incremental — tiene que reemplazarse por la entidad `prestadoras`.
- El **riesgo de seguridad mayor** de la migración no es el panel (protegido por RLS con la
  anon key) sino el **backend con Service Role Key** (`backend/src/routes/*.js`), que
  bypassea RLS por diseño. Cada ruta ahí necesita el filtro de `prestadora_id` agregado
  explícitamente en el código — ninguna policy de base lo va a hacer por él.
- `zonas` (geografía) y `prestadora` (tenant) son ejes **ortogonales** — dos prestadoras
  pueden operar en la misma zona, una prestadora puede operar en varias zonas. No mezclar
  ambos conceptos en el modelo de datos ni en RLS.
- Las tablas de mayor exigencia regulatoria (Ley 25.326) para el aislamiento son
  `pacientes` (datos de salud) y `ceses`/`ausencias`/`escalas_legales` (datos laborales) —
  deberían priorizarse primero en cualquier migración incremental.

### 1.1 Tablas de negocio sin columna de organización (todas las creadas hasta hoy)

| Tabla | Creada en | Prioridad de aislamiento |
|---|---|---|
| `usuarios` | `schema_etapa2.sql` | Alta — es la raíz de todo el resto |
| `asistentes` | `schema_etapa2b.sql` | Alta — ya tiene `prestadora_id` **documentado mas no aplicado** en `DATA_MODEL.md` (ver 1.2) |
| `verificaciones_asistente` | `schema_etapa2b.sql` | Media — hereda tenant vía `asistente_id`, no necesita columna propia |
| `ausencias`, `guardias_cobertura` | `schema_etapa2b.sql` | Alta (datos laborales) |
| `ceses` | `schema_etapa2b.sql` | Alta (datos laborales sensibles) |
| `familias`, `pacientes` | `schema_etapa2c.sql` | Alta (`pacientes` = datos de salud, Ley 25.326) |
| `lista_precios`, `prestaciones`, `paquetes_prestaciones`, `paquete_prestacion_items` | `schema_etapa2d.sql` | Media — a decidir si lista de precios es por prestadora o catálogo sugerido compartido |
| `certificados` | `schema_etapa2f.sql` | Media — es además el objeto que necesita branding por tenant (QR, marca visible a la familia) |
| `configuracion_empresa` | `schema_etapa2h.sql` | **Crítica** — `CHECK (id = 1)` bloquea multi-tenant a nivel de constraint |
| `zonas_cobertura`, `configuracion_notificaciones` | `schema_etapa2h.sql` | Media — hoy son globales, ver sección 1.3 |
| `solicitudes`, `postulaciones` | `schema.sql` (Etapa 1) | Baja/media — entrada cruda del sitio público, relevante solo si el sitio se vuelve white-label multi-marca |

Tablas documentadas en `DATA_MODEL.md` pero **aún no creadas** en SQL real (`guardias`,
`reportes`, `alertas`, `validaciones_faciales` — Etapas 3/4): conviene diseñarlas con
`prestadora_id` desde que se creen, no agregarlo después.

**Probablemente deba quedar global/compartida**: `escalas_legales` (valores de LCT/CCT
743/16 argentinos, iguales para cualquier prestadora que opere en Argentina). Si se licencia
a prestadoras de otro país, deja de ser universal — necesitaría un campo de jurisdicción,
no `prestadora_id` (relacionado al punto 6 del prompt de negocio, residencia de datos). **Ese
mismo campo de jurisdicción va de la mano con moneda** (ver 1.8 y 4.2): un valor legal de
otro país está expresado en otra escala numérica y en otra moneda a la vez — no son dos
features independientes, es un único cambio de forma en esta tabla puntual cuando llegue el
caso. Diseño propuesto en 3.7.

### 1.2 Detalle no trivial: `asistentes.prestadora_id` ya existe en la documentación

`docs/DATA_MODEL.md` (sección "Tabla: asistentes") ya tiene:

```sql
prestadora_id UUID REFERENCES prestadoras(id),  -- nullable, soporte futuro modelo B2B
```

con la nota: *"`prestadora_id` es la recomendación de `prestadora-original_Modelo_B2B_v1.md`... La tabla
`prestadoras` no se crea todavía — es un placeholder de FK para el futuro"*. Es decir, el
proyecto ya había anticipado parcialmente esto (probablemente pensado para el caso más
acotado "un Asistente que pertenece a una prestadora tercera dentro del negocio B2B de
prestadora-original", no para el multi-tenancy completo de PLM). **Esta columna documentada nunca se
aplicó contra Supabase real** — no existe en ningún `schema_etapa2*.sql` real. El diseño de
la sección 3 de este documento la reutiliza pero le cambia el sentido: no es "un Asistente
de una prestadora tercera dentro de prestadora-original", es "a qué prestadora licenciataria pertenece
este registro completo".

### 1.3 Zonas vs. prestadora — no colapsar

`zonas_cobertura` (catálogo público de barrios/partidos) y `usuarios.zonas`/`asistentes.zonas`
(asignación operativa de Coordinador) son ejes independientes de `prestadora_id`. Una
prestadora puede operar en una o varias zonas; dos prestadoras pueden compartir zona. El
filtro de Coordinador en el diseño multi-tenant sería compuesto: `prestadora_id` **Y**
`zonas`, nunca uno sustituyendo al otro.

### 1.4 Roles — dónde encaja "administrador de prestadora"

`panel/src/lib/roles.js` hoy solo define `esAdminOSuperior()` y `ROLES_PANEL = ['admin',
'coordinador', 'superadmin']`. El rol es el único eje de autorización — no existe tabla
rol↔organización. Puntos de código que hoy asumen "admin ve todo, literalmente todo" y que
habría que tocar: `backend/src/middleware/requiereRolPanel.js`,
`panelUsuarios.js` (`rolesGestionables()`), `roles.js`, y cada policy `admin_*` de los
`schema_etapa2*.sql`.

**Decisión de diseño que esto obliga a tomar (ver sección 4.1)**: ¿el rol `admin` de hoy
pasa a estar acotado a su propia prestadora, y `superadmin` pasa a ser el único rol
verdaderamente cross-tenant (el de PLM Systems)? Esto es un cambio de semántica del rol
`admin` existente, no solo un rol nuevo — hay que decidirlo antes de tocar código.

### 1.5 Hardcodeos de "prestadora-original como única organización posible" (estructurales, no solo marca)

- `configuracion_empresa.id CHECK (id = 1)` (`schema_etapa2h.sql`) y sus dos consumidores
  (`backend/src/routes/configuracionPublica.js`, `backend/src/routes/panelConfiguracion.js`)
  — el caso más literal, ver 1.1.
- `backend/src/utils/email.js` — un único remitente SMTP global (`SMTP_USER`/`SMTP_PASSWORD`)
  para todos los tenants.
- `configuracion_notificaciones` — destinatarios de alertas operativas son una lista global,
  no por prestadora.
- `sitio-web/src/config/siteConfig.js` — objeto de módulo único (teléfono, email, dominio,
  zona de cobertura), asume una sola marca para todo el sitio público.
- `panel/src/lib/generarDocumentoCese.js` — el documento legal de cese hardcodea "prestadora-original
  Salud" como la razón social empleadora en el template.
- `panel/src/lib/calcularCese.js` — texto de advertencia que asume que la única alternativa
  a "vínculo directo con familia" es "prestadora-original".

**Hardcodeos que son solo texto de marca (prestadora-original seguirá siendo un tenant real llamado
así, no requieren cambio funcional hoy, sí cuando se implemente branding por tenant)**:
`panel/src/components/layout/Layout.jsx` (logo), `panel/src/i18n/translations.js` (~20
menciones de "prestadora-original"/"prestadora-original Salud" en textos de certificado/equipo/facturación),
`backend/src/routes/panelNotificaciones.js` (firma de emails en 3 idiomas).

### 1.6 Módulo de cumplimiento normativo documental — **no existe ninguna huella en el repo hoy**

Búsqueda explícita (`cumplimiento normativo`, `constancia de pago`, `seguro de riesgos del trabajo`,
`ART`, "verificación documental") en `docs/`, `backend/`, `panel/`, `sitio-web/`: **no hay
ninguna referencia a este módulo en ningún schema, PRD, ni comentario del código** — ni
siquiera como placeholder. No es un olvido de este inventario, es una ausencia confirmada:
el prompt de negocio lo describe como pieza no negociable (protege legalmente el modelo de
licenciamiento frente a incumplimientos laborales de terceros), pero hoy no existe nada que
se le parezca a nivel de prestadora.

Lo único remotamente relacionado que existe hoy son tres columnas de vencimiento en
`asistentes` (`backend/src/db/schema_etapa2b.sql:70-72`: `vencimiento_monotributo`,
`vencimiento_art`, `vencimiento_seguro`) y el job `backend/src/utils/vencimientos.js`, que
una vez por día avisa por email a Coordinadores sobre vencimientos próximos de esas tres
fechas. Esto es un caso completamente distinto y no debe confundirse con el módulo pedido:

- Es **por Asistente individual**, no por prestadora — no hay ningún concepto de "empresa
  licenciataria" ahí, solo el vínculo laboral de un trabajador con prestadora-original.
- Es **solo una fecha de vencimiento**, sin registro histórico de verificación — no guarda
  quién verificó el documento, cuándo, ni el documento en sí (no hay `documento_url` ni
  `verificado_por`). No cumple el requisito de "registro con fecha cierta e inmutable de
  cada verificación" que pide el prompt.
- No dispara nada más que un email — no hay estado de "vencido" ni bloqueo de ningún flujo
  cuando vence.

**Conclusión**: el módulo de cumplimiento normativo por prestadora es una pieza **completamente nueva a
diseñar desde cero**, no una tabla existente a extender. Se relaciona con dos entidades ya
relevadas: la futura `prestadoras` (dueña del checklist) y, indirectamente, `asistentes`
(cuyo propio patrón de vencimientos individual — sección de arriba — es un precedente de
diseño útil pero insuficiente, ya que resuelve un problema distinto: cumplimiento de UN
trabajador, no de la prestadora que lo emplea). El diseño de tabla propuesto para esto está
en la sección 3.3 más abajo.

### 1.7 Facturación dual (PLM↔prestadora, prestadora-original↔prestadora) — no existe ningún concepto de "emisor" hoy

Búsqueda explícita de `factura`, `emisor`, `billing`, `licencia` contra todo el repo: la
única aparición de "licencia" en código real es `licencia GCBA` (habilitación sanitaria del
negocio de prestadora-original, no tiene nada que ver con licenciamiento de software) y menciones en
i18n de "Certificado" — **no existe ninguna tabla, columna ni concepto de "quién emite la
factura" en ningún lado**. El sistema asume, igual que con `configuracion_empresa`, que solo
hay una parte que cobra (implícitamente prestadora-original) — el mismo patrón mono-tenant de la sección
1.5, aplicado a facturación.

Relación con lo ya relevado en `lista_precios`/`prestaciones`/`paquetes_prestaciones`
(`backend/src/db/schema_etapa2d.sql`, ver 1.1):

- Estas tres tablas resuelven **cuánto le cobra prestadora-original a una Familia** por la prestación de
  cuidado (precio de lista → precio final con descuento, snapshot al momento de armarse). Es
  un concepto de negocio **totalmente distinto** al que pide el prompt: facturación B2B de
  PLM/prestadora-original hacia una **prestadora**, no de prestadora-original hacia una Familia. No hay ningún
  cruce de datos entre ambos hoy, y no debería haberlo — son dos facturaciones con
  contrapartes distintas (Familia vs. Prestadora).
- Ninguna de las tres tablas tiene columna de moneda ni de emisor (ver 1.8).
- No hace falta modificar estas tablas para resolver el punto 4 del prompt — son
  independientes. Lo que hace falta es **crear tablas nuevas** para la relación
  PLM/prestadora-original↔Prestadora, que no tiene ningún antecedente parcial en el esquema actual (a
  diferencia del cumplimiento normativo, acá ni siquiera hay una pieza parcial como los campos de
  vencimiento de 1.6).

A nivel de inventario (sin diseño completo todavía, eso está en la sección 3.5), lo mínimo
que hace falta:

- Una tabla que registre, por prestadora, **qué esquema de precio tiene contratado** (por
  caso activo, por personal certificado, fee fijo) y con qué monto/moneda — hoy no existe
  ningún lugar donde esto se pudiera guardar, ni siquiera de forma genérica.
- Una tabla de **comprobantes/facturas** con un campo explícito de **empresa emisora**
  (`PLM` | `prestadora-original`) y numeración propia por emisor — hoy no hay ningún concepto de emisor
  en absoluto, todo el sistema asume una sola parte que cobra.

### 1.8 Multi-moneda — confirmado: todos los montos asumen ARS implícito, sin columna de moneda

Revisión de cada tabla con campos de dinero:

| Tabla.columna | Archivo:línea | Moneda explícita? |
|---|---|---|
| `lista_precios.precio` | `schema_etapa2d.sql:16` | No — `NUMERIC(12,2)`, sin columna de moneda |
| `prestaciones.precio_lista_snapshot`, `.valor_descuento`, `.precio_final` | `schema_etapa2d.sql:56,58,59` | No |
| `paquetes_prestaciones.precio_paquete` | `schema_etapa2d.sql:79` | No |
| `asistentes.valor_hora`, `.sueldo_basico` | `schema_etapa2b.sql:67-68` | No |
| `escalas_legales.valor` | `schema_etapa2b.sql:135` | No (columna `unidad` existe — `monto_fijo_mensual`\|`porcentaje`\|`dias`\|`meses`\|`monto_por_hora` — pero describe la **unidad de medida** del valor, no la moneda; coherente con que hoy `escalas_legales` es exclusivamente derecho argentino, ver 1.1) |
| `ceses.monto_total` | `schema_etapa2b.sql` (tabla `ceses`) | No |
| `guardias_cobertura.costo_adicional` | `schema_etapa2b.sql` (tabla `guardias_cobertura`) | No |

**Ningún campo de dinero en todo el schema actual tiene columna de moneda.** Todo el
sistema asume ARS de forma puramente implícita (nunca escrita, ni siquiera como comentario)
en cada uno de estos siete puntos. Esto confirma exactamente lo que pide el punto 5 del
prompt de negocio — no es una omisión menor, es una ausencia total y consistente en todas
las tablas monetarias existentes.

### 1.9 Sistema de creación de cuentas (`backend/src/utils/cuentasPanel.js`)

`crearCuentaConPerfil()` (compartida por `panelCuentas.js` y `panelUsuarios.js`) no recibe
ni acepta ningún parámetro de organización. `borrarCuenta()` tampoco valida organización del
que borra. El vínculo `auth.users` ↔ `usuarios` es 1:1 por `id` — **limitación estructural**:
hoy es imposible que la misma persona (mismo email) tenga cuentas en dos prestadoras
distintas sin duplicar el registro de Auth con otro email. Probablemente no sea un problema
de negocio real (raro que alguien trabaje para dos prestadoras competidoras a la vez), pero
queda señalado.

---

## 2. Plan de migración de datos propuesto (sin perder datos de prestadora-original, sin romper producción)

Migración **incremental y no destructiva**, en el mismo estilo de `schema_etapa2*.sql` ya
usado en el proyecto (una migración por paso, aplicada y verificada contra Supabase real
antes de la siguiente). Orden propuesto:

1. **Crear la tabla `prestadoras`** (diseño completo en sección 3) e insertar una única fila
   para prestadora-original Salud (la prestadora "cero", ya operando). Nada más cambia en este paso —
   es aditivo puro, cero riesgo de romper producción.
2. **Agregar `prestadora_id UUID REFERENCES prestadoras(id)` nullable** a cada tabla listada
   en 1.1 (excepto `verificaciones_asistente`, que hereda vía `asistente_id`, y
   `escalas_legales`, que queda global). Todavía nullable — sigue sin romper nada.
3. **Backfill**: un `UPDATE tabla SET prestadora_id = '<id-prestadora-original>' WHERE prestadora_id IS
   NULL` por cada tabla — un solo script, una sola vez, con las credenciales del archivo de
   claves (nunca en chat), igual que se hizo con `schema_etapa2o.sql`.
4. **Volver la columna `NOT NULL`** una vez confirmado el backfill completo (chequeo simple:
   `SELECT count(*) FROM tabla WHERE prestadora_id IS NULL` debe dar 0 en todas).
5. **Crear las funciones `current_tenant()`/`es_superadmin()`** (detalle y justificación en
   sección 3.6) y **reescribir las policies RLS** existentes usándolas en vez de repetir la
   subquery `EXISTS (SELECT 1 FROM usuarios u WHERE ...)` completa en cada una — empezando
   por `pacientes`/`ceses`/`ausencias` (mayor exigencia regulatoria, ver resumen ejecutivo de
   la sección 1) y siguiendo con el resto de `schema_etapa2i.sql` y los `schema_etapa2*.sql`
   anteriores. Un `schema_etapa2X.sql` por tabla o un solo archivo grande, a discreción de
   cuando se ejecute, pero aplicado y verificado contra Supabase real antes de dar el paso
   por completo (regla ya establecida del proyecto).
6. **Actualizar el backend** (rutas con Service Role Key) para filtrar explícitamente por
   `prestadora_id` en cada query — es el paso de mayor riesgo de seguridad si se omite (ver
   1.1), y no lo cubre ninguna policy de RLS porque el backend bypassea RLS por diseño.
7. **Migrar `configuracion_empresa`** de singleton a una fila de configuración por
   prestadora (ver sección 3.2) — es el único paso que requiere un cambio de forma, no solo
   de columna agregada, porque el `CHECK (id = 1)` actual lo impide estructuralmente.
8. **Reemplazar/parametrizar los hardcodeos de la sección 1.5** — empezar por los
   estructurales (email, documento de cese, config pública), dejar los de marca/branding
   para cuando se implemente el branding por tenant real (no es parte del aislamiento de
   datos, es una feature de valor de producto aparte).

Este orden prioriza primero el aislamiento de los datos más sensibles (paso 2-6 cubre
`pacientes`, `ceses`, `ausencias`) antes de tocar lo cosmético/config (pasos 7-8).

---

## 3. Diseño de la entidad `prestadoras`, cumplimiento normativo documental y roles

### 3.1 Tabla `prestadoras`

```sql
CREATE TYPE estado_prestadora AS ENUM (
  'prospecto', 'en_certificacion', 'certificada', 'suspendida', 'dada_de_baja'
);

CREATE TABLE prestadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social TEXT NOT NULL,
  nombre_fantasia TEXT NOT NULL,        -- marca que ve la familia/paciente final (branding)
  identificacion_fiscal TEXT NOT NULL,  -- CUIT u equivalente según país
  pais TEXT NOT NULL DEFAULT 'AR',      -- ligado a punto 6 del prompt (residencia/jurisdicción)
  estado estado_prestadora NOT NULL DEFAULT 'prospecto',
  zonas_operacion TEXT[],               -- eje independiente de usuarios.zonas (ver 1.3)
  plan_licencia TEXT,                   -- ver 3.4, esquema de facturación contratado
  fecha_alta DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Fila inicial (migración, paso 1 de la sección 2): una prestadora con
`razon_social`/`nombre_fantasia` = "prestadora-original Salud", `estado = 'certificada'`,
`pais = 'AR'`.

### 3.2 Reemplazo de `configuracion_empresa`

En vez de una tabla singleton global, la configuración por-tenant (branding, remitente de
notificaciones, destinatarios de alertas) pasa a ser una tabla `configuracion_prestadora`
con `prestadora_id UNIQUE REFERENCES prestadoras(id)` — una fila por tenant, sin `CHECK
(id=1)`. Los campos hoy en `configuracion_empresa`/`configuracion_notificaciones` se
mudan ahí tal cual, solo cambia la clave de particionado.

### 3.3 Cumplimiento normativo documental por prestadora

Registro **append-only** (nunca se actualiza una fila existente, se inserta una nueva por
cada verificación — para que quede fecha cierta e inmutable, tal como pide el punto 2 del
prompt de negocio):

```sql
CREATE TYPE tipo_cumplimiento_normativo AS ENUM (
  'identificacion_trabajador', 'constancia_pago', 'seguro_riesgos_trabajo'
);
CREATE TYPE estado_cumplimiento_normativo AS ENUM ('pendiente', 'verificado', 'vencido', 'rechazado');

CREATE TABLE cumplimiento_normativo_prestadora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  tipo tipo_cumplimiento_normativo NOT NULL,
  estado estado_cumplimiento_normativo NOT NULL DEFAULT 'pendiente',
  documento_url TEXT,
  vigencia_desde DATE,
  vigencia_hasta DATE,           -- dispara alerta de vencimiento antes de esta fecha
  verificado_por UUID REFERENCES usuarios(id),
  verificado_en TIMESTAMPTZ,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cumplimiento_normativo_prestadora ON cumplimiento_normativo_prestadora (prestadora_id, tipo, vigencia_hasta);
```

El "estado de cumplimiento normativo vigente" de una prestadora para un tipo de documento se calcula
como la fila más reciente de ese `tipo` con `vigencia_hasta` no vencida — nunca se
sobreescribe una fila vieja (protege la trazabilidad legal que sostiene el modelo de
negocio, según el propio prompt).

### 3.4 Roles nuevos y puntos exactos de código a tocar

**Modelo de 3 niveles (diseñado 2026-07-13, reemplaza la versión anterior de este punto que
conflacionaba `superadmin` = "PLM cross-tenant sin límites" — ver nota de reemplazo abajo):**

- **`admin_prestadora`** (nuevo valor del `CHECK` de `usuarios.rol`, o revisión del rol
  `admin` existente — ver decisión abierta 4.1): acceso de gestión a los datos de su propia
  `prestadora_id` únicamente — su personal, sus pacientes/casos, sus reportes y alertas.
  Cero visibilidad de otras prestadoras.
- **`superadmin`**: rol **técnico** (código/infra/base de datos), sin carácter
  administrativo de negocio. Acceso de Panel **únicamente** a una prestadora de prueba fija
  (sandbox, no un cliente real) — sirve para ver y probar cambios en un entorno controlado.
  **Vedado el acceso, por cualquier vía del Panel, a cualquier prestadora real** — ninguna
  tarea técnica lo justifica; el trabajo de infraestructura/DB se hace por fuera del Panel,
  con herramientas propias del rol técnico, no impersonando un tenant vía UI. No es
  cross-tenant: no ve datos de ninguna prestadora real, ni siquiera en modo lectura.
- **`admin_plataforma`** (rol nuevo, reemplaza lo que este documento llamaba antes
  "`superadmin` = PLM Systems"): administrativo de negocio real — control comercial/
  administrativo de toda la plataforma (todas las prestadoras licenciatarias). Nombre
  elegido deliberadamente **desacoplado de la razón social de la empresa dueña del software**
  (no `admin_plm`, no ligado a "PLM Systems") para que un cambio societario futuro no deje
  resabios de nombre en código/RLS/policies — coherente con la convención ya usada en el
  proyecto de decir "la plataforma", nunca el nombre propio de la empresa licenciante (ver
  `CLAUDE.md`, glosario, fila `Prestadora`). Puede entrar a una prestadora real **una a la
  vez**, nunca varias simultáneamente, bajo el modo "dentro de una prestadora" descripto en
  3.4.1 — mientras está adentro, cero visibilidad de cualquier otra prestadora.
- **`financiador`** (obra social/prepaga): contemplado en el diseño (nombre de rol, alcance
  de solo lectura agregada), **no implementado** — tal como pide el punto 3 del prompt de
  negocio.

**Nota de reemplazo:** la versión anterior de este documento (hasta 2026-07-13) describía
`superadmin` como "el rol de PLM Systems... cross-tenant real, ve todas las prestadoras".
Se descarta ese diseño: conflacionaba en un solo rol el acceso técnico (infra/código) con el
acceso administrativo de negocio (comercial, todas las prestadoras), lo cual no tenía
justificación técnica real para el primero y no tenía ningún límite de sesión/alcance para
el segundo. `docs/SECURITY.md` tenía la misma descripción y se corrige en el mismo barrido.

#### 3.4.1 — Modo "dentro de una prestadora" (exclusivo de `admin_plataforma`)

Mecanismo técnico pendiente de implementar (diseño aprobado, código todavía no escrito):
`current_tenant()` hoy (`schema_multitenant_02.sql:32-35`) devuelve un `prestadora_id` fijo
leído de la propia fila de `usuarios` — no sirve para `admin_plataforma`, que no tiene una
prestadora propia y necesita elegir cuál mirar en cada sesión. Requiere un contexto de
tenant **dinámico y acotado en el tiempo**, no un simple bypass de RLS como el `es_superadmin()`
actual:

- Al "entrar" a una prestadora, se crea un registro de sesión (tabla nueva, ej.
  `sesiones_tenant_admin_plataforma`: `admin_id`, `prestadora_id`, `entrada_at`,
  `expira_at`) — mientras exista una fila vigente (no expirada) para ese `admin_id`,
  `current_tenant()` devuelve ese `prestadora_id` en vez de bypass total; sin sesión activa,
  `admin_plataforma` no ve ninguna prestadora (tiene que elegir una primero).
- `es_superadmin()` deja de ser un bypass total: pasa a comprobar que el `prestadora_id` de
  la fila sea el de la prestadora de prueba fija (sandbox), nunca un OR incondicional como
  hoy (`schema_multitenant_02.sql:39-44`) — este cambio de RLS es trabajo de código
  pendiente, no incluido en este documento de diseño.
- **Wrapper de seguridad/UX mientras `admin_plataforma` está "dentro" de una prestadora**
  (acordado 2026-07-13, con el Desarrollador, tras 4 rondas de refinamiento):
  - Indicador visual permanente y muy notorio (banner) distinto al resto del Panel,
    imposible de confundir con el uso normal.
  - La advertencia de "en qué prestadora estás" se agrega a las confirmaciones de acciones
    destructivas ya existentes (Regla 4 de `CLAUDE.md`), no en cada acción — evita fatiga de
    alertas sin perder la advertencia donde más importa.
  - Log de auditoría inmutable: no solo entrada/salida del modo prestadora, sino toda acción
    sensible realizada por `admin_plataforma` o `superadmin` — quién, cuándo, IP, qué hizo.
  - **Timeout doble, calibrado como apps bancarias** (a pedido explícito del Desarrollador,
    más corto que un timeout administrativo genérico):
    - **5 minutos de inactividad** → sale del modo prestadora automáticamente y sin aviso
      previo (no es un logout de la cuenta, solo sale del contexto de tenant).
    - **Tope absoluto de 60 minutos** desde la entrada, con **aviso a los 50 minutos si
      sigue activo**, para no cortar ninguna tarea a la mitad — a los 60 minutos se corta
      salvo que reconfirme que necesita seguir adentro.
- Buenas prácticas de identificación para ambos roles (`superadmin` y `admin_plataforma`),
  acordadas 2026-07-13:
  - Cuentas nominales, nunca genéricas ni compartidas entre personas — el rol es un nivel de
    permiso, no una identidad; cada persona real tiene su propia cuenta.
  - MFA (TOTP) en el login de ambos roles (radio de impacto máximo: toda la plataforma).
    **Revisado 2026-07-15** (ver `CLAUDE.md`, nota junto al glosario de Superadmin/
    Admin_plataforma): decisión original de "obligatorio sin excepción" pisada por el
    Desarrollador — pasa a ser configurable on/off, manejado únicamente por el superadmin,
    para no sumar fricción mientras el sistema se pule y los usuarios se acostumbran.
  - El log de auditoría de 3.4.1 cubre todo login y toda acción sensible de estos dos roles,
    no solo la entrada/salida de prestadora.

**Extensibilidad futura (señalada, no diseñada todavía):** el Desarrollador anticipó roles
adicionales más acotados (coordinador de plataforma, ventas, personal, etc.), "donde se
configuren los roles se verá" — esto sugiere que en algún momento `usuarios.rol` deja de ser
un `CHECK` fijo (lista cerrada de strings) y pasa a una tabla de roles/permisos configurable.
Es un cambio de arquitectura mayor, fuera de alcance de este documento — no mezclar con la
implementación de `superadmin`/`admin_plataforma` de arriba.

Puntos de código concretos que hay que tocar si se ejecuta la opción (a) de 4.1
(`admin` → `admin_prestadora`) **más** el cambio de alcance de `superadmin` y el alta de
`admin_plataforma` descriptos arriba en 3.4/3.4.1 — todo pendiente de implementación, no
hecho todavía:

- `panel/src/lib/roles.js:8` — `ROLES_PANEL = ['admin', 'coordinador', 'superadmin']` pasa a
  `['admin_prestadora', 'coordinador', 'superadmin', 'admin_plataforma']`, con
  `superadmin` restringido en el propio Panel a la prestadora de prueba (no solo un cambio
  de string — necesita la lógica de 3.4.1 para saber en qué prestadora está parado cada
  rol). `esAdminOSuperior()` (línea 4-6) hay que revisarla: ya no alcanza con "es admin o
  superior", hay que distinguir explícitamente `admin_plataforma` (cross-tenant acotado por
  sesión) de `admin_prestadora`/`coordinador` (acotados a su propia prestadora fija).
- `backend/src/middleware/requiereRolPanel.js:22` — el `.includes(perfil.rol)` contra
  `['admin', 'coordinador', 'superadmin']` es la puerta de entrada de **todas** las rutas de
  panel; se actualiza ahí (agregando `admin_prestadora` y `admin_plataforma`) y en ningún
  otro lado (es el único punto de verdad de "¿este rol puede entrar al panel?").
- `backend/src/routes/panelUsuarios.js:12` (`requiereAdminOSuperior`) y `:19-21`
  (`rolesGestionables()`): hoy `rolesGestionables('superadmin')` devuelve
  `['admin', 'coordinador', 'superadmin']` y cualquier otro rol devuelve solo `['coordinador']`
  — con el modelo nuevo, `admin_plataforma` (no `superadmin`) es quien gestiona
  `admin_prestadora` de cualquier prestadora; `superadmin` no gestiona cuentas de negocio de
  ninguna prestadora real. Esta función es también donde se agregaría, el día que exista, la
  restricción cross-tenant explícita (un `admin_prestadora` no puede editar usuarios de otra
  `prestadora_id`, algo que hoy no aplica porque no hay más de una organización).
- Cada policy `admin_*`/`EXISTS (... u.rol IN ('admin', 'superadmin') ...)` en
  `schema_etapa2i.sql` y el resto de los `schema_etapa2*.sql` — mismo cambio de string, más
  el reemplazo del bypass total de `es_superadmin()` por la lógica acotada de 3.4.1, pero
  ver 3.6 antes de tocarlas una por una.

Sobre la opción (b) de 4.1 (no renombrar, solo agregar `admin_prestadora` como sinónimo de
negocio): en ese caso ninguno de los puntos de arriba requiere cambio de string, pero
tampoco resuelve el problema real — `admin` seguiría leyéndose en código como "ve todo,
sin acotar", que es exactamente lo que hay que dejar de asumir. Por eso la recomendación de
4.1 sigue siendo (a), pese al costo de tocar estos puntos.

### 3.5 Facturación — diseño de tablas (para discutir el nivel de detalle antes de implementar)

```sql
CREATE TYPE esquema_facturacion AS ENUM ('por_caso', 'por_personal', 'fee_fijo');
CREATE TYPE empresa_emisora AS ENUM ('PLM', 'prestadora-original');

CREATE TABLE planes_facturacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  esquema esquema_facturacion NOT NULL,
  monto NUMERIC(14,2) NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',   -- ISO 4217, nunca asumir ARS implícito (punto 5 del prompt)
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  empresa_emisora empresa_emisora NOT NULL,  -- separa numeración/comprobantes PLM vs prestadora-original
  numero_comprobante TEXT NOT NULL,          -- secuencia propia por empresa_emisora
  periodo_desde DATE NOT NULL,
  periodo_hasta DATE NOT NULL,
  monto NUMERIC(14,2) NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  tipo_cambio_referencia NUMERIC(12,4),      -- solo trazabilidad, no conversión automática (punto 5)
  fecha_emision DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',  -- pendiente | pagada | vencida | anulada
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_factura_numero_por_emisor ON facturas (empresa_emisora, numero_comprobante);
```

Este es el nivel de detalle de diagrama que pide el punto 3 del prompt — falta definir con
el usuario (antes de implementar) el formato exacto de numeración fiscal de cada empresa
emisora (depende de la situación de facturación electrónica de cada una en AFIP, que es un
tema legal/contable, no técnico).

**Nota pendiente (2026-07-11, sin diseñar):** el Desarrollador propuso que el costo real de
infraestructura compartida (Supabase/Vercel/Railway/backup — un solo proyecto/deploy/bucket
para todas las prestadoras, ver `docs/Prompt_Claude_Code_PLM_Multitenant.md:66`) se mida por
licencia y se refleje en el precio de cada una, en vez de fijar el mismo fee para todas
independientemente de su volumen de uso. Hoy `esquema_facturacion` solo contempla
`'por_caso' | 'por_personal' | 'fee_fijo'` — ninguno de los tres mide uso de infraestructura
en sí (storage por `prestadora_id`, filas, requests). Queda abierto para cuando se aborde
este bloque: (a) si conviene agregar un cuarto esquema `'por_uso_infraestructura'` con
métricas propias a instrumentar, o (b) si alcanza con estimar tramos fijos por volumen
esperado (chica/mediana/grande) sin medición real — evaluado con el Desarrollador el
2026-07-11, sin resolver todavía. Ver también `docs/PENDIENTES.md`.

**Decisión (2026-07-11): toda cuenta/infraestructura nueva se abre a nombre de prestadora-original,
no de PLM Systems, hasta que se ejecute la migración multi-tenant.** Surgió al decidir a
nombre de quién crear las cuentas nuevas de Cloudflare R2 y Backblaze B2 (pendiente #4 de
`docs/PENDIENTES.md`). Fundamento: hoy toda la infraestructura existente (Supabase,
Railway, Vercel — ver `No hacer commit/claves y contraseñas.txt`) ya está a nombre de
prestadora-original; abrir cuentas nuevas a nombre de PLM Systems mientras el resto sigue en prestadora-original
crearía una migración parcial no planificada — infraestructura repartida entre dos
titulares sin que exista todavía el inventario/plan que `docs/Prompt_Claude_Code_PLM_Multitenant.md`
exige como paso previo a tocar cualquier cosa de la migración real (ver también la sección
"Sobre `docs/Prompt_Claude_Code_PLM_Multitenant.md`" de `CLAUDE.md`). Manteniendo un solo
titular hasta ese momento, el día de la migración es "mover N cuentas de prestadora-original a PLM
Systems" de forma pareja, en vez de tener que reconciliar cuentas sueltas que quedaron
repartidas. Esta decisión aplica a **toda** cuenta/credencial nueva que se cree de acá en
adelante, no solo a R2/B2 — se revierte únicamente cuando arranque formalmente la
migración a PLM Systems como titular de la infraestructura.

### 3.6 RLS: centralizar el chequeo de tenant en una función, no repetir la subquery

`schema_etapa2i.sql` (ver ejemplo real arriba) ya muestra el problema: **cada** policy repite
`EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN (...))` completo —
son 3 tablas con 2-3 policies cada una solo en ese archivo, y el patrón se repite en todos
los `schema_etapa2*.sql` restantes. Agregar `prestadora_id` multiplicaría esa subquery (una
condición más) en cada una de esas ~25 policies existentes, y en cada policy nueva de las
tablas de la sección 3 (`cumplimiento_normativo_prestadora`, `planes_facturacion`, `facturas`,
`configuracion_prestadora`).

**Decisión: centralizar en una función SQL `current_tenant()`**, en vez de seguir
multiplicando la subquery inline:

```sql
CREATE OR REPLACE FUNCTION current_tenant() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT prestadora_id FROM usuarios WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION es_superadmin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'superadmin')
$$;
```

Con esto, cada policy nueva o reescrita queda:

```sql
CREATE POLICY "admin_prestadora_lee_asistentes" ON asistentes
  FOR SELECT USING (es_superadmin() OR asistentes.prestadora_id = current_tenant());
```

en vez de repetir el `EXISTS (SELECT 1 FROM usuarios u WHERE ...)` completo. Razones:

- **Un solo lugar para cambiar semántica de tenant** — si mañana la decisión 4.1 cambia
  cómo se calcula "el tenant del usuario actual" (por ejemplo, si un `admin_prestadora`
  pudiera algún día tener acceso a más de una prestadora), se edita una función, no ~25+
  policies repartidas en 10+ archivos `schema_etapa2*.sql`.
- **Menos superficie de error de copy-paste** — la subquery inline ya se repite hoy
  textualmente en cada policy de `schema_etapa2i.sql`; agregar una condición más de tenant a
  mano en cada una es exactamente el tipo de trabajo mecánico donde se desliza un error (una
  policy que se olvida el filtro, por ejemplo).
- **`STABLE` (no `VOLATILE`)** permite que Postgres cachee el resultado dentro de la misma
  consulta en vez de re-ejecutar la subquery por cada fila evaluada — mismo comportamiento
  que ya tienen las subqueries inline actuales, sin penalidad de performance nueva.
- Costo: dos funciones más para mantener, y quien lea una policy aislada ya no ve inline
  qué hace `current_tenant()` — mitigado con el comentario de cabecera que ya usa el
  proyecto en cada archivo `schema_etapa2*.sql` (ver estilo de `schema_etapa2i.sql:1-11`).

Aplica a: todas las policies reescritas en el paso 5 de la sección 2, y a las tablas nuevas
de 3.1-3.5. Las policies de `coordinador` (`u.zonas && tabla.zonas`) se mantienen como
subquery inline aparte — son un eje ortogonal a tenant (ver 1.3), no tiene sentido
fusionarlas en la misma función.

### 3.7 `escalas_legales`: jurisdicción y moneda como un mismo cambio

Hoy `escalas_legales.valor NUMERIC(14,4)` (`schema_etapa2b.sql:135`) no tiene columna de
moneda (confirmado en 1.8) y tampoco tiene columna de jurisdicción (señalado en 1.1/4.2).
Como se corresponden — un valor legal de otro país está en otra escala y en otra moneda a la
vez — se resuelven con el mismo par de columnas, el día que haga falta (no ahora, ver 4.2):

```sql
ALTER TABLE escalas_legales
  ADD COLUMN jurisdiccion TEXT NOT NULL DEFAULT 'AR',  -- ISO 3166-1 alpha-2
  ADD COLUMN moneda TEXT NOT NULL DEFAULT 'ARS';       -- ISO 4217
```

`DEFAULT 'AR'`/`DEFAULT 'ARS'` hace este `ALTER TABLE` aditivo puro sobre las filas
existentes (todas argentinas hoy) — no requiere backfill manual ni rompe las lecturas
actuales del motor de cálculo de indemnizaciones (`docs/PRD_02B_Gestion_Personal.md`), que
seguiría consultando por `tipo`/`categoria`/`vigencia` igual que hoy y simplemente ignoraría
las columnas nuevas hasta que exista una segunda jurisdicción real. Este cambio queda fuera
del plan de 8 pasos de la sección 2 (que es sobre `prestadora_id`, no sobre esta tabla) —
se ejecuta el día que el punto 6 del prompt de negocio (residencia/jurisdicción) deje de ser
solo una bandera y se convierta en un cliente real fuera de Argentina.

### 3.8 Moneda en los campos monetarios restantes (fuera de `escalas_legales` y facturación nueva)

3.5 y 3.7 ya resuelven moneda para las tablas nuevas de facturación y para `escalas_legales`.
Quedan los otros seis puntos de la tabla de 1.8 (`lista_precios`, `prestaciones`,
`paquetes_prestaciones`, `asistentes`, `ceses`, `guardias_cobertura`) — mismo patrón aditivo,
mismo criterio que 3.7: columna `TEXT DEFAULT 'ARS'`, sin backfill manual, sin romper
lecturas actuales.

```sql
ALTER TABLE lista_precios
  ADD COLUMN moneda TEXT NOT NULL DEFAULT 'ARS';   -- schema_etapa2d.sql:16

ALTER TABLE prestaciones
  ADD COLUMN moneda TEXT NOT NULL DEFAULT 'ARS';   -- cubre precio_lista_snapshot/valor_descuento/precio_final,
                                                     -- schema_etapa2d.sql:56,58,59 — una sola columna de moneda
                                                     -- por fila, no una por cada campo de precio: los tres montos
                                                     -- de una misma fila de "prestaciones" son siempre la misma
                                                     -- operación, nunca mezclan moneda entre sí.

ALTER TABLE paquetes_prestaciones
  ADD COLUMN moneda TEXT NOT NULL DEFAULT 'ARS';   -- schema_etapa2d.sql:79

ALTER TABLE asistentes
  ADD COLUMN moneda TEXT NOT NULL DEFAULT 'ARS';   -- cubre valor_hora + sueldo_basico, schema_etapa2b.sql:67-68 —
                                                     -- mismo criterio: un Asistente cobra en una sola moneda

ALTER TABLE ceses
  ADD COLUMN moneda TEXT NOT NULL DEFAULT 'ARS';   -- monto_total, schema_etapa2b.sql

ALTER TABLE guardias_cobertura
  ADD COLUMN moneda TEXT NOT NULL DEFAULT 'ARS';   -- costo_adicional, schema_etapa2b.sql
```

Igual que en 3.7, este `ALTER TABLE` es aditivo puro y **no** forma parte del plan de 8 pasos
de la sección 2 (que resuelve `prestadora_id`, no moneda) — se ejecuta en el mismo momento en
que se materialice el primer caso real de un tenant que no factura en ARS, no antes. Hasta
entonces el `DEFAULT 'ARS'` deja el comportamiento actual exactamente igual para prestadora-original.

---

## 4. Puntos donde el diseño actual complica esto — para discutir antes de escribir código

### 4.1 Cambio de semántica del rol `admin` existente — **RESUELTA (opción a), 2026-07-09**

Hoy `admin` = "ve todo el negocio de prestadora-original". En el diseño multi-tenant, ese mismo alcance
("ve todo dentro de su organización") pasa a llamarse `admin_prestadora`, y `admin` a secas
dejaría de tener sentido como nombre (¿admin de qué?). Dos caminos evaluados:

- **(a)** Renombrar el rol existente `admin` → `admin_prestadora` en una migración de datos
  (`UPDATE usuarios SET rol = 'admin_prestadora' WHERE rol = 'admin'`), y reservar
  `superadmin` para PLM Systems cross-tenant.
- **(b)** Mantener `admin` como está (implícitamente escopeado a la prestadora vía RLS) y
  agregar `admin_prestadora` como alias/sinónimo solo para nomenclatura de negocio.

**Decisión (2026-07-09, kickoff de implementación `docs/Reserva Historica/Prompt_Claude_Code_Kickoff_Implementacion.md`):
opción (a).** Motivo: alinea con práctica estándar de la industria en RBAC multi-tenant — un
rol sin contexto de tenant en el nombre (`admin` a secas) es, según múltiples guías de
arquitectura de autorización (WorkOS, Auth0, AWS Prescriptive Guidance), el patrón que más
frecuentemente deriva en bugs de seguridad por chequeos que asumen roles globales. Además,
hacerlo ahora — con un solo tenant real y pocos usuarios — es muchísimo más barato que
hacerlo con varias prestadoras ya operando.

**Momento de ejecución (ajustado 2026-07-09, durante el Bloque 1): la decisión no cambia,
mueve de bloque.** Al ejecutar el Bloque 1 se detectó que ~60 policies RLS en
`schema_etapa2.sql`–`schema_etapa2i.sql` comparan literalmente `rol = 'admin'` o
`rol IN ('admin', ...)`. Correr el `UPDATE usuarios SET rol = 'admin_prestadora'` sin
reescribir esas policies a la vez deja a todo Admin sin acceso de inmediato — ninguna policy
reconoce el valor nuevo. Reescribir las 60 policies solo para el rename (mecánico, sin
`current_tenant()`/`es_superadmin()` todavía) significaría tocarlas dos veces: una ahora y
otra en el Bloque 2 para meterles la lógica de tenant real. Se decidió (con el usuario, mismo
día) hacer el corte completo —rename de dato + reescritura de policies con
`current_tenant()`/`es_superadmin()`— junto, en el Bloque 2. Lo ya aplicado en el Bloque 1: el
glosario de `CLAUDE.md` tiene la entrada `admin_prestadora`, y el código de autorización
(`panel/src/lib/roles.js`, `backend/src/middleware/requiereRolPanel.js`,
`backend/src/routes/panelUsuarios.js`, puntos exactos de 3.4) ya acepta `admin_prestadora`
como valor válido en paralelo a `admin` — pero la columna `usuarios.rol` sigue sin ninguna
fila con ese valor hasta el Bloque 2.

**Bloque 2 completo (2026-07-09/10)** — `backend/src/db/schema_multitenant_02.sql`, aplicado y
verificado contra Supabase real: creadas `current_tenant()`/`es_superadmin()`; CHECK de
`usuarios.rol` reescrito en dos pasos (ensanchado a aceptar ambos valores, corrida la
`UPDATE`, angostado al final solo a `admin_prestadora`); las 28 policies vigentes que
comparaban `rol = 'admin'` (relevadas contra las 20 tablas con RLS activa hoy, tomando la
versión vigente de cada una tras rastrear todos los `DROP`/`CREATE` posteriores)
reescritas con `es_superadmin()`/`current_tenant()`, agregando el filtro de tenant a las
tablas que ya tienen `prestadora_id` (Bloque 1) y dejando sin ese filtro —solo con el rol
renombrado— a las que todavía no lo tienen (`configuracion_empresa`,
`configuracion_notificaciones`, y `escalas_legales` por diseño 3.7). Código de aplicación
también cortado por completo (ya no acepta `'admin'` en paralelo): `panel/src/lib/roles.js`,
`backend/src/middleware/requiereRolPanel.js`, `backend/src/routes/panelUsuarios.js`,
`backend/src/routes/panelCuentas.js`, `panel/src/components/layout/ProtectedRoute.jsx`,
`panel/src/pages/UsuariosPanel.jsx` (este último tenía un `<option value="admin">` vivo en
el formulario de alta de usuarios del panel — se hubiera roto en el primer alta de un nuevo
Admin tras esta migración si no se corregía).

**Bug real encontrado y corregido al escribir este Bloque, no parte del diseño de RLS**: el
`NOT NULL` que el Bloque 1 agregó a `prestadora_id` en 15 tablas rompía cualquier alta nueva
(cuenta, familia, paciente, ausencia, guardia, certificado, cese, precio, prestación, zona,
solicitud, postulación) porque ningún insert de hoy —ni backend con Service Role Key ni
panel con anon key— setea esa columna. Se verificó contra Supabase real, no se detectó en el
cierre del Bloque 1 porque esa verificación solo chequeó filas existentes (backfill), no
inserts nuevos hacia adelante. Parche aplicado en el mismo `schema_multitenant_02.sql`: `DEFAULT`
al UUID de prestadora-original en las 15 columnas — mismo mecanismo que ya usó el backfill del Bloque 1,
a nivel de schema, no hardcodeado en código de aplicación.

**Criterio de cierre exacto del Bloque 3 para este `DEFAULT` (precisado por el usuario,
2026-07-10 — no basta con "documentarlo como temporal" en general)**: el Bloque 3 no se da
por cerrado hasta que se cumplan, en este orden, **ambas** condiciones:

1. Se **elimina** el `DEFAULT` de las 15 columnas (`ALTER TABLE ... ALTER COLUMN
   prestadora_id DROP DEFAULT`), una vez que cada ruta de alta del backend (Service Role
   Key) y del panel resuelve y setea explícitamente el `prestadora_id` real de quien hace
   el alta en cada request.
2. Se **prueba con un insert real** — sin pasar `prestadora_id` explícito — contra
   Supabase real, y se confirma que ese insert **vuelve a fallar** (viola el `NOT NULL`
   sin el `DEFAULT` que lo enmascaraba). Si el insert sin `prestadora_id` explícito
   todavía tiene éxito después de "cerrar" el Bloque 3, el parche temporal sigue vigente
   en los hechos aunque el código ya intente setear el valor, y el bloque no está cerrado.

No alcanza con que el código nuevo *intente* setear `prestadora_id` mientras el `DEFAULT`
de schema siga presente — ese `DEFAULT` seguiría enmascarando cualquier ruta que se
hubiera olvidado. El cierre depende de la ausencia del `DEFAULT` verificada con el insert
que falla, no de una revisión de código por sí sola.

**Cierre parcial ejecutado (decisión explícita del usuario, 2026-07-10) — 7 de 15
columnas, no las 15**: al llegar el momento de aplicar el `DROP DEFAULT`, se confirmó por
grep que 8 de las 15 tablas (`ausencias`, `guardias_cobertura`, `ceses`, `lista_precios`,
`prestaciones`, `paquetes_prestaciones`, `paquete_prestacion_items`, `certificados`) se
insertan **solo** desde `panel/src` con la anon key, y ningún componente del panel setea
`prestadora_id` hoy — dependen enteramente del `DEFAULT` para no violar el `NOT NULL`.
Aplicar el `DROP DEFAULT` a las 15 de una hubiera roto el alta real de esas 8 tablas en
producción. Se optó por un cierre parcial en dos tiempos en lugar de forzar un arreglo
apurado de los 5 componentes de panel involucrados en la misma sesión:

- **Cerradas ahora (`DROP DEFAULT` aplicado y verificado con insert real que vuelve a
  fallar por `NOT NULL`)**: `usuarios`, `asistentes`, `familias`, `pacientes`,
  `zonas_cobertura`, `solicitudes`, `postulaciones` — las 7 cuyas rutas de alta (backend
  con Service Role Key, más las dos rutas públicas con el UUID hardcodeado de
  `tenantTemporal.js`) ya fueron corregidas en este Bloque 3.
- **Quedan con el `DEFAULT` vigente, a propósito, sin fecha de cierre indefinida**:
  `ausencias`, `guardias_cobertura`, `ceses`, `lista_precios`, `prestaciones`,
  `paquetes_prestaciones`, `paquete_prestacion_items`, `certificados`. Razón real, no solo
  cautelar: `panel/src/context/AuthContext.jsx` no expone hoy el `prestadora_id` del
  usuario del panel logueado — no hay de dónde sacar el valor en los 5 componentes que
  insertan directo en estas tablas. Riesgo real solo se activa el día que exista una
  segunda prestadora usando el panel (hoy hay una sola, prestadora-original, así que el `DEFAULT`
  apunta al único valor válido posible).

**Trabajo pendiente con nombre propio: "Panel — tenant en inserts directos"** — debe
ejecutarse **antes de que arranque el Bloque 4** (branding), no queda indefinido. Alcance
en 3 pasos:
1. Extender `panel/src/context/AuthContext.jsx` para exponer el `prestadora_id` del
   usuario de panel logueado (hoy solo expone `id`/`rol`).
2. Setearlo explícitamente en los 5 puntos de insert directo identificados:
   `AusenciasCoberturaTab.jsx`, `VinculoCeseTab.jsx`, `ListaPrecioDetalle.jsx`,
   `PrestacionesPaciente.jsx`, `CertificadoTab.jsx`.
3. Recién entonces, `DROP DEFAULT` en las 8 columnas restantes, con el mismo criterio de
   cierre de arriba (insert real sin `prestadora_id` explícito debe volver a fallar).

Antes de arrancar este ítem, avisar al usuario para el mismo tratamiento de inventario
completo antes de secuenciar que se usó en todo el Bloque 3 (no asumir dónde están los 5
puntos de insert sin re-confirmar contra el código real al momento de empezar).

**Segunda vuelta de confirmación explícita, Bloque 3 (2026-07-10)** — el usuario pidió, antes
de dar el bloque por cerrado, confirmación archivo:línea (no la asunción de "ya que se tocó
el archivo, seguro se cubrió todo") de 6 operaciones de lectura/edición/borrado por id que se
habían marcado como prioridad máxima (mismo nivel que `panelUsuarios.js`, por ser
explotables hoy con una sesión real, no solo dormidas). Resultado:
- `panelCuentas.js` SELECT de `solicitudes` (línea ~23) y de `postulaciones` (línea ~100):
  confirmado con filtro de tenant explícito.
- Los UPDATE por id de `solicitudes`/`postulaciones` inmediatamente después (mismas rutas):
  confirmado seguro por construcción — reusan el mismo id ya validado contra tenant por el
  SELECT anterior en el mismo request, no llevan filtro propio pero no los necesitan.
- `backend/src/utils/cuentasPanel.js:39` (`borrarCuenta`) — **hueco real encontrado**: la
  función borraba por `id` sin ninguna verificación de tenant propia. Segura hoy solo por
  disciplina de los 3 llamadores existentes (2 en `panelCuentas.js` borran un id recién
  creado en el mismo request; 1 en `panelUsuarios.js` ya validaba tenant en el SELECT previo
  a llamarla) — mismo patrón de hueco dormiente en función compartida que tenía
  `panelUsuarios.js` antes de este bloque. **Corregido**: `borrarCuenta` ahora exige
  `{ prestadoraId, esSuperadmin }` y verifica el `prestadora_id` del target antes de borrar;
  los 3 llamadores actualizados. Verificado con tenant fabricado real: `DELETE` cross-tenant
  ahora responde `400` y el usuario fabricado no se borra.
- Chequeos de aislamiento cross-tenant (DELETE de usuarios, alta de familia/asistente contra
  solicitud/postulación de otra prestadora) agregados de forma permanente y automatizada a
  `backend/scripts/verificacion/bloque3_verificacion.mjs` — fabrica una segunda prestadora +
  fila real de usuario/solicitud/postulación, prueba los 3 puntos, limpia todo. Corrido y
  confirmado: los 6 chequeos (3 de lectura simple + 3 de aislamiento cross-tenant) pasan.

**Auditoría adversarial de Bloques 1 y 2 (2026-07-10)** — antes de autorizar el Bloque 3 se
revisaron, con pruebas de comportamiento real contra Supabase (no solo lectura de código),
las 35 policies vigentes en `public`, clasificadas por patrón (comparación directa de
`prestadora_id`, join vía `asistentes` para `verificaciones_asistente`, sin filtro por
diseño para `escalas_legales`/`configuracion_empresa`/`configuracion_notificaciones`,
auto-fila para `usuarios`/`familias`). Se probó con insert real, login real y limpieza
completa tanto el patrón directo (`pacientes`) como el patrón join (`verificaciones_asistente`,
fabricando un Asistente con cuenta Auth real). No se encontró ningún UUID de prestadora-original
hardcodeado fuera de lo ya documentado (backfill + `DEFAULT`), ni ninguna policy vigente con
literal `rol = 'admin'` huérfano.

Dos hallazgos, ya corregidos y verificados en producción real:

1. **`zonas_cobertura.publico_lee_zonas_activas`** — policy de lectura pública preexistente
   (de `schema_etapa2h.sql`, previa al Bloque 1) sin ningún filtro de tenant ni de rol
   (`USING (activa = true)`, sin `auth.uid()`). Quedó fuera del barrido del Bloque 2 porque
   nunca comparó `rol = 'admin'`. No tenía explotación real hoy (ni `sitio-web` ni `panel`
   consultan esta tabla con la anon key — ambos pasan por el backend), pero en cuanto exista
   una segunda prestadora, cualquier código futuro que consultara `zonas_cobertura` con la
   anon key vería zonas de todas las prestadoras. **Corregido**: `DROP POLICY
   "publico_lee_zonas_activas" ON zonas_cobertura` (no se le agregó `current_tenant()`
   porque un visitante anónimo no tiene `auth.uid()` — eso hubiera roto la lectura pública
   en vez de acotarla). Verificado contra Supabase real: lectura anónima ahora devuelve 0
   filas; el endpoint público (`configuracionPublica.js`, vía Service Role Key) sigue
   devolviendo las 7 zonas activas sin cambios.
2. **`backend/src/routes/panelConfiguracion.js:10`** — la función local
   `requiereAdminOSuperior` seguía comparando `rol` contra el literal `'admin'` (no
   `'admin_prestadora'`), el único punto de la capa de aplicación con este defecto
   (`requiereRolPanel.js`, `panelCuentas.js` y `panelUsuarios.js` ya usaban el valor
   correcto). Efecto real: no era fuga de tenant sino bloqueo de acceso legítimo — cualquier
   `admin_prestadora` real recibía 403 al intentar editar Configuración (precios, zonas,
   notificaciones). **Corregido** y verificado con login real + request HTTP real contra el
   backend: `GET /api/panel/configuracion/empresa` pasa de comportamiento roto a `200`.

**Ítem concreto para el Bloque 3 (no genérico — ya localizado)**:
`backend/src/routes/configuracionPublica.js:12` consulta `zonas_cobertura` con Service Role
Key sin filtrar por `prestadora_id` (junto con la consulta a `configuracion_empresa` en la
misma ruta, línea 11, mismo problema). Es una instancia real y confirmada del riesgo que el
Bloque 3 existe para resolver — agregar a la lista de rutas a corregir en ese bloque con esta
referencia exacta de archivo:línea.

### 4.2 `escalas_legales` compartida vs. por jurisdicción (y moneda — mismo cambio)

Si la primera prestadora fuera de Argentina llega antes de resolver esto, `escalas_legales`
necesita jurisdicción **y** moneda (diseño ya resuelto en 3.7 — es un único `ALTER TABLE`
aditivo, no dos features separadas) antes de servir datos legales incorrectos, o en la
moneda incorrecta, a un tenant extranjero. No es urgente mientras todos los tenants operen
en Argentina, pero **no asumir que nunca va a pasar** — dejarlo señalado y diseñado (punto 6
del prompt: "dejar preparado, no implementar ya"), ejecutar recién cuando haya un cliente
real fuera de Argentina.

### 4.3 Alcance real del punto 4 del prompt (facturación) — pedido como "implementar ahora"

El prompt de negocio pide explícitamente el módulo de facturación **implementado**, no solo
diseñado. Esto es un cambio de alcance grande (nuevas tablas, lógica de generación periódica
de comprobantes, dos numeraciones fiscales separadas con implicancias contables/AFIP reales
para dos razones sociales distintas). Antes de implementarlo hace falta una decisión de
negocio no técnica: **¿qué esquema de precio se va a usar con prestadora-original en concreto, y con qué
periodicidad se emite?** — sin eso, el módulo se construiría sin poder validarlo contra un
caso real. Recomendación: aprobar primero el diseño de tablas de la sección 3.5, definir ese
dato de negocio, y recién ahí implementar la generación de comprobantes.

### 4.4 Vínculo 1:1 `auth.users` ↔ `usuarios`

Ver 1.6 — una persona no puede hoy pertenecer a dos prestadoras con el mismo email. Señalado,
no bloqueante para el primer cliente adicional a prestadora-original; revisar si en algún momento hay un
caso de negocio real que lo necesite.

### 4.6 `identificacion_fiscal` en `NULL` — falta la pantalla que lo carga, y falta la regla que lo exige

Corrección aplicada 2026-07-09: el seed de prestadora-original en `prestadoras` (Bloque 1) tenía
`identificacion_fiscal = '[DEFINIR]'`, un placeholder de texto hardcodeado — mismo problema
de fondo que la regla 1 de `CLAUDE.md` prohíbe para precios/zonas, aplicado sin querer acá.
Se corrigió: la columna pasó a nullable (`ALTER COLUMN ... DROP NOT NULL`) y el valor a `NULL`
real, aplicado y verificado contra Supabase. Dos puntos abiertos quedan de esto:

- **Propuesta, no implementada todavía**: que una prestadora no pueda pasar a
  `estado = 'certificada'` sin `identificacion_fiscal` cargado (constraint o trigger en la
  transición de estado, no en la creación de la fila — una prestadora `prospecto` o
  `en_certificacion` legítimamente no tiene el dato todavía). prestadora-original ya está sembrada como
  `certificada` con el campo en `NULL`, así que si se implementa esta restricción ahora mismo
  haría falta cargar el CUIT real de prestadora-original primero, o la migración fallaría.
- **Dependencia real que esto expone**: hoy no existe ninguna pantalla donde un
  `admin_prestadora` cargue o edite los datos de su propia fila en `prestadoras`
  (`identificacion_fiscal` incluido). Nadie lo completa a mano mientras tanto — el campo sigue
  en `NULL` hasta que exista esa pantalla. Anotado como caso de uso central de
  `configuracion_prestadora` (Bloque 4, diseño 3.2) — no es un panel nuevo aparte, es la misma
  pantalla de configuración por-tenant que ya estaba planeada para branding/notificaciones.

### 4.5 Orden de trabajo sugerido (no vinculante, para discutir)

1. Aprobar sección 3.1-3.4 (entidad `prestadoras`, cumplimiento normativo, roles) y la decisión 4.1.
2. Ejecutar pasos 1-6 de la sección 2 (aislamiento de datos) — es lo que habilita tener un
   segundo cliente real sin arriesgar los datos de prestadora-original.
3. Recién después, con un caso de negocio concreto en mano, abordar 3.5 (facturación) según
   4.3.
4. Branding por tenant (logo, textos parametrizados) y multi-moneda en la UI pública, en
   paralelo o después de 3, según cuándo haya un segundo cliente real esperando eso.

---

## 5. Inventario — apariencia, marca y configuración que deben pasar a ser por-prestadora

Pedido del usuario (2026-07-09), ampliando la regla 1 de `CLAUDE.md` (nunca hardcodear
precios/zonas/textos) a su conclusión lógica ahora que el sistema es multi-tenant:
**ningún dato, configuración ni elemento de apariencia —paleta de colores, tipografía,
logo, textos de marca, remitente de emails, plantillas de documentos, dominio/contacto—
se hardcodea en código.** Todo debe poder cargarse/editarse desde un panel o CMS interno,
por prestadora. Este inventario es solo relevamiento — **no diseña tablas ni implementa
nada todavía** (eso se decide en el Bloque 4 o un bloque propio, según el volumen).

**Criterio de exclusión, no negociable** (mismo patrón ya usado en `escalas_legales`):
esto aplica a *valores* de apariencia/configuración, no a *lógica* con peso legal o de
seguridad. `calcularCese`, el cálculo del score de riesgo, las policies RLS, la lógica de
autorización, las 13 causales de cese y el motor de alertas de IA usan valores
configurables, pero la fórmula/lógica en sí sigue siendo código versionado y testeado, no
un campo editable desde panel.

Los ítems ya señalados en la sección 1.5 ("Hardcodeos que son solo texto de marca") se
marcan acá como **[1.5 → confirmado]** — no se releva de nuevo, solo se promueven de
"pendiente" a "con regla definida" (van a panel/CMS, sin excepción).

### 5.1 Paleta de colores — **estructural, con pre-limpieza obligatoria antes de dinamizar**

- `panel/src/styles/variables.css:1-13` — bloque `:root` completo (`--azul-oscuro`,
  `--azul-medio`, `--verde-exito`, `--naranja-alerta`, `--rojo-peligro`, `--fondo-alt`,
  `--texto-principal`, `--texto-secundario`).
- `sitio-web/src/styles/variables.css:1-25` — la misma paleta base, duplicada de forma
  independiente, más variables propias (`--blanco`, `--borde`, `--overlay-*`,
  `--sombra-*`, `--verde-exito-fondo`, `--rojo-peligro-fondo`). Ya hoy son **dos fuentes
  de verdad separadas** para los mismos colores — un problema previo a multi-tenant.
- Valores hex sueltos fuera de variable (deuda menor, no bloqueante): `panel/src/index.css`
  líneas 89, 91, 124, 144, 174, 201, 217, 255, 306, 346, 353, 359; `sitio-web/src/styles/components.css:24`.
- **Regla**: va a panel/CMS. Cada prestadora define su propia paleta; prestadora-original queda como
  el primer registro con los valores actuales.
- **Pre-limpieza obligatoria (ajuste del usuario, 2026-07-10) — dinamizar `variables.css`
  no alcanza sin esto antes**: theming por prestadora sobre el estado actual del código
  quedaría incompleto si no se resuelven primero dos cosas, en este orden:
  1. **Decisión de fuente única**: ¿`panel/` y `sitio-web/` pasan a compartir un solo
     origen de variables de color (paquete/archivo común importado por ambos), o se
     acepta mantenerlos como dos archivos sincronizados a mano? Mientras sigan siendo
     "dos fuentes de verdad separadas" (como ya señala el punto de arriba), dinamizar
     una y no la otra deja el theming a medio hacer — una prestadora vería su paleta en
     el panel pero no en el sitio público, o viceversa.
  2. **Barrido de los valores hex sueltos** ya listados arriba (12 líneas en
     `panel/src/index.css` + 1 en `sitio-web/src/styles/components.css`): mientras sigan
     fuera de variable, cualquier mecanismo de tema por prestadora los deja intactos con
     los colores de prestadora-original hardcodeados, sin importar qué tan bien se dinamice
     `variables.css`. Este barrido tiene que ejecutarse antes de dar por completo el
     ítem 5.1, no en paralelo ni después.

### 5.2 Tipografía — **estructural, de mayor complejidad que color (no es "una variable más")**

- `panel/src/styles/variables.css:11-12` y `sitio-web/src/styles/variables.css:23-24` —
  `--font-display: 'Playfair Display', serif` / `--font-body: 'DM Sans', sans-serif`.
- `sitio-web/src/app/[locale]/layout.jsx:53-58` — `<link>` a Google Fonts hardcodeado a
  esas dos familias.
- `sitio-web/public/offline.html:18,23` — duplica las mismas declaraciones de
  `font-family` en una tercera copia (página offline standalone).
- **Regla**: va a panel/CMS, al menos como selección parametrizada (no necesariamente
  "cualquier fuente libre", pero sí un valor por prestadora, no fijo en CSS).
- **Distinción de complejidad (ajuste del usuario, 2026-07-10)**: a diferencia del color
  (5.1), que es sustituir el valor de una variable CSS ya centralizada, tipografía
  requiere además un **mecanismo de carga dinámica de fuentes** que hoy no existe — el
  `<link>` a Google Fonts en `sitio-web/src/app/[locale]/layout.jsx:53-58` está fijo en
  tiempo de build a "Playfair Display"/"DM Sans", no parametrizado por request ni por
  tenant. Cambiar la variable CSS sin resolver cómo se sirve/carga la fuente elegida por
  cada prestadora (`<link>` dinámico según tenant resuelto en el layout, self-hosting de
  fuentes, o un subconjunto acotado de familias precargadas) deja el valor editable en
  panel sin efecto real en la página. Tratar esto como una pieza de trabajo separada y
  más compleja que 5.1, no agruparla bajo el mismo esfuerzo que "dinamizar una variable
  de color".

### 5.3 Logo — **[1.5 → confirmado, mixto con estructural nuevo]**

- No existe archivo de logo-imagen — se renderiza como texto: `panel/src/components/layout/Layout.jsx:14`
  (`<div className="panel-logo">prestadora-original Salud</div>`), `sitio-web/src/components/Header.jsx:24-25`,
  `sitio-web/src/components/Footer.jsx:10`. Este es el ítem que 1.5 ya señalaba para
  `Layout.jsx` — confirmado, se promueve a regla definida.
- `sitio-web/src/styles/components.css:23-25` — clase `.logo` (estilos, no contenido).
- `panel/public/favicon.svg`, `sitio-web/public/favicon.svg` — íconos por app, sin
  selección por tenant.
- **Regla**: va a panel/CMS — nombre de marca visible y, si se define subir imagen de
  logo real, el asset también por prestadora.

### 5.4 Textos de marca fijos fuera de i18n — **[1.5 → confirmado] + hallazgos nuevos, uno mixto**

- `panel/src/i18n/translations.js` — más ocurrencias de las relevadas en 1.5: líneas
  22, 37, 188, 214, 268, 271, 321 (es), espejadas en en/pt en 409, 424, 575, 601, 655,
  658, 708 y 796, 811, 962, 988, 1042, 1045, 1095. **[1.5 → confirmado]** para el bloque
  general, pero con una distinción que 1.5 no hacía: algunas de estas líneas son puro
  nombre de marca ("prestadora-original Salud" en un título), y otras son **términos de negocio**
  como "Certificado prestadora-original" o "Exclusividad de facturación a prestadora-original" — estos últimos
  podrían necesitar renombrarse a un término genérico (p. ej. "Certificado de la
  plataforma") en vez de simplemente parametrizar el nombre de marca. **Caso ambiguo,
  resuelto — ver 5.4bis**: el Desarrollador definió el diseño de 4 capas y, el 2026-07-13,
  el nombre definitivo del certificado: **"Certificado de Aptitud"** (reemplaza
  "Certificado prestadora-original" en todo el proyecto). "Exclusividad de facturación a prestadora-original" sigue
  como tema aparte, ver pendiente #19 de `docs/PENDIENTES.md`.
- `sitio-web/src/i18n/translations.js:17, 79, 149, 211, 281, 343, 354` — mensajes de
  WhatsApp y subtítulos con "prestadora-original" fijo.
- `panel/src/lib/calcularCese.js:215` — mismo texto ya señalado en 1.5 (advertencia de
  negocio), acá específicamente la línea del string.
- `sitio-web/src/app/[locale]/layout.jsx:27,37` — `generateMetadata` hardcodea `title` y
  `openGraph.title` a "prestadora-original Salud", **pese a ya llamar a `getConfiguracionPublica()`
  en la línea 48 sin usarlo para el título** — estructural, y la corrección es casi
  gratis porque el dato dinámico ya se está pidiendo.
- 6 páginas repiten el mismo patrón de título fijo: `trabaja-con-nosotros/page.jsx:8`,
  `terminos/page.jsx:6`, `privacidad/page.jsx:6`, `servicios/page.jsx:6`,
  `solicita-servicio/page.jsx:6-7`, `contacto/page.jsx:7`.
- `sitio-web/src/app/manifest.js:3-4` — `name`/`short_name` del manifest (ver también 5.8).
- Menciones de "Filtro prestadora-original" en comentarios de código (`backend/src/routes/panelCuentas.js:87`,
  `schema_etapa2b.sql:7,100`, `schema_etapa2e.sql:2`) — **corregidas 2026-07-10**: el término
  se retiró por completo (ni siquiera de uso interno, ver glosario de `CLAUDE.md`), los
  comentarios ya no lo mencionan.
- **Regla**: el nombre de marca va a panel/CMS sin excepción. Los términos de negocio
  mixtos ("Certificado prestadora-original" y similares) — **resuelto, ver 5.4bis** — no es un simple
  parametrizar/genericar, requiere un diseño de 4 capas.

### 5.4bis Certificado de Aptitud (antes "Certificado prestadora-original") — diseño de 4 capas (**resuelto con el usuario, 2026-07-12; nombre definitivo confirmado 2026-07-13**)

El caso "Certificado de Aptitud" no se resuelve sustituyendo el nombre de marca por el de
cada prestadora, ni tampoco genericándolo del todo — el usuario definió un diseño de 4
capas independientes entre sí, en este orden de precedencia:

**Capa 0 — Interruptor general por prestadora: ¿usa el sistema de certificaciones o no?**
Cada prestadora licenciataria puede activar o desactivar por completo la etapa de
capacitación+certificación de su propio Proceso de Incorporación de Asistentes
(`PRD_03_Reclutamiento.md:50`, etapa 5 de 5). Si la desactiva, las otras 4 etapas del
proceso (antecedentes, entrevista, referencias — seguridad/riesgo legal, no negociables)
siguen aplicando igual; solo la etapa de certificación queda apagada para esa prestadora.
Sigue el mismo patrón ya anotado como idea de arquitectura futura en `docs/PROGRESS.md:107`
("módulos activables por configuración", Módulo 8) — este es su primer caso de uso
concreto.

**Capa 1 — Si la activa, ¿certifica ella misma o designa un tercero?** La prestadora puede
correr su propio Proceso de Incorporación con capacitación propia (como hace prestadora-original hoy),
o designar una entidad externa como "ente calificador" en su nombre (ejemplo dado por el
usuario, inventado a modo ilustrativo: un "Centro Argentino de Asistencia de Personas").
En ambos casos la prestadora sigue siendo quien decide certificar — solo cambia quién
ejecuta el proceso.

**Capa 2 — Independiente de la Capa 0: un Asistente puede traer certificaciones de otro
origen.** Existan o no en el sistema de certificación propio de la prestadora actual, un
Asistente puede tener certificados de:
  (a) otra prestadora licenciataria del mismo sistema PLM (el Asistente ya certificado por
      prestadora-original se postula después a otra licenciataria que no certifica);
  (b) una entidad totalmente externa al sistema, sin verificación propia del software (un
      curso de enfermería, por ejemplo — dato declarado/adjunto, no emitido con QR propio).
La prestadora actual decide si reconoce/incorpora esos certificados externos a la ficha del
Asistente dentro de su propio sistema, o no.

**Capa 3 — Visibilidad pública, por certificado.** Independientemente de su origen (propio,
delegado en un tercero, o de otro origen vía Capa 2), la prestadora decide para cada
certificado si se muestra en la ficha pública del Asistente (Etapa 6, `docs/PROGRESS.md:18`
— "Perfil público del Asistente con QR", todavía no construida) o si queda solo como dato
interno.

**Implicancia de modelo de datos (no implementada todavía, solo señalada)**: la tabla
`certificados` (`docs/DATA_MODEL.md:325-332`, hoy `id, asistente_id, fecha_emision,
fecha_vencimiento, activo, created_at`) necesita como mínimo un campo de **entidad
emisora** (quién certificó: la propia prestadora, un tercero designado, u otra entidad —
ligado a la Capa 1/2) y un campo de **visibilidad pública** (ligado a la Capa 3). La Capa 2
caso (a) además requiere que el pool de Asistentes (o al menos su historial de
certificaciones) pueda referenciarse entre licenciatarias — mismo punto ya abierto en el
pendiente #13 de `docs/PENDIENTES.md` sobre infraestructura común directo/marketplace.
Diseño de columnas/tabla concreto: pendiente de abordarse junto con el Bloque 4
(`configuracion_prestadora`), no diseñado todavía.

**"Exclusividad de facturación a prestadora-original" queda fuera de este diseño de 4 capas** — es un
concepto distinto (la parte comercial con la que el Asistente factura su monotributo en
exclusividad, no un ente que califica su aptitud) y pertenece al módulo de
facturación/pagos, todavía no discutido. Sigue como parametrización simple (sustituir
"prestadora-original" por el nombre de la prestadora), sin la ambigüedad de certificación. Una idea
relacionada (facturación a un tercero intermediario) quedó anotada aparte, sin resolver,
en el pendiente #19 de `docs/PENDIENTES.md` — no se mezcla con este diseño.

### 5.5 Remitente/firma de emails — **[1.5 → confirmado] — PRIORIDAD ALTA, mayor que 5.1/5.3 (color/logo)**

**Ajuste del usuario, 2026-07-10**: este ítem no es cosmético como el resto de la sección
5 — es un **riesgo de fuga de marca/reputación entre tenants**, no solo una cuestión de
apariencia. Hoy el remitente SMTP es único y global (`process.env.SMTP_USER`): significa
que, apenas exista una segunda prestadora licenciataria operando, **todos los emails de
todas las prestadoras salen desde la casilla de correo propia de prestadora-original** — un email de
la Prestadora B llega a su Familia con el remitente/firma de prestadora-original, exponiendo a una
prestadora competidora bajo la marca de otra. Un logo o color por defecto equivocado es un
problema estético corregible en la UI; un email mal firmado ya salió, no se puede retirar.
Por eso este ítem queda con prioridad más alta que 5.1 (paleta) y 5.3 (logo) dentro del
Bloque 4 — debe resolverse antes o junto con la primera prestadora adicional real, no
puede quedar relegado al final de "branding por tenant" solo porque aparece después en
este documento.

- `backend/src/utils/email.js:4-13,35,44` — transporter SMTP único, `from: process.env.SMTP_USER`.
- `backend/src/routes/panelNotificaciones.js:11,15,16,19,23,24,27,31,32` — asuntos y
  firmas en 3 idiomas. Ya señalado en 1.5 — confirmado, se promueve a regla definida.
- **Regla**: va a panel/CMS — remitente y firma por prestadora.

### 5.6 Plantillas de documentos generados — **[1.5 → confirmado, con alcance mayor al ya relevado]**

- `panel/src/lib/generarDocumentoCese.js` genera **5 tipos de documento**, no solo cese,
  todos comparten el mismo patrón de marca fija:
  - `:11-14` `DISCLAIMER_LEGAL` menciona "sistema prestadora-original".
  - `:22-32` (`encabezado()`) — línea 25 `doc.text('prestadora-original SALUD', MARGEN, 20)`, función
    compartida por las 5 generadoras: `generarLiquidacionFinal` (:72),
    `generarTelegramaCese` (:105), `generarNotificacionFinPeriodoPrueba` (:124),
    `generarCertificadoTrabajo` (:142), `generarConstanciaAusencia` (:179).
  - `:146-150` — texto de cuerpo menciona "vinculado/a con prestadora-original Salud".
- El caso general (documento de cese) ya estaba en 1.5 — confirmado, y se amplía: es
  `encabezado()` como función compartida la que hay que parametrizar con el nombre de la
  prestadora, no solo el texto del cese puntual.
- **Regla**: va a panel/CMS — razón social/nombre en encabezado, parametrizado por
  prestadora al momento de generar cada PDF.

### 5.7 Dominio/URL/contacto — **[1.5 → confirmado] + hallazgo estructural fuerte nuevo**

- `sitio-web/src/config/siteConfig.js:4-11` — teléfono, WhatsApp, email, dominio, zona de
  cobertura, precio público. Ya señalado en 1.5 — confirmado. Líneas 17,19-23,25,27 son
  configuración de negocio (especialidades, zonas, disponibilidad, situación fiscal), no
  texto de marca — quedan para el mismo tratamiento que precios/zonas (regla 1 de
  `CLAUDE.md`, ya vigente, no es un caso nuevo).
- `sitio-web/src/lib/configuracionPublica.js:1-37` — `getConfiguracionPublica()` ya tiene
  mecanismo de fetch-con-fallback (línea 9, 35), pero **no está parametrizado por
  tenant** (no hay id/slug de prestadora en la URL del fetch) — esta es la pieza que más
  se acerca a lo que hace falta, solo le falta el parámetro de tenant.
- `backend/src/routes/configuracionPublica.js:9-20` y `backend/src/routes/panelConfiguracion.js:20,28-30`
  — ambos leen/escriben `configuracion_empresa` con `.eq('id', 1)` — mismo hallazgo
  estructural que 1.1/1.5, ya conocido.
- `backend/src/db/schema_etapa2h.sql:12-25` — el propio `CHECK (id = 1)`, el hallazgo
  mono-tenant más literal del repo (ya documentado en 1.1).
- **Cruce importante con el Bloque 1 ya aplicado**: `schema_multitenant_01.sql:30-59` creó
  `prestadoras` (la entidad multi-fila) pero **nada del resto del código está conectado
  a ella todavía** — ni `configuracion_empresa`, ni `siteConfig.js`, ni los emails, ni
  los PDFs. `prestadoras` es la fuente de verdad candidata para resolver 5.1-5.8 en el
  Bloque 4, pero hoy es una tabla aislada.
- `sitio-web/src/app/robots.js:1,4` y `sitemap.js:1,7` — ambos arman la URL canónica
  desde `siteConfig`, sin concepto de dominio/subdominio por tenant.
- **Regla**: va a panel/CMS — contacto, dominio y config pública por prestadora.

### 5.8 Favicon/PWA/manifest — **estructural, hallazgo nuevo**

- `sitio-web/src/app/manifest.js:1-12` — `name`, `short_name`, `description` (esta última
  fija "AMBA" como zona de cobertura), `theme_color: '#1F4E79'` (duplica a mano la
  variable CSS de 5.1), `background_color`, un solo ícono `/favicon.svg`. La función no
  recibe ningún parámetro.
- Los dos `favicon.svg` — solo imagen de marca, sin mecanismo de selección por tenant.
- No hay `manifest.json` estático (Next.js usa el `manifest.js` dinámico); `panel/` no
  tiene manifest (es SPA, no PWA).
- **Regla**: va a panel/CMS — nombre, descripción, color de tema e ícono del manifest,
  por prestadora.

### 5.9 Resumen — qué queda pendiente de decisión antes de tocar tablas

1. **"Certificado de Aptitud" (antes "Certificado prestadora-original") — resuelto (ver 5.4bis, 2026-07-12; nombre confirmado 2026-07-13)**: diseño de 4 capas
   (interruptor de certificación por prestadora, ente calificador propio o delegado a un
   tercero, reconocimiento de certificados de otro origen, visibilidad pública por
   certificado). Falta el diseño concreto de columnas/tabla, a abordar junto con el
   Bloque 4. "Exclusividad de facturación a prestadora-original" queda aparte, como parametrización
   simple — pertenece al módulo de facturación/pagos (todavía no discutido), no a este
   diseño de certificación. Idea relacionada de tercero de facturación anotada aparte en
   el pendiente #19 de `docs/PENDIENTES.md`.
2. **Diseño de tabla(s)** para 5.1-5.8 — no se diseñó todavía. Candidato natural:
   extender `configuracion_prestadora` (Bloque 4, diseño 3.2) para que cubra también
   paleta/tipografía/logo/manifest, en vez de crear una tabla nueva — a confirmar cuando
   se aborde ese bloque.
3. **Volumen**: dado que toca 5 áreas de código distintas (CSS, i18n, PDF, email, Next.js
   metadata/manifest) con mecanismos de consumo distintos entre sí, evaluar en el
   Bloque 4 si conviene ejecutarlo como un sub-bloque propio en vez de una tarea más
   dentro de "branding por tenant".

---

## Estado de este documento

Es un **plan propuesto**, no una decisión tomada ni código implementado. El sistema sigue
siendo mono-tenant (prestadora-original) en producción. Ningún paso de la sección 2 ni tabla de la
sección 3 se creó todavía contra Supabase real. Requiere aprobación explícita del usuario,
idealmente punto por punto de la sección 4, antes de generar la primera migración SQL real.

---

## Tabla de trazabilidad — estado consolidado

| Punto pedido | Sección del documento |
|---|---|
| Orden de migración priorizado por exigencia regulatoria | Resumen ejecutivo de la Sección 1 + Sección 2 (párrafo de cierre y pasos 2-6) |
| Resolución de `configuracion_empresa` (`CHECK (id = 1)`) sin downtime | Sección 3.2 (diseño de `configuracion_prestadora`) + Sección 2, paso 7 |
| Cómo se puebla `prestadora_id` en los datos existentes de prestadora-original sin intervención manual fila por fila | Sección 2, paso 3 (`UPDATE` masivo con el id de la prestadora prestadora-original, un solo script) |
| Orden de reescritura de policies RLS existentes | Sección 2, paso 5 |
| Diseño de la entidad `prestadoras` | Sección 3.1 |
| Diseño del módulo de cumplimiento normativo documental (checklist, vencimientos, registro inmutable de verificación) | Sección 3.3 |
| Diseño de facturación dual (plan de facturación por prestadora + comprobantes con emisor PLM/prestadora-original y numeración propia) | Sección 3.5 |
| Esquema de roles nuevo (`administrador de prestadora`, `financiador` contemplado sin implementar) | Sección 3.4 |
| Columna de moneda en los 7 campos monetarios relevados | Sección 3.8 (los 6 restantes) + Sección 3.5 (facturación nueva) + Sección 3.7 (`escalas_legales`) |
| `escalas_legales` — jurisdicción + moneda | Sección 3.7 |
| Decisión de centralización RLS (`current_tenant()`/`es_superadmin()`) | Sección 3.6 |

Todas las filas resueltas — ninguna queda en PENDIENTE.
