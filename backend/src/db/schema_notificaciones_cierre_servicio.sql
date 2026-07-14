-- Notificación cruzada de cierre de servicio fuera de zona (2026-07-14, ver
-- docs/PENDIENTES.md #32 y schema_cierre_servicio_zona_fix.sql). Diseño aprobado por el
-- Desarrollador: cuando un Coordinador cierra el servicio de un Paciente atendido por un
-- Asistente fuera de su propia zona, el/los Coordinador/es cuya zona sí corresponde a ese
-- Asistente reciben esta notificación con todos los datos de la acción, incluida la causa.
--
-- Una fila por cada Asistente con guardias/serie canceladas cuya zona no se solapa con la
-- del Coordinador que ejecutó el cierre — el frontend (PrestacionesPaciente.jsx) hace esa
-- comparación antes de insertar. Mismo patrón de RLS por zona que
-- alertas_tempranas_guardia (schema_modulo6_guardias_03.sql).
--
-- Ejecutar una sola vez en el SQL Editor de Supabase, sobre la base con
-- schema_cierre_servicio_zona_fix.sql ya aplicado.

CREATE TABLE IF NOT EXISTS notificaciones_cierre_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  cierre_id UUID NOT NULL REFERENCES cierres_servicio_paciente(id),
  paciente_id UUID NOT NULL,
  asistente_id UUID NOT NULL,
  cerrado_por UUID NOT NULL REFERENCES usuarios(id),
  motivo TEXT NOT NULL,
  motivo_detalle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visto_at TIMESTAMPTZ,
  visto_por UUID REFERENCES usuarios(id),

  CONSTRAINT notificaciones_cierre_servicio_paciente_tenant_fk
    FOREIGN KEY (paciente_id, prestadora_id) REFERENCES pacientes (id, prestadora_id),
  CONSTRAINT notificaciones_cierre_servicio_asistente_tenant_fk
    FOREIGN KEY (asistente_id, prestadora_id) REFERENCES asistentes (id, prestadora_id)
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_cierre_servicio_asistente ON notificaciones_cierre_servicio (asistente_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_cierre_servicio_cierre ON notificaciones_cierre_servicio (cierre_id);

ALTER TABLE notificaciones_cierre_servicio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_notificaciones_cierre_servicio" ON notificaciones_cierre_servicio
  FOR ALL USING (
    es_superadmin() OR (
      notificaciones_cierre_servicio.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_ve_notificaciones_cierre_servicio_de_su_zona" ON notificaciones_cierre_servicio
  FOR ALL USING (
    notificaciones_cierre_servicio.prestadora_id = current_tenant()
    AND EXISTS (
      SELECT 1 FROM usuarios u
      JOIN asistentes a ON a.id = notificaciones_cierre_servicio.asistente_id
      WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && a.zonas
    )
  );

-- El Coordinador que ejecuta el cierre también puede insertar la notificación (aunque su
-- propia zona no incluya al Asistente destino) — necesario porque es quien hace el INSERT.
CREATE POLICY "coordinador_inserta_notificaciones_cierre_servicio" ON notificaciones_cierre_servicio
  FOR INSERT WITH CHECK (
    notificaciones_cierre_servicio.prestadora_id = current_tenant()
    AND notificaciones_cierre_servicio.cerrado_por = auth.uid()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
  );

NOTIFY pgrst, 'reload schema';
