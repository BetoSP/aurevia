-- ============================================================================
-- schema_multitenant_03.sql
-- Cierre del pendiente #3 de docs/PENDIENTES.md ("Panel — tenant en inserts
-- directos"). Ver docs/PLAN_MULTITENANT_PLM.md sección 4.1.
--
-- El DEFAULT temporal de prestadora_id (schema_multitenant_02.sql:382-396) se
-- puso porque el Panel insertaba directo a Supabase con la anon key sin que
-- ningún componente supiera el prestadora_id del usuario logueado. Con
-- AuthContext.jsx ahora exponiendo prestadora_id y los 6 componentes que
-- insertan en estas 8 tablas (AusenciasCoberturaTab, VinculoCeseTab,
-- ListaPrecioDetalle, PrestacionesPaciente, CertificadoTab, NuevaGuardiaModal)
-- seteándolo explícitamente, el DEFAULT ya no hace falta y pasa a ser un
-- riesgo: enmascararía en silencio un insert que se olvide de setearlo,
-- insertando en el tenant equivocado (el de la fila DEFAULT) sin que nadie lo note.
--
-- Nota: schema_modulo6_guardias.sql define `guardias`/`series_guardias` con
-- prestadora_id NOT NULL sin DEFAULT desde su creación — esas dos tablas no
-- necesitan este paso, ya estaban correctas (ver hallazgo del pendiente #3).
--
-- Las otras 7 de las 15 originales (usuarios, asistentes, familias, pacientes,
-- zonas_cobertura, solicitudes, postulaciones) ya se cerraron el 2026-07-10
-- directo contra Supabase, sin dejar migración versionada en el repo — deuda
-- de documentación separada, ver DATA_MODEL.md.
--
-- Criterio de cierre (igual al de las 7 anteriores): tras aplicar esto, un
-- insert real sin prestadora_id explícito contra cualquiera de estas 8 tablas
-- debe fallar por violar el NOT NULL.
-- ============================================================================

ALTER TABLE ausencias ALTER COLUMN prestadora_id DROP DEFAULT;
ALTER TABLE guardias_cobertura ALTER COLUMN prestadora_id DROP DEFAULT;
ALTER TABLE ceses ALTER COLUMN prestadora_id DROP DEFAULT;
ALTER TABLE lista_precios ALTER COLUMN prestadora_id DROP DEFAULT;
ALTER TABLE prestaciones ALTER COLUMN prestadora_id DROP DEFAULT;
ALTER TABLE paquetes_prestaciones ALTER COLUMN prestadora_id DROP DEFAULT;
ALTER TABLE paquete_prestacion_items ALTER COLUMN prestadora_id DROP DEFAULT;
ALTER TABLE certificados ALTER COLUMN prestadora_id DROP DEFAULT;
