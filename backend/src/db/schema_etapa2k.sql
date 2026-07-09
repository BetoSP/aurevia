-- Etapa 2K — cierre de hallazgo de auditoría (2026-07-09): la tabla "aspirantes" (creada en
-- schema_etapa2b.sql, con policies RLS parcheadas en schema_etapa2g.sql y schema_etapa2i.sql)
-- nunca se usó desde el backend real. El flujo documentado en docs/DATA_MODEL.md era
-- postulaciones → aspirantes → asistentes, pero el código implementado siempre fue
-- postulaciones → asistentes directo (ver backend/src/routes/panelCuentas.js, endpoint
-- POST /asistente, que lee "postulacionId" y crea el registro de "asistentes" sin pasar
-- por "aspirantes" en ningún punto). La tabla quedó vacía y sin ningún código que la lea o
-- escriba. Se elimina para que el schema real coincida con el flujo real, en vez de mantener
-- una tabla fantasma con RLS que nadie audita. La columna "asistentes.aspirante_id" (que
-- referenciaba "aspirantes") también se elimina por el mismo motivo.
--
-- Ejecutar una sola vez en el SQL Editor de Supabase, sobre la misma base de Etapa 1/2.

-- La vista "asistentes_coordinador" (schema_etapa2i.sql) selecciona "aspirante_id"
-- explícitamente — hay que redefinirla antes de poder borrar la columna. Postgres no permite
-- que CREATE OR REPLACE VIEW quite columnas de salida, así que se dropea primero.
DROP VIEW IF EXISTS asistentes_coordinador;
CREATE VIEW asistentes_coordinador
WITH (security_invoker = true) AS
SELECT
  id, nombre, telefono, email, foto_url,
  especialidades, zonas, disponibilidad, estado, qr_token,
  fecha_alta, created_at, updated_at, deleted_at
FROM asistentes;

GRANT SELECT ON asistentes_coordinador TO authenticated;

ALTER TABLE asistentes DROP COLUMN IF EXISTS aspirante_id;

DROP TABLE IF EXISTS aspirantes;
