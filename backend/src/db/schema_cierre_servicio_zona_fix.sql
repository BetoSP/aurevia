-- Fix descubierto probando el cierre de servicio en navegador real (2026-07-14, ver
-- docs/PENDIENTES.md #32): las policies RLS de series_guardias/guardias para el rol
-- coordinador exigen que la zona del coordinador se solape con la del Asistente asignado
-- (`u.zonas && a.zonas`). Esa restricción tiene sentido para la gestión normal de guardias
-- (Coordinador ve/gestiona solo su zona, CLAUDE.md), pero bloquea en silencio el cierre de
-- servicio cuando lo ejecuta un Coordinador cuya zona no cubre al Asistente del Paciente:
-- Supabase no devuelve error en un UPDATE cuyo WHERE no matchea ninguna fila por RLS, así que
-- `prestaciones`/`paquetes_prestaciones` quedaban en `de_baja` pero `series_guardias`/
-- `guardias` seguían activas sin que la UI avisara nada.
--
-- Fix aprobado por el Desarrollador (2026-07-14): agregar una policy adicional, acotada
-- exclusivamente al caso de cierre de servicio — solo permite a un Coordinador (de la misma
-- prestadora, sin importar zona) actualizar series_guardias/guardias de un Paciente que YA
-- tiene un registro en cierres_servicio_paciente. `handleCerrarServicio` en
-- PrestacionesPaciente.jsx inserta ese registro ANTES de las actualizaciones en cascada, así
-- que la condición ya está cumplida cuando corren. No amplía el acceso del Coordinador a
-- guardias activas de otras zonas para ningún otro caso.
--
-- Corrección 2026-07-14 (tercera vuelta — la definitiva, verificada con requests HTTP reales
-- autenticados como el Coordinador de prueba, no con simulación SQL). Las dos vueltas
-- anteriores (agregar WITH CHECK explícito) no arreglaban nada porque el diagnóstico estaba
-- mal encaminado: el problema nunca fue USING vs WITH CHECK. Es una regla de RLS de Postgres
-- documentada y fácil de pasar por alto: una policy `FOR UPDATE` sola NO alcanza para que un
-- UPDATE con cláusula WHERE encuentre la fila, porque evaluar ese WHERE exige visibilidad de
-- SELECT sobre la fila — y visibilidad de SELECT la dan las policies de SELECT o ALL, no las
-- de UPDATE. Como el Coordinador de este caso no tiene ninguna policy de SELECT/ALL que lo
-- habilite sobre esa fila (su zona no cubre al Asistente), el UPDATE no encontraba la fila
-- aunque su propia policy UPDATE (USING/WITH CHECK) fuera perfectamente correcta — sin
-- ningún error visible, igual que el síntoma original. Confirmado de forma aislada y
-- reproducible: incluso una policy `FOR UPDATE USING (true) WITH CHECK (true)` fallaba en
-- este mismo escenario, y pasó a funcionar en cuanto se la declaró `FOR ALL` en lugar de
-- `FOR UPDATE`. La corrección real es cambiar estas dos policies de `FOR UPDATE` a `FOR ALL`
-- (dan también SELECT, que es exactamente lo que faltaba — no amplía el alcance más allá de
-- lo ya aprobado, porque la condición del `EXISTS` contra `cierres_servicio_paciente` sigue
-- siendo la misma).
--
-- Ejecutar una sola vez en el SQL Editor de Supabase, sobre la base con
-- schema_cierre_servicio_paciente.sql ya aplicado. Si `schema_cierre_servicio_zona_fix.sql`
-- ya se había aplicado antes (versiones anteriores), este archivo primero borra esas policies.

DROP POLICY IF EXISTS "coordinador_cierra_servicio_series_guardias" ON series_guardias;
DROP POLICY IF EXISTS "coordinador_cierra_servicio_guardias" ON guardias;

CREATE POLICY "coordinador_cierra_servicio_series_guardias" ON series_guardias
  FOR ALL USING (
    series_guardias.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
    AND EXISTS (SELECT 1 FROM cierres_servicio_paciente c WHERE c.paciente_id = series_guardias.paciente_id)
  )
  WITH CHECK (
    series_guardias.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
    AND EXISTS (SELECT 1 FROM cierres_servicio_paciente c WHERE c.paciente_id = series_guardias.paciente_id)
  );

CREATE POLICY "coordinador_cierra_servicio_guardias" ON guardias
  FOR ALL USING (
    guardias.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
    AND EXISTS (SELECT 1 FROM cierres_servicio_paciente c WHERE c.paciente_id = guardias.paciente_id)
  )
  WITH CHECK (
    guardias.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
    AND EXISTS (SELECT 1 FROM cierres_servicio_paciente c WHERE c.paciente_id = guardias.paciente_id)
  );

NOTIFY pgrst, 'reload schema';
