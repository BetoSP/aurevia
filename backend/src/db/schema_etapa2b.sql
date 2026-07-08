-- Etapa 2B (Gestión de Personal, extiende Módulo 4 del Panel) — ver
-- docs/PRD_02B_Gestion_Personal.md y docs/DATA_MODEL.md.
-- Ejecutar una sola vez en el SQL Editor de Supabase, sobre la misma base de Etapa 1/2.
--
-- Este archivo crea, en orden de dependencia: aspirantes (PRD_03, pre-Asistentes),
-- asistentes (base + extensión dual-track de PRD_02B), verificaciones_asistente
-- (Filtro prestadora-original), y las 4 tablas propias de Gestión de Personal (escalas_legales,
-- ausencias, guardias_cobertura, ceses). asistentes no existía todavía — Módulo 4 es
-- el primer módulo que la necesita.

-- ============================================================================
-- ASPIRANTES (PRD_03 — pre-Asistentes, no confundir con postulaciones crudas del sitio)
-- ============================================================================
CREATE TABLE IF NOT EXISTS aspirantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postulacion_id BIGINT REFERENCES postulaciones(id),
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT NOT NULL,
  especialidades TEXT[] NOT NULL,
  zonas TEXT[] NOT NULL,
  disponibilidad JSONB NOT NULL,
  anios_experiencia SMALLINT,
  situacion_fiscal TEXT NOT NULL,
  como_conocio TEXT,
  mensaje TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_revision', 'aprobado', 'rechazado')),
  canal TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE aspirantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_lee_aspirantes" ON aspirantes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

CREATE POLICY "panel_edita_aspirantes" ON aspirantes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

-- ============================================================================
-- ASISTENTES (base, ver docs/DATA_MODEL.md tabla "asistentes")
-- ============================================================================
CREATE TABLE IF NOT EXISTS asistentes (
  id UUID REFERENCES usuarios(id) PRIMARY KEY,
  aspirante_id UUID REFERENCES aspirantes(id),
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  foto_url TEXT,
  especialidades TEXT[],
  zonas TEXT[],
  disponibilidad JSONB,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'cesado')),
  qr_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  -- Extensión de PRD_02B_Gestion_Personal.md — vínculo laboral dual-track
  tipo_vinculo TEXT NOT NULL DEFAULT 'monotributo' CHECK (tipo_vinculo IN ('monotributo', 'dependencia')),
  categoria_cct TEXT,
  fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_baja DATE,
  causal_baja TEXT,
  valor_hora NUMERIC(12,2),
  sueldo_basico NUMERIC(12,2),
  horas_semanales NUMERIC(5,2),
  vencimiento_monotributo DATE,
  vencimiento_art DATE,
  vencimiento_seguro DATE,
  score_riesgo_reclasificacion INTEGER NOT NULL DEFAULT 0 CHECK (score_riesgo_reclasificacion BETWEEN 0 AND 100),
  indicadores_riesgo JSONB NOT NULL DEFAULT '{}'::jsonb, -- inputs 0-1 por indicador, ver calcularScoreRiesgo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE asistentes ENABLE ROW LEVEL SECURITY;

-- No consultar "usuarios" recursivamente sobre sí misma (ver nota de schema_etapa2.sql);
-- acá no hay problema porque la policy vive en la tabla "asistentes", no en "usuarios".
CREATE POLICY "panel_lee_asistentes" ON asistentes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

CREATE POLICY "panel_edita_asistentes" ON asistentes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin')
  );

-- Coordinador puede actualizar datos operativos (especialidades/zonas/disponibilidad/estado)
-- pero no el vínculo laboral ni los montos — se controla a nivel de columnas desde el
-- frontend (Coordinador no ve esos campos en la UI); la policy de UPDATE de fila completa
-- para Coordinador se deja para cuando el dato de zona esté modelado (ver deuda técnica).

-- ============================================================================
-- VERIFICACIONES_ASISTENTE (El Filtro prestadora-original — 5 etapas)
-- ============================================================================
CREATE TYPE etapa_filtro AS ENUM (
  'postulacion', 'verificacion_identidad', 'antecedentes_penales', 'entrevista', 'capacitacion'
);

CREATE TABLE IF NOT EXISTS verificaciones_asistente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asistente_id UUID NOT NULL REFERENCES asistentes(id) ON DELETE CASCADE,
  etapa etapa_filtro NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  notas TEXT,
  revisado_por UUID REFERENCES usuarios(id),
  documento_url TEXT,
  referencia_externa VARCHAR(200),
  completado_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verif_asistente ON verificaciones_asistente (asistente_id);

ALTER TABLE verificaciones_asistente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_verificaciones" ON verificaciones_asistente
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

-- ============================================================================
-- ESCALAS_LEGALES (versionado por fecha, nunca hardcodear valores legales — regla 10)
-- ============================================================================
CREATE TABLE IF NOT EXISTS escalas_legales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  categoria TEXT,
  valor NUMERIC(14,4) NOT NULL,
  unidad TEXT NOT NULL CHECK (unidad IN ('monto_fijo_mensual', 'porcentaje', 'dias', 'meses', 'monto_por_hora')),
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE,
  fuente TEXT,
  cargado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalas_tipo_vigencia ON escalas_legales (tipo, categoria, vigencia_desde);

ALTER TABLE escalas_legales ENABLE ROW LEVEL SECURITY;

-- Nunca visible para asistente/familia (regla 8 de CLAUDE.md); Coordinador tampoco
-- (ver SECURITY.md: montos y causales son datos sensibles). Solo admin.
CREATE POLICY "admin_gestiona_escalas_legales" ON escalas_legales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin')
  );

