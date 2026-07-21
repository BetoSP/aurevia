-- Etapa 3 (PWA Asistentes) — infraestructura de notificaciones push (Web Push API + VAPID,
-- docs/PRD_04_05_App_Servicio.md:23), dejada para el final de la etapa según lo acordado con
-- el Desarrollador. Cubre los 3 eventos ya listados en docs/PRD_04_05_App_Servicio.md:115
-- ("Nueva guardia asignada, mensajes del coordinador, recordatorios") del lado del Asistente.
-- No cubre el push a la Familia (docs/PRD_04_05_App_Servicio.md:58,76) — no hay todavía PWA
-- de Familias (Etapa 4) que pueda suscribirse a recibirlo.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  asistente_id UUID NOT NULL REFERENCES asistentes(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_asistente ON push_subscriptions (asistente_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- El Asistente gestiona únicamente sus propias suscripciones. Sin política de acceso para
-- Admin_prestadora/Coordinador: nadie necesita leer el endpoint/claves de push de un Asistente
-- desde el Panel, y no exponerlo reduce superficie de un dato sensible sin necesidad real.
-- Mismo patrón que guardias/reportes/alertas (schema_reportes_alertas_01.sql): el id de
-- asistentes es el mismo UUID que auth.uid(), no hace falta join contra usuarios.
CREATE POLICY "asistente_gestiona_sus_push_subscriptions" ON push_subscriptions
  FOR ALL USING (asistente_id = auth.uid())
  WITH CHECK (asistente_id = auth.uid());

-- Control de envío único por evento (evita reenviar el mismo push en cada corrida del cron,
-- mismo patrón que ultima_notificacion_at en configuracion_escalada_coordinador).
ALTER TABLE guardias ADD COLUMN IF NOT EXISTS push_asignacion_enviado_at TIMESTAMPTZ;
ALTER TABLE guardias ADD COLUMN IF NOT EXISTS push_recordatorio_enviado_at TIMESTAMPTZ;
ALTER TABLE mensajes_asistente ADD COLUMN IF NOT EXISTS push_enviado_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
