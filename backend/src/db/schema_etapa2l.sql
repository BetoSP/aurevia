-- Etapa 2L — cierre de hallazgo de auditoría (2026-07-09): docs/PRD_02B_Gestion_Personal.md
-- función 9 (Notificaciones de vencimientos) estaba documentada pero no implementada — solo
-- 2 de los eventos esperados existían en configuracion_notificaciones (schema_etapa2h.sql).
-- Se agregan los 3 eventos de vencimiento que revisa backend/src/utils/vencimientos.js
-- (revisión diaria, ver server.js).
--
-- Ejecutar una sola vez en el SQL Editor de Supabase, sobre la misma base de Etapa 1/2.

INSERT INTO configuracion_notificaciones (evento, descripcion, emails) VALUES
  ('vencimiento_monotributo', 'Monotributo de un Asistente vencido o por vencer en 30 días', '{}'),
  ('vencimiento_art', 'ART de un Asistente vencida o por vencer en 30 días', '{}'),
  ('vencimiento_seguro', 'Seguro de un Asistente vencido o por vencer en 30 días', '{}')
ON CONFLICT (evento) DO NOTHING;
