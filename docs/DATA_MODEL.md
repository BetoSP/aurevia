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

## Tabla: usuarios

Extiende `auth.users` de Supabase.

```sql
CREATE TABLE usuarios (
  id UUID REFERENCES auth.users PRIMARY KEY,
  rol TEXT CHECK (rol IN ('admin','coordinador','asistente','familia')),
  nombre TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

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
  prestadora_id UUID REFERENCES prestadoras(id),  -- nullable, soporte futuro modelo B2B
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
cada etapa del Filtro prestadora-original individualmente (patrón adoptado de Money Suite, tabla
`verification_records`, adaptado a la terminología y a las 5 etapas oficiales del Filtro
prestadora-original en vez de sus 8 etapas genéricas).

`prestadora_id` es la recomendación de `prestadora-original_Modelo_B2B_v1.md`: agregar el campo ahora
(costo bajo) para evitar una migración cara cuando el modelo B2B se active. La tabla
`prestadoras` no se crea todavía — es un placeholder de FK para el futuro, dejar comentado
o crear la tabla vacía solo cuando el modelo B2B pase de exploración a ejecución.

## Tabla: verificaciones_asistente (El Filtro prestadora-original — 5 etapas)

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

## Tabla: guardias

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
- Las 5 etapas del Proceso de Incorporación de Asistentes (Filtro prestadora-original) se registran en
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
usuarios (admin, coordinador)
  ├── asistentes ── verificaciones_asistente, validaciones_faciales, certificados
  │                  └── prestadora_id (nullable, futuro B2B)
  ├── familias ── pacientes
  ├── guardias ── (asistente_id, paciente_id, coordinador_id)
  │       ├── reportes (1:1 con guardia)
  │       └── (paciente_id) → alertas (N reportes → 1 análisis IA)
  ├── ausencias ── guardias_cobertura
  ├── ceses
  └── escalas_legales (independiente, versionado por fecha)

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
