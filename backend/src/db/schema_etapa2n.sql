-- Etapa 2n — cierra hallazgos de la auditoría exhaustiva del generador de documentación
-- (Función 7 de PRD_02B_Gestion_Personal.md, agregado en schema_etapa2m.sql):
--
-- 1) La columna "dni" agregada en schema_etapa2m.sql nunca se sumó a la vista
--    "asistentes_coordinador" (schema_etapa2k.sql), así que Coordinador siempre veía "DNI: —"
--    aunque el dato existiera, y cualquier constancia de ausencia que generara (Función 7)
--    salía sin DNI. El DNI no es un dato laboral sensible en el sentido de
--    schema_etapa2j.sql (sueldo_basico/valor_hora/categoria_cct/tipo_vinculo/causal_baja) —
--    es dato identificatorio, igual que telefono/email, que la vista ya expone. Se agrega acá.

CREATE OR REPLACE VIEW asistentes_coordinador
WITH (security_invoker = true) AS
-- CREATE OR REPLACE VIEW no permite insertar una columna en medio de la lista existente
-- (Postgres exige que las columnas ya presentes conserven nombre y posición) — se agrega
-- "dni" al final para no romper la vista.
SELECT
  id, nombre, telefono, email, foto_url,
  especialidades, zonas, disponibilidad, estado, qr_token,
  fecha_alta, created_at, updated_at, deleted_at, dni
FROM asistentes;
