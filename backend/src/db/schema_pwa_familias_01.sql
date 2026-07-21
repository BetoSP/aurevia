-- Etapa 4 (PWA Familias) — docs/PRD_04_05_App_Servicio.md:117-157. Habilita el acceso de
-- solo lectura del rol `familia` a las tablas que ya existen (pacientes/guardias/asistentes/
-- certificados), agrega tracking de ubicación en vivo durante una guardia activa (para el
-- mapa en tiempo real de la pantalla del Paciente, vía Supabase Realtime), generaliza
-- push_subscriptions para admitir también a la Familia (hasta ahora solo Asistentes, ver
-- schema_push_notificaciones_01.sql), y agrega la configuración por Prestadora de palabras
-- clave para el análisis inmediato de IA Nivel 2 (docs/AI_PROMPTS.md — "lista de palabras
-- clave: definir en configuración, no hardcodear"). Ejecutar una sola vez en el SQL Editor
-- de Supabase.

-- ============================================================================
-- 1. PACIENTES — la Familia ve sus propios Pacientes (mismo criterio que
--    familia_ve_su_propia_fila en familias, schema_etapa2c.sql).
-- ============================================================================

CREATE POLICY "familia_ve_sus_pacientes" ON pacientes
  FOR SELECT USING (
    pacientes.prestadora_id = current_tenant()
    AND familia_id = auth.uid()
  );

-- ============================================================================
-- 2. GUARDIAS — la Familia ve las guardias de sus propios Pacientes (guardia actual/próxima,
--    Reportes, historial). Incluye columnas nuevas de ubicación en vivo, actualizadas por el
--    Asistente durante el trayecto de una guardia activa (distinto de checkin_lat/lng, que
--    es un punto fijo al llegar) — leídas por la Familia vía Supabase Realtime, nunca a
--    través del backend (evita el costo de un polling HTTP para algo que cambia cada pocos
--    segundos).
-- ============================================================================

ALTER TABLE guardias ADD COLUMN IF NOT EXISTS ubicacion_actual_lat DOUBLE PRECISION;
ALTER TABLE guardias ADD COLUMN IF NOT EXISTS ubicacion_actual_lng DOUBLE PRECISION;
ALTER TABLE guardias ADD COLUMN IF NOT EXISTS ubicacion_actual_at TIMESTAMPTZ;

CREATE POLICY "familia_ve_guardias_de_sus_pacientes" ON guardias
  FOR SELECT USING (
    guardias.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = guardias.paciente_id AND p.familia_id = auth.uid())
  );

-- ============================================================================
-- 3. ASISTENTES — la Familia ve únicamente al/los Asistente(s) que tuvieron o tienen una
--    guardia asignada a alguno de sus Pacientes (nunca la nómina completa de la Prestadora —
--    mismo criterio de acotamiento ya usado para Coordinador por zona).
-- ============================================================================

CREATE POLICY "familia_ve_asistente_asignado" ON asistentes
  FOR SELECT USING (
    asistentes.prestadora_id = current_tenant()
    AND EXISTS (
      SELECT 1 FROM guardias g
      JOIN pacientes p ON p.id = g.paciente_id
      WHERE g.asistente_id = asistentes.id AND p.familia_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. CERTIFICADOS — mismo criterio de acotamiento (solo el/los Asistente(s) asignados) para
--    mostrar el estado del Certificado de Aptitud en la pantalla "Asistente Asignado". La
--    ficha pública con QR es Etapa 6, todavía no construida — acá solo se lee el estado.
-- ============================================================================

CREATE POLICY "familia_ve_certificado_asistente_asignado" ON certificados
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guardias g
      JOIN pacientes p ON p.id = g.paciente_id
      WHERE g.asistente_id = certificados.asistente_id AND p.familia_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. PUSH_SUBSCRIPTIONS — generalizado para admitir Familia además de Asistente. Antes tenía
--    asistente_id NOT NULL; pasa a nullable + familia_id nuevo, con CHECK de que se use
--    exactamente uno de los dos (nunca ambos, nunca ninguno) — mismo principio de
--    "configuración sobre programación", una tabla para las dos audiencias en vez de
--    duplicar toda la infraestructura de push.
-- ============================================================================

ALTER TABLE push_subscriptions ALTER COLUMN asistente_id DROP NOT NULL;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS familia_id UUID REFERENCES familias(id) ON DELETE CASCADE;
ALTER TABLE push_subscriptions
  ADD CONSTRAINT push_subscriptions_una_audiencia
  CHECK ((asistente_id IS NOT NULL) <> (familia_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_familia ON push_subscriptions (familia_id);

CREATE POLICY "familia_gestiona_sus_push_subscriptions" ON push_subscriptions
  FOR ALL USING (familia_id = auth.uid())
  WITH CHECK (familia_id = auth.uid());

-- Control de envío único por evento del lado de la Familia — llegada del Asistente al
-- domicilio (push inmediato al check-in) y reporte diario confirmado (push al check-out).
ALTER TABLE guardias ADD COLUMN IF NOT EXISTS push_llegada_enviado_at TIMESTAMPTZ;
ALTER TABLE guardias ADD COLUMN IF NOT EXISTS push_reporte_enviado_at TIMESTAMPTZ;

-- ============================================================================
-- 6. IA Nivel 2 (alertas por patrones, docs/AI_PROMPTS.md) — configuración de palabras clave
--    por Prestadora para el análisis inmediato ("Análisis diario automático + análisis
--    inmediato si el reporte contiene palabras clave críticas — lista de palabras clave:
--    definir en configuración, no hardcodear"). Sin default global: cada Prestadora carga
--    las suyas desde Configuración (Panel); sin fila configurada, el análisis inmediato no
--    se dispara — el análisis nocturno diario sigue corriendo igual.
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracion_alertas_ia (
  prestadora_id UUID PRIMARY KEY REFERENCES prestadoras(id),
  palabras_clave TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE configuracion_alertas_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestiona_configuracion_alertas_ia" ON configuracion_alertas_ia
  FOR ALL USING (
    prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
  );

CREATE POLICY "coordinador_lee_configuracion_alertas_ia" ON configuracion_alertas_ia
  FOR SELECT USING (
    prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
  );

-- Tracking del análisis nocturno: cuándo fue la última corrida de IA Nivel 2 para este
-- Paciente, para no reanalizar si no hay reportes nuevos desde entonces.
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS ultimo_analisis_ia_at TIMESTAMPTZ;

-- Enlace de una alerta a los Reportes que la originaron (IA Nivel 2 analiza los últimos N
-- reportes, no uno solo — ver docs/AI_PROMPTS.md), para que la pantalla de Alertas de la
-- Familia pueda linkear a los reportes de origen (PRD_04_05_App_Servicio.md:76).
ALTER TABLE alertas ADD COLUMN IF NOT EXISTS reportes_relacionados UUID[];

NOTIFY pgrst, 'reload schema';
