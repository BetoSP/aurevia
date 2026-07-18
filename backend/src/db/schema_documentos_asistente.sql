-- Pendiente #18 (docs/PENDIENTES.md), punto 1 — el catálogo de documentos con vencimiento que
-- se sigue de un Asistente (hasta ahora fijo: Monotributo, ART, Seguro) pasa a ser configurable
-- por prestadora, sin límite de cantidad, e incluye "Certificado de Antecedentes Penales" como
-- opción sugerida. Reemplaza las columnas fijas vencimiento_monotributo/art/seguro de
-- "asistentes" (schema_etapa2b.sql:70-72) y el arreglo fijo CAMPOS_VENCIMIENTO de
-- backend/src/utils/vencimientos.js.

-- ============================================================================
-- 1. Catálogo de tipos de documento, por prestadora — el prestador decide qué mira y agrega
--    tantos como necesite; "requiere_vencimiento" distingue un documento con fecha de
--    vencimiento a trackear de uno meramente informativo.
-- ============================================================================
CREATE TABLE IF NOT EXISTS tipos_documento_asistente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  nombre TEXT NOT NULL,
  requiere_vencimiento BOOLEAN NOT NULL DEFAULT true,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id, prestadora_id),
  UNIQUE (prestadora_id, nombre)
);

