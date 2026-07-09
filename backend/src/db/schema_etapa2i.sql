-- Etapa 2I — cierre de hallazgo crítico de auditoría (2026-07-08): la tabla "asistentes"
-- mezcla columnas operativas (nombre, telefono, especialidades, zonas...) con columnas
-- laborales sensibles (sueldo_basico, valor_hora, causal_baja, categoria_cct,
-- score_riesgo_reclasificacion, indicadores_riesgo, vencimientos). RLS de Postgres es
-- row-level, no column-level: la policy "panel_lee_asistentes" (schema_etapa2b.sql) deja
-- pasar la fila completa a Coordinador, y el frontend solo la ocultaba visualmente
-- (Regla 8 de CLAUDE.md exige que Coordinador no vea datos laborales internos, no solo
-- que la pantalla no los dibuje). Esta vista expone únicamente las columnas operativas;
-- Coordinador la consulta a ella en vez de la tabla real (ver AsistenteDetalle.jsx y
-- Asistentes.jsx). security_invoker=true: la vista respeta la RLS real de "asistentes"
-- (misma policy de admin+coordinador a nivel de fila), solo restringe columnas.
CREATE OR REPLACE VIEW asistentes_coordinador
WITH (security_invoker = true) AS
SELECT
  id, aspirante_id, nombre, telefono, email, foto_url,
  especialidades, zonas, disponibilidad, estado, qr_token,
  fecha_alta, created_at, updated_at, deleted_at
FROM asistentes;

GRANT SELECT ON asistentes_coordinador TO authenticated;

-- Hallazgo medio de la misma auditoría: calcularCese.js tenía hardcodeado el umbral de
-- "fracción mayor a 3 meses computa como año completo" (LCT art. 245) en vez de leerlo de
-- escalas_legales (regla 10 de CLAUDE.md). Se agrega acá como escala versionada.
INSERT INTO escalas_legales (tipo, categoria, valor, unidad, vigencia_desde, fuente)
SELECT 'fraccion_computable_antiguedad', 'general', 90, 'dias', '2026-01-01',
       'PLACEHOLDER — validar con abogado laboralista (art. 245 LCT: fracción mayor a 3 meses)'
WHERE NOT EXISTS (
  SELECT 1 FROM escalas_legales WHERE tipo = 'fraccion_computable_antiguedad' AND categoria = 'general'
);

-- ============================================================================
-- RLS por zona para Coordinador (hallazgo medio de la auditoría — docs/SECURITY.md:108-110
-- ya lo exigía, nunca se había implementado; ver docs/PROGRESS.md deuda técnica original
-- en schema_etapa2.sql). Cubre acá solo las tablas con columna "zonas" real o join directo
-- a "asistentes.zonas" — aspirantes/asistentes/verificaciones_asistente/ausencias/
-- guardias_cobertura/certificados. Las tablas del lado Familia (solicitudes/familias/
-- pacientes/prestaciones) NO tienen zona modelada como código real (solicitudes.localidad
-- es texto libre sin FK a zonas_cobertura) — filtrar por texto libre sería adivinar una
-- semántica no confirmada, así que quedan con el mismo acceso admin+coordinador de antes,
-- documentado como pendiente de decisión de producto/modelo de datos, no resuelto acá.
-- Admin/superadmin siempre ven todo, sin excepción, en todas estas tablas.
-- ============================================================================

-- ASPIRANTES
DROP POLICY IF EXISTS "panel_lee_aspirantes" ON aspirantes;
CREATE POLICY "admin_lee_aspirantes" ON aspirantes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );
CREATE POLICY "coordinador_lee_aspirantes_de_su_zona" ON aspirantes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && aspirantes.zonas)
  );

DROP POLICY IF EXISTS "panel_edita_aspirantes" ON aspirantes;
CREATE POLICY "admin_edita_aspirantes" ON aspirantes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );
CREATE POLICY "coordinador_edita_aspirantes_de_su_zona" ON aspirantes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && aspirantes.zonas)
  );

-- ASISTENTES
DROP POLICY IF EXISTS "panel_lee_asistentes" ON asistentes;
CREATE POLICY "admin_lee_asistentes" ON asistentes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );
CREATE POLICY "coordinador_lee_asistentes_de_su_zona" ON asistentes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && asistentes.zonas)
  );

-- Restaura la edición operativa de Coordinador (especialidades/zonas/estado — nunca vínculo
-- laboral/montos, eso lo sigue bloqueando el frontend en PerfilTab.jsx) que el comentario de
-- schema_etapa2b.sql prometía y schema_etapa2g.sql había dejado sin querer solo en admin.
CREATE POLICY "coordinador_edita_asistentes_de_su_zona" ON asistentes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && asistentes.zonas)
  );

-- VERIFICACIONES_ASISTENTE (join a asistentes.zonas)
DROP POLICY IF EXISTS "panel_gestiona_verificaciones" ON verificaciones_asistente;
CREATE POLICY "admin_gestiona_verificaciones" ON verificaciones_asistente
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );
CREATE POLICY "coordinador_gestiona_verificaciones_de_su_zona" ON verificaciones_asistente
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      JOIN asistentes a ON a.id = verificaciones_asistente.asistente_id
      WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && a.zonas
    )
  );

-- AUSENCIAS (join a asistentes.zonas)
DROP POLICY IF EXISTS "panel_gestiona_ausencias" ON ausencias;
CREATE POLICY "admin_gestiona_ausencias" ON ausencias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );
CREATE POLICY "coordinador_gestiona_ausencias_de_su_zona" ON ausencias
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      JOIN asistentes a ON a.id = ausencias.asistente_id
      WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && a.zonas
    )
  );

-- GUARDIAS_COBERTURA (join a asistentes.zonas vía asistente_sustituto_id)
DROP POLICY IF EXISTS "panel_gestiona_guardias_cobertura" ON guardias_cobertura;
CREATE POLICY "admin_gestiona_guardias_cobertura" ON guardias_cobertura
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );
CREATE POLICY "coordinador_gestiona_guardias_cobertura_de_su_zona" ON guardias_cobertura
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      JOIN asistentes a ON a.id = guardias_cobertura.asistente_sustituto_id
      WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && a.zonas
    )
  );

-- CERTIFICADOS (join a asistentes.zonas)
DROP POLICY IF EXISTS "panel_gestiona_certificados" ON certificados;
CREATE POLICY "admin_gestiona_certificados" ON certificados
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );
CREATE POLICY "coordinador_gestiona_certificados_de_su_zona" ON certificados
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      JOIN asistentes a ON a.id = certificados.asistente_id
      WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && a.zonas
    )
  );
