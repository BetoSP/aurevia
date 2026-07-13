# DATA_MODEL.md — Schema consolidado (Supabase / PostgreSQL)

> Junta las tablas definidas por separado en `prestadora-original_DOCUMENTO_UNICO_v1.md` (Parte L —
> Arquitectura Web, Parte O — App de Servicio), `prestadora-original_PRD_Gestion_Personal_v1.md` y
> `prestadora-original_PRD_Reclutamiento_v1_extracted.txt`, en un solo DDL de referencia. Es el mapa
> completo — al construir cada etapa, crear solo las tablas que esa etapa necesita
> (ver `BUILD_ORDER.md`), no todas de una vez.
>
> Las notas marcadas **"(patrón adoptado de Money Suite)"** son convenciones técnicas
> tomadas del documento no vinculante `Prompt de Money Suite.md` porque mejoran el schema
> sin contradecir ninguna decisión de negocio ya tomada. Todo lo demás en este archivo
> viene de los PRDs oficiales.

## Convenciones generales

- UUID v4 como PK en todas las tablas (`gen_random_uuid()`).
- `created_at TIMESTAMPTZ DEFAULT NOW()` en todas las tablas.
- **(patrón adoptado de Money Suite)** agregar también `updated_at TIMESTAMPTZ DEFAULT NOW()`
  con trigger de actualización, y `deleted_at TIMESTAMPTZ` (soft delete) en las tablas donde
  el borrado debe ser reversible y auditable: `asistentes`, `familias`, `pacientes`,
  `aspirantes`. No aplicar soft delete a tablas de eventos (`guardias`, `reportes`,
  `alertas`, `ceses`) — esas nunca se borran, se archivan por estado.
- Campos de dinero en `NUMERIC(12,2)`.
- Nunca usar `TEXT CHECK (col IN (...))` cuando el valor es un enum cerrado que se reutiliza
  en varias tablas — usar `CREATE TYPE ... AS ENUM (...)` **(patrón adoptado de Money Suite)**,
  salvo los casos donde el PRD original ya definió el CHECK explícitamente (se respeta tal
  cual para no reabrir decisiones ya tomadas).

## Tabla: prestadoras (multi-tenant, Bloque 1 — aplicada y verificada contra Supabase real)

```sql
CREATE TABLE prestadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- columnas de configuración/branding por prestadora: pendientes, ver Bloque 4 abajo
);
```

Cada prestadora licenciataria del software (prestadora-original es la primera, id
`874f54d7-4383-4d54-8b9f-f51d02f0dd11`) es un tenant aislado. Ver
`docs/PLAN_MULTITENANT_PLM.md` para el diseño completo y `backend/src/db/schema_multitenant_01.sql`/`schema_multitenant_02.sql` para el DDL real aplicado.

**Convención de FK tenant-segura (introducida con Módulo 6, aplicar a toda tabla nueva
referenciada desde otra tabla con `prestadora_id`):** en vez de una FK simple al `id` de la
tabla padre, se usa una FK compuesta contra `(id, prestadora_id)`, habilitada por un
`UNIQUE(id, prestadora_id)` en la tabla padre:

```sql
-- en la tabla padre
UNIQUE (id, prestadora_id)

-- en la tabla hija
prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
FOREIGN KEY (padre_id, prestadora_id) REFERENCES padre (id, prestadora_id)
```

Esto hace imposible, a nivel de constraint de base, que una fila referencie una fila de otro
tenant — no depende solo de que la RLS esté bien escrita. Las tablas de los Bloques 1-3 (creadas
antes de esta convención) tienen `prestadora_id` como columna simple, sin FK compuesta a sus
tablas relacionadas; no se retrofitea salvo que se decida explícitamente.

**Deuda técnica — cerrada 2026-07-11 (ver `docs/PENDIENTES.md` ítem #3):**
`schema_multitenant_02.sql` había agregado un `DEFAULT '874f54d7-...'` (prestadora_id de
prestadora-original) en `prestadora_id` de las 15 tablas de los Bloques 1-3 (`usuarios`, `asistentes`,
`ausencias`, `guardias_cobertura`, `ceses`, `familias`, `pacientes`, `lista_precios`,
`prestaciones`, `paquetes_prestaciones`, `paquete_prestacion_items`, `certificados`,
`zonas_cobertura`, `solicitudes`, `postulaciones`) como parche temporal, mientras el Bloque 3
completaba el filtrado real de tenant. 7 de esas 15 (`usuarios`, `asistentes`, `familias`,
`pacientes`, `zonas_cobertura`, `solicitudes`, `postulaciones`) se cerraron el 2026-07-10
directo contra Supabase (sin migración versionada en el repo — deuda de trazabilidad, no de
funcionalidad). Las 8 restantes (`ausencias`, `guardias_cobertura`, `ceses`,
`lista_precios`, `prestaciones`, `paquetes_prestaciones`, `paquete_prestacion_items`,
`certificados`) se cerraron el 2026-07-11 con `backend/src/db/schema_multitenant_03.sql`,
aplicado contra Supabase real vía MCP y verificado con un insert real sin `prestadora_id`
contra `certificados` que falló como se esperaba (`ERROR 23502: null value in column
"prestadora_id" ... violates not-null constraint`). Las 15 tablas ya no tienen `DEFAULT`:
todo insert nuevo debe declarar `prestadora_id` explícito. `guardias`/`series_guardias`
(Módulo 6) nunca tuvieron este `DEFAULT` — nacieron `NOT NULL` sin default desde
`schema_modulo6_guardias.sql`.

## Tabla: usuarios

Extiende `auth.users` de Supabase. `prestadora_id` es `NOT NULL` desde el Bloque 1
(`schema_multitenant_01.sql`) — ver deuda del `DEFAULT` arriba.

```sql
CREATE TABLE usuarios (
  id UUID REFERENCES auth.users PRIMARY KEY,
  rol TEXT CHECK (rol IN ('superadmin','admin_prestadora','coordinador','asistente','familia')),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  nombre TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Nota (2026-07-10): el rol `admin` original fue renombrado a `admin_prestadora` en dato y
código durante el Bloque 2 — no queda ningún registro ni ruta con el valor `admin` anterior
(ver `CLAUDE.md` glosario). `superadmin` no tiene un `prestadora_id` que lo limite (ve todas
las prestadoras vía `es_superadmin()`, ver `SECURITY.md`).

## Tabla: asistentes

```sql
CREATE TABLE asistentes (
  id UUID REFERENCES usuarios(id) PRIMARY KEY,
  foto_url TEXT,
  especialidades TEXT[],
  zonas TEXT[],
  disponibilidad JSONB,
  estado TEXT DEFAULT 'pendiente',
  qr_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),  -- Bloque 1, aplicado y verificado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Extensión de PRD_02B_Gestion_Personal.md — columnas del vínculo laboral dual-track
ALTER TABLE asistentes ADD COLUMN tipo_vinculo TEXT
  CHECK (tipo_vinculo IN ('monotributo', 'dependencia')) DEFAULT 'monotributo';
ALTER TABLE asistentes ADD COLUMN categoria_cct TEXT;      -- categoría CCT 743/16, solo si dependencia
ALTER TABLE asistentes ADD COLUMN fecha_alta DATE NOT NULL;
ALTER TABLE asistentes ADD COLUMN fecha_baja DATE;         -- null mientras esté activo
ALTER TABLE asistentes ADD COLUMN causal_baja TEXT;        -- ver enum causal_cese, null mientras activo
ALTER TABLE asistentes ADD COLUMN valor_hora NUMERIC(12,2);      -- si monotributo
ALTER TABLE asistentes ADD COLUMN sueldo_basico NUMERIC(12,2);   -- si dependencia
ALTER TABLE asistentes ADD COLUMN horas_semanales NUMERIC(5,2);
ALTER TABLE asistentes ADD COLUMN vencimiento_monotributo DATE;
ALTER TABLE asistentes ADD COLUMN vencimiento_art DATE;
ALTER TABLE asistentes ADD COLUMN vencimiento_seguro DATE;
ALTER TABLE asistentes ADD COLUMN score_riesgo_reclasificacion INTEGER DEFAULT 0; -- 0-100
```

Nota: `etapas_verificacion` como columna JSONB **no se usa** en este schema — se reemplaza
por la tabla normalizada `verificaciones_asistente` de abajo, que permite filtrar y auditar
cada etapa del Proceso de Incorporación de Asistentes individualmente (patrón adoptado de
Money Suite, tabla `verification_records`, adaptado a la terminología y a las 5 etapas
oficiales de prestadora-original en vez de sus 8 etapas genéricas).

**Actualizado 2026-07-10:** lo que esta nota describía como plan futuro ya está implementado
— la tabla `prestadoras` existe y `prestadora_id` es `NOT NULL` en `asistentes` y en las
otras 14 tablas listadas en la sección "Tabla: prestadoras" de arriba, aplicado y verificado
contra Supabase real (Bloque 1 de `docs/PLAN_MULTITENANT_PLM.md`).

## Tabla: verificaciones_asistente (Proceso de Incorporación de Asistentes — 5 etapas)

```sql
CREATE TYPE etapa_filtro AS ENUM (
  'postulacion', 'verificacion_identidad', 'antecedentes_penales',
  'entrevista', 'capacitacion'
);

CREATE TABLE verificaciones_asistente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asistente_id UUID NOT NULL REFERENCES asistentes(id) ON DELETE CASCADE,
  etapa etapa_filtro NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | aprobada | rechazada
  notas TEXT,
  revisado_por UUID REFERENCES usuarios(id),
  documento_url TEXT,
  referencia_externa VARCHAR(200),  -- ej: ID de consulta al Registro Nacional de Reincidencia
  completado_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verif_asistente ON verificaciones_asistente (asistente_id);
CREATE INDEX idx_verif_etapa ON verificaciones_asistente (etapa);
```

## Tabla: validaciones_faciales

Solo si se implementa reconocimiento facial en la etapa "verificación de identidad" (hoy
descrita como "DNI + reconocimiento facial con IA" en el sitio público — no hay proveedor
elegido todavía, ver `SECURITY.md` sección de decisiones pendientes).

```sql
CREATE TABLE validaciones_faciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asistente_id UUID NOT NULL REFERENCES asistentes(id) ON DELETE CASCADE,
  contexto VARCHAR(50) NOT NULL,     -- 'reclutamiento' (no hay check-in facial en el diseño actual)
  imagen_url TEXT NOT NULL,
  referencia_url TEXT NOT NULL,
  resultado TEXT NOT NULL DEFAULT 'pendiente', -- match | mismatch | inconclusive | pending
  confianza NUMERIC(5,4),
  proveedor VARCHAR(80),
  respuesta_cruda JSONB,
  validado_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

(patrón adoptado de Money Suite, tabla `facial_validations` — el diseño oficial de prestadora-original
no incluye check-in biométrico en cada guardia, solo en el reclutamiento; no agregar el
campo `booking_id`/`guardia_id` salvo que el negocio decida extender la biometría al check-in.)

## Tabla: familias

```sql
CREATE TABLE familias (
  id UUID REFERENCES usuarios(id) PRIMARY KEY,
  plan TEXT DEFAULT 'directo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

## Tabla: pacientes

```sql
CREATE TABLE pacientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  familia_id UUID REFERENCES familias(id),
  nombre TEXT NOT NULL,
  fecha_nacimiento DATE,
  patologias TEXT[],
  medicacion_habitual JSONB,
  nivel_complejidad TEXT CHECK (nivel_complejidad IN ('I','II','III')),
  domicilio TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  ioma_afiliado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

## Tabla: guardias y Módulo 6 (Guardias) — reemplazado por el schema real, 2026-07-10

**Esta sección quedó obsoleta como diseño-solo.** El DDL real, aplicado y verificado contra
Supabase (`backend/src/db/schema_modulo6_guardias.sql`), reemplaza la tabla `guardias` de
abajo por un diseño de 8 tablas — ver ese archivo para el DDL completo (columnas, tipos,
constraints, los 15 policies de RLS). Resumen de las tablas:

- **`series_guardias`** — patrón recurrente de una guardia (ej. "todos los martes 8-14hs"),
  del cual `guardias` genera instancias concretas.
- **`guardias`** — instancia concreta de una guardia; conserva `asistente_id`, `paciente_id`,
  `checkin/checkout` con GPS igual que el diseño original de abajo, más `serie_id` y
  `prestadora_id` (FK compuesta tenant-segura contra `pacientes`/`asistentes`).
- **`domicilios_temporales_paciente`** — domicilio distinto al habitual del Paciente para una
  guardia puntual (ej. internación en casa de un familiar).
- **`personal_emergencia`** — contacto de emergencia asociado a una guardia/Paciente.
- **`incidentes_relevo`** — registra un Asistente ausente a una guardia. `guardia_saliente_id`
  es **nullable**: el caso `NULL` es "Ausente sin relevo previo" (ver glosario en
  `CLAUDE.md`), el escenario de mayor riesgo porque el Paciente puede quedar sin nadie. RLS
  con el patrón OR-de-dos-EXISTS (uno para el caso con relevo previo, otro para el caso NULL)
  documentado como ejemplo oficial en `SECURITY.md`.
- **`configuracion_escalada_relevo`** — reglas de a quién y en qué orden escalar un incidente
  de relevo sin cobertura.
- **`excepciones_familiar_relevo`** — casos donde la Familia autoriza una excepción al
  protocolo estándar de relevo.
- **`guardias_tracking_gps`** — histórico de posiciones GPS durante una guardia activa (no solo
  el punto de checkin/checkout), ver nota Ley 25.326 en `SECURITY.md`.

**Ampliación 2026-07-12 (`backend/src/db/schema_modulo6_guardias_03.sql`)** — detección
automática de ausencia + alertas tempranas, diseñado con el Desarrollador el 2026-07-12 tras
probar Módulo 6 Parte 2 en navegador (ver `docs/PENDIENTES.md` #20). Dos tablas nuevas:

- **`configuracion_ausencia_automatica`** — un registro por prestadora (`prestadora_id`
  `PRIMARY KEY`), con `activo` (interruptor: una prestadora puede preferir seguir marcando
  ausente a mano) y `minutos_tolerancia_checkin` (margen desde `hora_inicio` sin `checkin_at`
  antes de marcar la guardia `ausente` sola). Reemplaza al botón manual "marcar ausente" de
  `GuardiaAcciones.jsx` como mecanismo **principal** — el botón queda como excepción/override.
- **`alertas_tempranas_guardia`** — señales previas a que la ausencia se concrete.
  `fuente` es `TEXT` libre **a propósito** (arquitectura enchufable: nuevas fuentes se suman
  sin migración de columnas ni rediseño de esta tabla) — hoy solo `'aviso_telefonico'` (el
  Asistente avisa que no concurre o llega tarde, con `motivo` de una lista fija para
  estadísticas: salud/transporte/familiar/otro). Fuente futura documentada pero no
  implementada: `'gps_salida_domicilio'` (depende de la PWA Asistentes, que no existe
  todavía). `resuelto_at`/`resuelto_nota` cuando el Coordinador la marca atendida. El envío
  automático de mensajes/llamadas de escalada **no** se implementa acá — depende de
  `docs/PRD_06_WhatsApp_IA.md` ("en discusión, no implementar todavía"); por ahora la alerta
  solo se hace visible en el Panel (`Continuidad.jsx`) para acción manual del Coordinador.

**Estado 2026-07-12:** las 8 tablas originales de Módulo 6 tienen rutas de Panel construidas
(`GuardiaAcciones.jsx`, `Continuidad.jsx`) — ver `docs/PROGRESS.md`. Las dos tablas nuevas de
esta ampliación tienen código de Panel/backend escrito pero **el DDL todavía no se aplicó
contra Supabase** — ver `docs/PENDIENTES.md` #20 para la condición de cierre.

Diseño original (pre-Módulo 6, mantenido acá solo como referencia histórica de las columnas
base que sí sobrevivieron a `guardias`):

```sql
CREATE TABLE guardias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asistente_id UUID REFERENCES asistentes(id),
  paciente_id UUID REFERENCES pacientes(id),
  coordinador_id UUID REFERENCES usuarios(id),
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  modalidad TEXT NOT NULL,   -- 6hs/8hs/12hs/24hs, diurna/nocturna — ver config, no hardcodear opciones
  estado TEXT DEFAULT 'programada', -- programada | activa | completada | ausente
  checkin_at TIMESTAMPTZ,
  checkin_lat DOUBLE PRECISION,
  checkin_lng DOUBLE PRECISION,
  checkout_at TIMESTAMPTZ,
  checkout_lat DOUBLE PRECISION,
  checkout_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Tabla: reportes (reporte diario, IA Nivel 1)

```sql
CREATE TABLE reportes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guardia_id UUID REFERENCES guardias(id),
  texto_libre TEXT,
  alimentacion JSONB,
  medicacion JSONB,
  signos_vitales JSONB,
  estado_animo TEXT,
  incidentes TEXT,
  observaciones TEXT,
  foto_url TEXT,
  ia_procesado BOOLEAN DEFAULT FALSE,
  confirmado_asistente BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Tabla: alertas (IA Nivel 2)

```sql
CREATE TABLE alertas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID REFERENCES pacientes(id),
  nivel TEXT CHECK (nivel IN ('verde','amarilla','roja')),
  descripcion TEXT,
  detalle_coordinador TEXT,
  campos_preocupantes TEXT[],
  resuelta BOOLEAN DEFAULT FALSE,
  resuelta_por UUID REFERENCES usuarios(id),
  resuelta_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Tabla: certificados

```sql
CREATE TABLE certificados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asistente_id UUID REFERENCES asistentes(id),
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Gestión de personal (PRD_02B) — vínculo laboral dual-track

```sql
CREATE TABLE escalas_legales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,       -- ver catálogo de tipos en PRD_02B_Gestion_Personal.md sección 4.2
  categoria TEXT,           -- ej: 'jornada_completa', '12_16hs_semana', nombre de una causal
  valor NUMERIC(14,4) NOT NULL,
  unidad TEXT NOT NULL,     -- 'monto_fijo_mensual' | 'porcentaje' | 'dias' | 'meses' | 'monto_por_hora'
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE,      -- NULL = vigente
  fuente TEXT,              -- referencia normativa (ej: "CCT 743/16 paritaria jul-2026")
  cargado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_escalas_tipo_vigencia ON escalas_legales (tipo, categoria, vigencia_desde);
```

Regla crítica (repetida de `CLAUDE.md` porque es la que más se rompe): toda consulta a
`escalas_legales` se hace por `vigencia_desde <= fecha_del_hecho` (y `vigencia_hasta IS NULL
OR vigencia_hasta >= fecha_del_hecho`), **nunca** por la fecha actual del sistema.

```sql
CREATE TABLE ausencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asistente_id UUID NOT NULL REFERENCES asistentes(id),
  tipo TEXT CHECK (tipo IN (
    'enfermedad_inculpable', 'accidente_inculpable', 'otra_licencia', 'ausencia_no_justificada'
  )),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,                 -- null mientras sigue en curso
  certificado_url TEXT,           -- Supabase Storage
  dias_computados NUMERIC(5,1),   -- consume el cupo anual de licencia paga
  guardias_afectadas UUID[],      -- referencias a guardias
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE guardias_cobertura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardia_original_id UUID NOT NULL REFERENCES guardias(id),
  ausencia_id UUID REFERENCES ausencias(id),
  asistente_sustituto_id UUID NOT NULL REFERENCES asistentes(id),
  costo_adicional NUMERIC(12,2),  -- costo del reemplazo, además de lo que se sigue pagando al titular
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Las 13 causales exactas de PRD_02B_Gestion_Personal.md sección 5.2 — no improvisar nombres
CREATE TYPE causal_cese AS ENUM (
  'renuncia', 'mutuo_acuerdo', 'despido_con_justa_causa', 'despido_sin_causa',
  'abandono_de_trabajo', 'muerte_del_trabajador', 'muerte_del_empleador',
  'muerte_persona_cuidada', 'periodo_de_prueba', 'incapacidad_absoluta',
  'jubilacion', 'despido_por_embarazo_o_matrimonio', 'fin_contrato_comercial'
);

CREATE TABLE ceses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asistente_id UUID NOT NULL REFERENCES asistentes(id),
  fecha_cese DATE NOT NULL,
  causal causal_cese NOT NULL,
  detalle_calculo JSONB,           -- desglose completo, ver PRD_02B sección 5.3
  monto_total NUMERIC(14,2),       -- NULL si la causal remite a cálculo manual del abogado
  documentos_generados JSONB,      -- rutas a PDFs generados (liquidación, telegrama, etc.)
  revisado_por_abogado BOOLEAN DEFAULT FALSE,
  creado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

`fecha_alta` y `tipo_vinculo` para el cálculo de antigüedad se leen de la tabla `asistentes`
(ver más arriba), no se duplican en `ceses`.

## Reclutamiento (PRD_03) — de `postulaciones` a `asistentes`

**Corrección (2026-07-09):** este documento describía originalmente un paso intermedio por
una tabla `aspirantes` (`postulaciones` → `aspirantes` → `asistentes`). Esa tabla se creó en
`schema_etapa2b.sql` pero ningún endpoint del backend llegó a leerla ni escribirla — el flujo
realmente implementado siempre fue directo, sin paso intermedio:

- `postulaciones` (Etapa 1, entrada cruda del formulario público del sitio web) — un
  Coordinador la revisa desde el Panel.
- Al aprobarla, `POST /api/panel/cuentas/asistente` (`backend/src/routes/panelCuentas.js`)
  crea el registro en `asistentes` directamente a partir de la `postulacion_id`, sin crear
  ningún registro intermedio.
- Las 5 etapas del Proceso de Incorporación de Asistentes se registran en
  `verificaciones_asistente`, contra `asistente_id` — no contra un aspirante.

La tabla `aspirantes` (y la columna `asistentes.aspirante_id` que la referenciaba) se
eliminaron en `schema_etapa2k.sql` por ser código muerto: quedaba vacía, con RLS que nadie
ejercitaba, y desalineaba la documentación del flujo real. Si en el futuro se necesita un
estado explícito "en evaluación, todavía no es Asistente" (por ejemplo al adoptar
`docs/prestadora-original_PRD_Reclutamiento_v1.pdf` en una futura Etapa 3), evaluar recrearla en ese
momento con el flujo real que se vaya a implementar, no reintroducir esta versión sin uso.

## Etapa 1 (Supabase/Postgres desde el día uno — sin paso intermedio por MySQL)

```sql
CREATE TABLE solicitudes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  email VARCHAR(100) NOT NULL,
  nombre_paciente VARCHAR(100),
  localidad VARCHAR(100) NOT NULL,
  tipo_servicio VARCHAR(100) NOT NULL,
  modalidad VARCHAR(50) NOT NULL,
  dias_horario VARCHAR(200) NOT NULL,
  descripcion TEXT,
  canal VARCHAR(50) DEFAULT 'web',
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE postulaciones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  email VARCHAR(100) NOT NULL,
  especialidades TEXT NOT NULL,
  zonas TEXT NOT NULL,
  disponibilidad TEXT NOT NULL,
  anios_experiencia VARCHAR(20),
  situacion_fiscal VARCHAR(50) NOT NULL,
  como_conocio VARCHAR(100),
  mensaje TEXT,
  estado VARCHAR(30) DEFAULT 'pendiente',
  canal VARCHAR(50) DEFAULT 'web',
  creado_en TIMESTAMPTZ DEFAULT now()
);
```

RLS activada desde la creación de ambas tablas (regla 8 de `CLAUDE.md`); el backend Express
escribe con la Service Role Key (bypassea RLS por ser server-only), sin policies públicas de
lectura/escritura. En Etapa 2, `postulaciones` sigue siendo la tabla de entrada cruda del
formulario público; cuando un Coordinador la aprueba, se crea directamente el registro de
`asistentes` (ver sección "Reclutamiento (PRD_03)" arriba) — ya no hay migración de motor de
base de datos de por medio.

## Diagrama de relaciones (resumen)

```
prestadoras (tenant — prestadora-original es la primera)
  └── prestadora_id NOT NULL en: usuarios, asistentes, ausencias, guardias_cobertura, ceses,
      familias, pacientes, lista_precios, prestaciones, paquetes_prestaciones,
      paquete_prestacion_items, certificados, zonas_cobertura, solicitudes, postulaciones
      (DEFAULT temporal a prestadora-original todavía activo en estas 14 — ver deuda técnica arriba)

usuarios (superadmin, admin_prestadora, coordinador)
  ├── asistentes ── verificaciones_asistente, validaciones_faciales, certificados
  ├── familias ── pacientes
  ├── guardias (Módulo 6, ver sección propia arriba) ── series_guardias,
  │       domicilios_temporales_paciente, personal_emergencia, incidentes_relevo,
  │       configuracion_escalada_relevo, excepciones_familiar_relevo, guardias_tracking_gps
  │       ├── reportes (1:1 con guardia)
  │       └── (paciente_id) → alertas (N reportes → 1 análisis IA)
  ├── ausencias ── guardias_cobertura
  ├── ceses
  ├── escalas_legales (independiente, versionado por fecha)
  └── lista_precios ── prestaciones ── paquetes_prestaciones ── paquete_prestacion_items
      (Módulo 8, ver `docs/CONTEXT.md`; zonas_cobertura independiente, sin RLS de zona
      derivada todavía — ver `SECURITY.md`)

postulaciones (Etapa 1, independiente) → asistentes (directo, sin tabla intermedia — ver
  sección "Reclutamiento (PRD_03)" arriba)
```

## Gap sin resolver: modelo de pagos

Ningún PRD original define tablas de pago/facturación a familias (ver `CONTEXT.md`,
sección de gap). Si se decide construirlo, `Prompt de Money Suite.md` tiene un diseño de
referencia completo (`payment_status` enum `captured/held/released/disputed`, integración
Mercado Pago) que puede usarse como punto de partida técnico — pero requiere aprobación de
negocio antes de implementarse, no está en el alcance de ninguna etapa de `BUILD_ORDER.md`
todavía.