ALTER TABLE tipos_documento_asistente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_prestadora_gestiona_tipos_documento" ON tipos_documento_asistente
  FOR ALL USING (
    es_superadmin() OR (
      prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_lee_tipos_documento" ON tipos_documento_asistente
  FOR SELECT USING (
    prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
  );

-- ============================================================================
-- 2. Documento por Asistente — reemplaza las columnas fijas de vencimiento. Dato laboral
--    interno sensible (regla 8 de CLAUDE.md, mismo criterio que se aplicaba antes a
--    vencimiento_monotributo/art/seguro): Coordinador solo lee dentro de su zona, nunca
--    escribe — no hace falta un trigger de bloqueo de columna como en asistentes, alcanza con
--    no darle policy de escritura.
-- ============================================================================
CREATE TABLE IF NOT EXISTS documentos_asistente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  asistente_id UUID NOT NULL REFERENCES asistentes(id) ON DELETE CASCADE,
  tipo_documento_id UUID NOT NULL,
  fecha_vencimiento DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (tipo_documento_id, prestadora_id) REFERENCES tipos_documento_asistente (id, prestadora_id),
  UNIQUE (asistente_id, tipo_documento_id)
);

ALTER TABLE documentos_asistente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_prestadora_gestiona_documentos_asistente" ON documentos_asistente
  FOR ALL USING (
    es_superadmin() OR (
      prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_lee_documentos_asistente_de_su_zona" ON documentos_asistente
  FOR SELECT USING (
    prestadora_id = current_tenant()
    AND EXISTS (
      SELECT 1 FROM usuarios u
      JOIN asistentes a ON a.id = documentos_asistente.asistente_id
      WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && a.zonas
    )
  );

-- ============================================================================
-- 3. Plazo de aviso configurable por prestadora (antes 30 días fijo en vencimientos.js)
-- ============================================================================
ALTER TABLE prestadoras ADD COLUMN IF NOT EXISTS dias_aviso_vencimiento_documentos SMALLINT NOT NULL DEFAULT 30;

-- ============================================================================
-- 4. Seed del catálogo sugerido (editable/eliminable por cada prestadora) + migración de los
--    valores existentes de las columnas fijas a filas de documentos_asistente.
-- ============================================================================
DO $$
DECLARE
  p RECORD;
  tipo_monotributo UUID;
  tipo_art UUID;
  tipo_seguro UUID;
BEGIN
  FOR p IN SELECT id FROM prestadoras LOOP
    INSERT INTO tipos_documento_asistente (prestadora_id, nombre, requiere_vencimiento)
    VALUES (p.id, 'Monotributo', true)
    ON CONFLICT (prestadora_id, nombre) DO NOTHING
    RETURNING id INTO tipo_monotributo;
    IF tipo_monotributo IS NULL THEN
      SELECT id INTO tipo_monotributo FROM tipos_documento_asistente WHERE prestadora_id = p.id AND nombre = 'Monotributo';
    END IF;

    INSERT INTO tipos_documento_asistente (prestadora_id, nombre, requiere_vencimiento)
    VALUES (p.id, 'ART', true)
    ON CONFLICT (prestadora_id, nombre) DO NOTHING
    RETURNING id INTO tipo_art;
    IF tipo_art IS NULL THEN
      SELECT id INTO tipo_art FROM tipos_documento_asistente WHERE prestadora_id = p.id AND nombre = 'ART';
    END IF;

    INSERT INTO tipos_documento_asistente (prestadora_id, nombre, requiere_vencimiento)
    VALUES (p.id, 'Seguro', true)
    ON CONFLICT (prestadora_id, nombre) DO NOTHING
    RETURNING id INTO tipo_seguro;
    IF tipo_seguro IS NULL THEN
      SELECT id INTO tipo_seguro FROM tipos_documento_asistente WHERE prestadora_id = p.id AND nombre = 'Seguro';
    END IF;

    INSERT INTO tipos_documento_asistente (prestadora_id, nombre, requiere_vencimiento)
    VALUES (p.id, 'Certificado de Antecedentes Penales', true)
    ON CONFLICT (prestadora_id, nombre) DO NOTHING;

    INSERT INTO documentos_asistente (prestadora_id, asistente_id, tipo_documento_id, fecha_vencimiento)
    SELECT p.id, a.id, tipo_monotributo, a.vencimiento_monotributo
    FROM asistentes a WHERE a.prestadora_id = p.id AND a.vencimiento_monotributo IS NOT NULL
    ON CONFLICT (asistente_id, tipo_documento_id) DO NOTHING;

    INSERT INTO documentos_asistente (prestadora_id, asistente_id, tipo_documento_id, fecha_vencimiento)
    SELECT p.id, a.id, tipo_art, a.vencimiento_art
    FROM asistentes a WHERE a.prestadora_id = p.id AND a.vencimiento_art IS NOT NULL
    ON CONFLICT (asistente_id, tipo_documento_id) DO NOTHING;

    INSERT INTO documentos_asistente (prestadora_id, asistente_id, tipo_documento_id, fecha_vencimiento)
    SELECT p.id, a.id, tipo_seguro, a.vencimiento_seguro
    FROM asistentes a WHERE a.prestadora_id = p.id AND a.vencimiento_seguro IS NOT NULL
    ON CONFLICT (asistente_id, tipo_documento_id) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================================
-- 5. Columnas fijas ya migradas — se eliminan
-- ============================================================================
ALTER TABLE asistentes DROP COLUMN IF EXISTS vencimiento_monotributo;
ALTER TABLE asistentes DROP COLUMN IF EXISTS vencimiento_art;
ALTER TABLE asistentes DROP COLUMN IF EXISTS vencimiento_seguro;

-- ============================================================================
-- 6. Trigger de bloqueo de columnas laborales (schema_etapa2j.sql) — se reescribe sin las 3
--    columnas eliminadas; el resto de la protección queda igual.
-- ============================================================================
-- SET search_path fijo (2026-07-18): sin esto, un caller SECURITY DEFINER podría
-- manipular el search_path de su sesión para resolver "usuarios" contra un schema propio.
CREATE OR REPLACE FUNCTION bloquear_edicion_laboral_coordinador()
RETURNS TRIGGER AS $$
DECLARE
  rol_actual TEXT;
BEGIN
  SELECT rol INTO rol_actual FROM usuarios WHERE id = auth.uid();

  IF rol_actual = 'coordinador' THEN
    IF NEW.tipo_vinculo IS DISTINCT FROM OLD.tipo_vinculo
      OR NEW.categoria_cct IS DISTINCT FROM OLD.categoria_cct
      OR NEW.valor_hora IS DISTINCT FROM OLD.valor_hora
      OR NEW.sueldo_basico IS DISTINCT FROM OLD.sueldo_basico
      OR NEW.horas_semanales IS DISTINCT FROM OLD.horas_semanales
      OR NEW.causal_baja IS DISTINCT FROM OLD.causal_baja
      OR NEW.fecha_baja IS DISTINCT FROM OLD.fecha_baja
      OR NEW.score_riesgo_reclasificacion IS DISTINCT FROM OLD.score_riesgo_reclasificacion
      OR NEW.indicadores_riesgo IS DISTINCT FROM OLD.indicadores_riesgo
    THEN
      RAISE EXCEPTION 'Coordinador no puede modificar datos laborales internos del Asistente (regla 8 de CLAUDE.md)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Pendiente #52 (docs/PENDIENTES.md): revocado EXECUTE de PUBLIC (heredado por
-- anon/authenticated) — es un trigger, uso exclusivo interno, sin caso de uso legítimo
-- por RPC directo.
REVOKE EXECUTE ON FUNCTION bloquear_edicion_laboral_coordinador() FROM PUBLIC;

-- ============================================================================
-- 7. configuracion_notificaciones — los 3 eventos fijos por documento se reemplazan por uno
--    genérico, ya que el catálogo de documentos ahora es dinámico por prestadora.
-- ============================================================================
DELETE FROM configuracion_notificaciones
WHERE evento IN ('vencimiento_monotributo', 'vencimiento_art', 'vencimiento_seguro');

INSERT INTO configuracion_notificaciones (evento, prestadora_id, descripcion, emails)
SELECT 'vencimiento_documento_asistente', id,
       'Documento de un Asistente vencido o por vencer, según el catálogo y el plazo de aviso configurados por la prestadora',
       '{}'
FROM prestadoras
ON CONFLICT (evento, prestadora_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
