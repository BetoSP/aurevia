-- Etapa 2 — Certificado de Aptitud (nombre "Certificado prestadora-original" al momento de esta
-- migración, renombrado 2026-07-13; ver docs/DATA_MODEL.md "Tabla: certificados" y
-- docs/PRD_03_Reclutamiento.md — el certificado reusa el mismo asistentes.qr_token,
-- no un mecanismo nuevo). Por ahora solo se construye el lado Panel: emitir/ver el
-- certificado y su QR. La página pública que ese QR apunta (prestadora-originalsalud.com.ar/
-- asistente/[qr_token]) es Etapa 6 (otra PWA), todavía no existe — decisión confirmada
-- con el usuario 2026-07-08.

CREATE TABLE IF NOT EXISTS certificados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asistente_id UUID REFERENCES asistentes(id),
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE certificados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_certificados" ON certificados
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );
