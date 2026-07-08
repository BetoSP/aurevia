-- Etapa 2 — Rol Superadmin real (quinto rol, login propio, distinto de Admin).
-- Ver docs/CONTEXT.md ("Acordado en sesión 2026-07-07: Superadmin es un quinto rol real...")
-- y docs/CLAUDE.md (glosario: "Superadmin — rol técnico, login propio, distinto de Admin").
-- Ejecutar una sola vez en el SQL Editor de Supabase, sobre la misma base de Etapa 2.
--
-- Superadmin ve y hace todo lo que Admin, más acceso técnico (Módulo 8: gestión de
-- usuarios del Panel de cualquier rol, incluido crear otros superadmin). Por eso cada
-- policy que hoy exige 'admin' pasa a exigir 'admin' o 'superadmin'.

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('admin', 'coordinador', 'asistente', 'familia', 'superadmin'));

-- schema_etapa2.sql
DROP POLICY IF EXISTS "panel_lee_postulaciones" ON postulaciones;
CREATE POLICY "panel_lee_postulaciones" ON postulaciones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

DROP POLICY IF EXISTS "panel_edita_postulaciones" ON postulaciones;
CREATE POLICY "panel_edita_postulaciones" ON postulaciones
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

DROP POLICY IF EXISTS "panel_lee_solicitudes" ON solicitudes;
CREATE POLICY "panel_lee_solicitudes" ON solicitudes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

DROP POLICY IF EXISTS "panel_edita_solicitudes" ON solicitudes;
CREATE POLICY "panel_edita_solicitudes" ON solicitudes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

-- schema_etapa2b.sql
DROP POLICY IF EXISTS "panel_lee_aspirantes" ON aspirantes;
CREATE POLICY "panel_lee_aspirantes" ON aspirantes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

DROP POLICY IF EXISTS "panel_edita_aspirantes" ON aspirantes;
CREATE POLICY "panel_edita_aspirantes" ON aspirantes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

DROP POLICY IF EXISTS "panel_lee_asistentes" ON asistentes;
CREATE POLICY "panel_lee_asistentes" ON asistentes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

DROP POLICY IF EXISTS "panel_edita_asistentes" ON asistentes;
CREATE POLICY "panel_edita_asistentes" ON asistentes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );

DROP POLICY IF EXISTS "panel_gestiona_verificaciones" ON verificaciones_asistente;
CREATE POLICY "panel_gestiona_verificaciones" ON verificaciones_asistente
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

DROP POLICY IF EXISTS "admin_gestiona_escalas_legales" ON escalas_legales;
CREATE POLICY "admin_gestiona_escalas_legales" ON escalas_legales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );

DROP POLICY IF EXISTS "panel_gestiona_ausencias" ON ausencias;
CREATE POLICY "panel_gestiona_ausencias" ON ausencias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

DROP POLICY IF EXISTS "panel_gestiona_guardias_cobertura" ON guardias_cobertura;
CREATE POLICY "panel_gestiona_guardias_cobertura" ON guardias_cobertura
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

DROP POLICY IF EXISTS "admin_gestiona_ceses" ON ceses;
CREATE POLICY "admin_gestiona_ceses" ON ceses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );

-- schema_etapa2c.sql
DROP POLICY IF EXISTS "panel_gestiona_familias" ON familias;
CREATE POLICY "panel_gestiona_familias" ON familias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

DROP POLICY IF EXISTS "panel_gestiona_pacientes" ON pacientes;
CREATE POLICY "panel_gestiona_pacientes" ON pacientes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

-- schema_etapa2d.sql
DROP POLICY IF EXISTS "panel_lee_lista_precios" ON lista_precios;
CREATE POLICY "panel_lee_lista_precios" ON lista_precios
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

DROP POLICY IF EXISTS "admin_edita_lista_precios" ON lista_precios;
CREATE POLICY "admin_edita_lista_precios" ON lista_precios
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );

DROP POLICY IF EXISTS "admin_actualiza_lista_precios" ON lista_precios;
CREATE POLICY "admin_actualiza_lista_precios" ON lista_precios
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );

DROP POLICY IF EXISTS "admin_borra_lista_precios" ON lista_precios;
CREATE POLICY "admin_borra_lista_precios" ON lista_precios
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );

DROP POLICY IF EXISTS "panel_gestiona_prestaciones" ON prestaciones;
CREATE POLICY "panel_gestiona_prestaciones" ON prestaciones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

DROP POLICY IF EXISTS "panel_gestiona_paquetes" ON paquetes_prestaciones;
CREATE POLICY "panel_gestiona_paquetes" ON paquetes_prestaciones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

DROP POLICY IF EXISTS "panel_gestiona_paquete_items" ON paquete_prestacion_items;
CREATE POLICY "panel_gestiona_paquete_items" ON paquete_prestacion_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );

-- schema_etapa2f.sql
DROP POLICY IF EXISTS "panel_gestiona_certificados" ON certificados;
CREATE POLICY "panel_gestiona_certificados" ON certificados
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador', 'superadmin'))
  );
