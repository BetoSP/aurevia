-- Pendiente #30, ítem B — acota es_superadmin() a la prestadora sandbox, en vez de
-- bypass total (docs/PLAN_MULTITENANT_PLM.md 3.4: "Superadmin... Acceso de Panel
-- únicamente a una prestadora de prueba fija (sandbox) — vedado el acceso a cualquier
-- prestadora real, ninguna tarea técnica lo justifica"). Kickoff dado por el
-- Desarrollador el 2026-07-14 ("vamos con el pendiente 30", confirmado explícitamente
-- para este ítem tras dos rondas de aclaración sobre la sandbox).
--
-- Hoy es_superadmin() es un bypass total: 42 policies usan `es_superadmin() OR (...)`,
-- así que ser superadmin da acceso a CUALQUIER prestadora, no solo a una de prueba. Este
-- archivo no reescribe esas 42 policies a mano — genera el ALTER POLICY mecánicamente a
-- partir de pg_policies (bloque DO $$ más abajo), reemplazando `es_superadmin()` por
-- `(es_superadmin() AND (prestadora_id = current_tenant()))`. Como usuarios.prestadora_id
-- de la cuenta superadmin pasa a apuntar a la sandbox (paso 2 de este archivo) y
-- current_tenant() ya resuelve desde ahí (schema_admin_plataforma_01.sql), el bypass
-- solo se cumple para filas de la sandbox — para cualquier prestadora real, el AND da
-- false y cae a la rama normal (admin_prestadora/coordinador), que superadmin no cumple.
--
-- Dos policies quedan explícitamente afuera de este barrido, no por descuido:
-- - configuracion_empresa (2 policies): tabla legacy, reemplazada por
--   configuracion_prestadora el 2026-07-13 (docs/PROGRESS.md) — verificado que ningún
--   archivo de backend hace ninguna query real contra ella (solo queda un comentario que
--   la menciona en panelConfiguracion.js:19). No se toca; candidata a DROP TABLE en una
--   sesión aparte, fuera de alcance de este pendiente.
-- - escalas_legales (1 policy): confirmado con el Desarrollador que es global a
--   propósito (escalas legales nacionales, iguales para toda prestadora del mismo país)
--   — no tiene prestadora_id ni debería tenerlo.
--
-- Dos casos especiales, tratados aparte al final (no siguen el patrón mecánico porque no
-- comparan prestadora_id directo):
-- - prestadoras: la tabla ES el tenant, se compara `id`, no `prestadora_id`. Sin código
--   de app que haga INSERT ahí (se verificó con grep) — el onboarding real de una
--   prestadora nueva se hace hoy vía sesión con Service Role Key, que ya bypassea RLS,
--   así que acotar esta policy no rompe ningún flujo existente.
-- - verificaciones_asistente: no tiene prestadora_id propia, se llega vía JOIN a
--   asistentes.prestadora_id.
--
-- Ejecutar una sola vez en el SQL Editor de Supabase (o vía MCP), sobre la base con
-- schema_admin_plataforma_01.sql ya aplicado.

-- ============================================================================
-- 1. Prestadora sandbox permanente — NO es una prestadora real, no tiene contrato,
--    existe únicamente para que superadmin tenga algún acceso técnico de Panel acotado.
--    UUID fijo (no gen_random_uuid()) para que este archivo sea legible/reproducible y
--    para poder referenciarlo en el paso 2 sin una consulta previa.
-- ============================================================================

INSERT INTO prestadoras (id, razon_social, nombre_fantasia, pais, estado)
VALUES (
  '5d727437-a5ff-432f-b9f6-10015e61ffef',
  'Sandbox Superadmin (uso técnico interno, no es una prestadora real)',
  'Sandbox Superadmin',
  'AR',
  'prospecto'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Reasignar toda cuenta superadmin existente a la sandbox — hoy apunta a prestadora-original
--    (874f54d7-4383-4d54-8b9f-f51d02f0dd11) solo por el backfill de consistencia de
--    esquema del rename admin→admin_prestadora, nunca fue una asignación real.
-- ============================================================================

UPDATE usuarios SET prestadora_id = '5d727437-a5ff-432f-b9f6-10015e61ffef' WHERE rol = 'superadmin';

-- ============================================================================
-- 3. Barrido mecánico: envolver es_superadmin() con el match de tenant en toda policy
--    que compara prestadora_id directo (37 de las 39 a tocar) — generado desde
--    pg_policies, no transcripto a mano.
-- ============================================================================

DO $$
DECLARE
  pol RECORD;
  nuevo_qual TEXT;
  nuevo_check TEXT;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual ILIKE '%es_superadmin()%' OR with_check ILIKE '%es_superadmin()%')
      AND tablename NOT IN ('configuracion_empresa', 'escalas_legales', 'prestadoras', 'verificaciones_asistente')
  LOOP
    nuevo_qual := CASE WHEN pol.qual IS NOT NULL
      THEN replace(pol.qual, 'es_superadmin()', '(es_superadmin() AND (prestadora_id = current_tenant()))')
      ELSE NULL END;
    nuevo_check := CASE WHEN pol.with_check IS NOT NULL
      THEN replace(pol.with_check, 'es_superadmin()', '(es_superadmin() AND (prestadora_id = current_tenant()))')
      ELSE NULL END;

    IF nuevo_qual IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', pol.policyname, pol.schemaname, pol.tablename, nuevo_qual);
    END IF;
    IF nuevo_check IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)', pol.policyname, pol.schemaname, pol.tablename, nuevo_check);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 4. Casos especiales
-- ============================================================================

ALTER POLICY "superadmin_gestiona_prestadoras" ON prestadoras
  USING (es_superadmin() AND (id = current_tenant()));

ALTER POLICY "admin_gestiona_verificaciones" ON verificaciones_asistente
  USING (
    (es_superadmin() AND (EXISTS (
      SELECT 1 FROM asistentes a
      WHERE a.id = verificaciones_asistente.asistente_id AND a.prestadora_id = current_tenant()
    )))
    OR (EXISTS (
      SELECT 1 FROM usuarios u JOIN asistentes a ON (a.id = verificaciones_asistente.asistente_id)
      WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora' AND a.prestadora_id = current_tenant()
    ))
  );

NOTIFY pgrst, 'reload schema';