-- Seed inicial — PLACEHOLDER, pendiente de validación por el abogado laboralista
-- (Fase 0 de BUILD_ORDER.md). No usar para calcular un cese real sin confirmar estos
-- valores contra la normativa vigente a la fecha real del hecho.
INSERT INTO escalas_legales (tipo, categoria, valor, unidad, vigencia_desde, fuente) VALUES
  ('preaviso_dias', 'menos_1_anio', 10, 'dias', '2026-01-01', 'PLACEHOLDER — validar con abogado laboralista'),
  ('preaviso_dias', 'mas_1_anio', 30, 'dias', '2026-01-01', 'PLACEHOLDER — validar con abogado laboralista'),
  ('periodo_prueba_dias', 'general', 90, 'dias', '2026-01-01', 'PLACEHOLDER — validar con abogado laboralista'),
  ('indemnizacion_antiguedad', 'meses_por_anio', 1, 'meses', '2026-01-01', 'PLACEHOLDER — validar con abogado laboralista'),
  ('tope_indemnizatorio', 'general', 3000000, 'monto_fijo_mensual', '2026-01-01', 'PLACEHOLDER — validar con abogado laboralista'),
  ('multiplicador_agravado', 'embarazo_matrimonio', 13, 'meses', '2026-01-01', 'PLACEHOLDER — validar con abogado laboralista (art. 178/182 LCT: 1 año de remuneraciones)'),
  ('tope_licencia_paga_dias', 'antiguedad_menor_5_anios', 90, 'dias', '2026-01-01', 'PLACEHOLDER — validar con abogado laboralista'),
  ('tope_licencia_paga_dias', 'antiguedad_mayor_5_anios', 180, 'dias', '2026-01-01', 'PLACEHOLDER — validar con abogado laboralista'),
  ('indicador_riesgo_dependencia', 'exclusividad_facturacion', 20, 'porcentaje', '2026-01-01', 'Peso relativo del indicador, sobre 100 — PLACEHOLDER'),
  ('indicador_riesgo_dependencia', 'antiguedad_vinculo', 10, 'porcentaje', '2026-01-01', 'Peso relativo del indicador, sobre 100 — PLACEHOLDER'),
  ('indicador_riesgo_dependencia', 'horas_semanales_promedio', 20, 'porcentaje', '2026-01-01', 'Peso relativo del indicador, sobre 100 — PLACEHOLDER'),
  ('indicador_riesgo_dependencia', 'herramientas_provistas', 10, 'porcentaje', '2026-01-01', 'Peso relativo del indicador, sobre 100 — PLACEHOLDER'),
  ('indicador_riesgo_dependencia', 'horario_fijo_impuesto', 15, 'porcentaje', '2026-01-01', 'Peso relativo del indicador, sobre 100 — PLACEHOLDER'),
  ('indicador_riesgo_dependencia', 'exclusividad_zona', 10, 'porcentaje', '2026-01-01', 'Peso relativo del indicador, sobre 100 — PLACEHOLDER'),
  ('indicador_riesgo_dependencia', 'supervision_directa', 15, 'porcentaje', '2026-01-01', 'Peso relativo del indicador, sobre 100 — PLACEHOLDER');

-- ============================================================================
-- AUSENCIAS + GUARDIAS_COBERTURA
-- ============================================================================
CREATE TABLE IF NOT EXISTS ausencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asistente_id UUID NOT NULL REFERENCES asistentes(id),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'enfermedad_inculpable', 'accidente_inculpable', 'otra_licencia', 'ausencia_no_justificada'
  )),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  certificado_url TEXT,
  dias_computados NUMERIC(5,1),
  guardias_afectadas UUID[],
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ausencias ENABLE ROW LEVEL SECURITY;

-- Nunca visible para asistente/familia (regla 8 de CLAUDE.md / SECURITY.md)
CREATE POLICY "panel_gestiona_ausencias" ON ausencias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

CREATE TABLE IF NOT EXISTS guardias_cobertura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardia_original_id UUID,
  ausencia_id UUID REFERENCES ausencias(id),
  asistente_sustituto_id UUID NOT NULL REFERENCES asistentes(id),
  costo_adicional NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Nota: guardia_original_id no lleva FK a "guardias" todavía — esa tabla se crea recién
-- en Etapa 3 (PWA Asistentes). Se agrega la referencia formal cuando exista.

ALTER TABLE guardias_cobertura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_guardias_cobertura" ON guardias_cobertura
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

-- ============================================================================
-- CESES
-- ============================================================================
CREATE TYPE causal_cese AS ENUM (
  'renuncia', 'mutuo_acuerdo', 'despido_con_justa_causa', 'despido_sin_causa',
  'abandono_de_trabajo', 'muerte_del_trabajador', 'muerte_del_empleador',
  'muerte_persona_cuidada', 'periodo_de_prueba', 'incapacidad_absoluta',
  'jubilacion', 'despido_por_embarazo_o_matrimonio', 'fin_contrato_comercial'
);

CREATE TABLE IF NOT EXISTS ceses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asistente_id UUID NOT NULL REFERENCES asistentes(id),
  fecha_cese DATE NOT NULL,
  causal causal_cese NOT NULL,
  detalle_calculo JSONB,
  monto_total NUMERIC(14,2),
  documentos_generados JSONB,
  revisado_por_abogado BOOLEAN NOT NULL DEFAULT FALSE,
  creado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ceses ENABLE ROW LEVEL SECURITY;

-- Solo admin — montos y causales de cese son datos sensibles (ver SECURITY.md),
-- nunca visibles para coordinador/asistente/familia.
CREATE POLICY "admin_gestiona_ceses" ON ceses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin')
  );
