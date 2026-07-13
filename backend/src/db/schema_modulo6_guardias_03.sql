-- Módulo 6 — Guardias, Parte 2 (continuación): detección automática de ausencia +
-- alertas tempranas extensibles, diseñado con el Desarrollador el 2026-07-12
-- (ver docs/PENDIENTES.md #20, docs/PRD_04_05_App_Servicio.md sección "Alertas tempranas
-- de ausencia"). Ejecutar una sola vez en el SQL Editor de Supabase, sobre la base ya
-- migrada por schema_modulo6_guardias.sql y schema_modulo6_guardias_02.sql.
--
-- Alcance de esta parte: (1) detección automática de ausencia (reemplaza al botón manual
-- "marcar ausente" como mecanismo principal, el botón queda como excepción/override) y
-- (2) alertas tempranas, previas a la ausencia confirmada, con arquitectura "enchufable"
-- (columna `fuente` en texto libre, no un enum cerrado) para poder sumar fuentes nuevas
-- en el futuro (ej. GPS de salida del domicilio, cuando exista la PWA de Asistentes) sin
-- rediseñar la tabla. El envío automático de mensajes/llamadas de la escalada temprana NO
-- se implementa acá — depende de docs/PRD_06_WhatsApp_IA.md, marcado explícitamente
-- "en discusión, no implementar todavía"; por ahora la alerta solo se hace visible en el
-- Panel para que el Coordinador actúe manualmente.

-- ============================================================================
-- 1. CONFIGURACION_AUSENCIA_AUTOMATICA — margen de tolerancia por prestadora, con
--    interruptor propio (una prestadora puede preferir seguir marcando ausente a mano).
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracion_ausencia_automatica (
  prestadora_id UUID PRIMARY KEY REFERENCES prestadoras(id),
  activo BOOLEAN NOT NULL DEFAULT true,
  minutos_tolerancia_checkin INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE configuracion_ausencia_automatica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestiona_configuracion_ausencia_automatica" ON configuracion_ausencia_automatica
  FOR ALL USING (
    es_superadmin() OR (
      configuracion_ausencia_automatica.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_lee_configuracion_ausencia_automatica" ON configuracion_ausencia_automatica
  FOR SELECT USING (
    configuracion_ausencia_automatica.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
  );

-- Seed para prestadora-original (única prestadora real hoy, mismo UUID fijo que db/tenantTemporal.js)
-- con el valor por defecto de la columna — sin esta fila, el cron de ausencia automática
-- no tiene nada que revisar para prestadora-original.
INSERT INTO configuracion_ausencia_automatica (prestadora_id)
VALUES ('874f54d7-4383-4d54-8b9f-f51d02f0dd11')
ON CONFLICT (prestadora_id) DO NOTHING;

-- ============================================================================
-- 2. ALERTAS_TEMPRANAS_GUARDIA — señales previas a que la ausencia se concrete.
--    `fuente` es TEXT libre a propósito (arquitectura enchufable): hoy el único valor
--    que la aplicación conoce es 'aviso_telefonico' (el Asistente llama avisando que no
--    concurre o llega tarde, con un motivo de una lista fija para estadísticas); fuentes
--    futuras (ej. 'gps_salida_domicilio') se suman sin migración de columnas.
-- ============================================================================

CREATE TABLE IF NOT EXISTS alertas_tempranas_guardia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  guardia_id UUID NOT NULL,
  fuente TEXT NOT NULL,
  motivo TEXT,
  reportado_por UUID REFERENCES usuarios(id),
  detectado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resuelto_at TIMESTAMPTZ,
  resuelto_nota TEXT,

  CONSTRAINT alertas_tempranas_guardia_guardia_tenant_fk
    FOREIGN KEY (guardia_id, prestadora_id) REFERENCES guardias (id, prestadora_id)
);

CREATE INDEX IF NOT EXISTS idx_alertas_tempranas_guardia_guardia ON alertas_tempranas_guardia (guardia_id);

ALTER TABLE alertas_tempranas_guardia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_alertas_tempranas_guardia" ON alertas_tempranas_guardia
  FOR ALL USING (
    es_superadmin() OR (
      alertas_tempranas_guardia.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_gestiona_alertas_tempranas_guardia_de_su_zona" ON alertas_tempranas_guardia
  FOR ALL USING (
    alertas_tempranas_guardia.prestadora_id = current_tenant()
    AND EXISTS (
      SELECT 1 FROM usuarios u
      JOIN guardias g ON g.id = alertas_tempranas_guardia.guardia_id
      JOIN asistentes a ON a.id = g.asistente_id
      WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && a.zonas
    )
  );
