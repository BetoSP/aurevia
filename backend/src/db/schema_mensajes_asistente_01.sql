-- Etapa 3 del plan de panel Admin_plataforma + faltantes del panel de Prestadora
-- (2026-07-18, aprobado por el Desarrollador: "queremos todo... realizala sin interrupcion").
--
-- Comunicación interna del equipo de la Prestadora sobre un Asistente puntual: hoy no existe
-- ningún lugar para dejar mensajes de ida y vuelta (el único campo libre es "nota_interna" de
-- otras pantallas, que no es una conversación). Esta tabla agrega un historial tipo chat,
-- visible desde el nuevo tab "Comunicación" en la ficha del Asistente.
--
-- No es chat con el Asistente ni con la Familia (eso es la futura App de Servicio —
-- docs/PRD_04_05_App_Servicio.md:140 — todavía sin construir); es exclusivamente interno,
-- entre Admin_prestadora y Coordinador de la propia Prestadora.
--
-- Ya aplicado en vivo el 2026-07-18 vía MCP; este archivo lo documenta en el repo.

CREATE TABLE IF NOT EXISTS mensajes_asistente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  asistente_id UUID NOT NULL REFERENCES asistentes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  mensaje TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_asistente_hilo ON mensajes_asistente (asistente_id, created_at);

ALTER TABLE mensajes_asistente ENABLE ROW LEVEL SECURITY;

-- Mismo criterio que documentos_asistente: Admin_prestadora ve y escribe todo lo de su
-- Prestadora; Coordinador solo el hilo de los Asistentes de su propia zona. El WITH CHECK
-- usuario_id = auth.uid() evita que alguien publique un mensaje a nombre de otro usuario.
CREATE POLICY "admin_prestadora_gestiona_mensajes_asistente" ON mensajes_asistente
  FOR ALL USING (
    es_superadmin() OR (
      prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  )
  WITH CHECK (
    usuario_id = auth.uid()
    AND (
      es_superadmin() OR (
        prestadora_id = current_tenant()
        AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
      )
    )
  );

CREATE POLICY "coordinador_conversa_mensajes_asistente_de_su_zona" ON mensajes_asistente
  FOR ALL USING (
    prestadora_id = current_tenant()
    AND EXISTS (
      SELECT 1 FROM usuarios u
      JOIN asistentes a ON a.id = mensajes_asistente.asistente_id
      WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && a.zonas
    )
  )
  WITH CHECK (
    usuario_id = auth.uid()
    AND prestadora_id = current_tenant()
    AND EXISTS (
      SELECT 1 FROM usuarios u
      JOIN asistentes a ON a.id = mensajes_asistente.asistente_id
      WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && a.zonas
    )
  );

NOTIFY pgrst, 'reload schema';
