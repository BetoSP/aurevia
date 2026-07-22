-- Fase 5 del rediseño de frontend (Círculo de cuidado, ver
-- C:\Users\Usuario\.claude\plans\distributed-scribbling-wirth.md) — permite que una Familia
-- invite a otra persona (ej. un segundo familiar) a ver el estado de su Paciente, sin
-- compartir la cuenta del titular. Alcance mínimo aprobado por el Desarrollador: un solo rol
-- invitable, 'solo_lectura' — ve lo mismo que el titular pero no puede calificar guardias ni
-- (a futuro) hacer ninguna otra escritura. Roles más granulares quedan para cuando haya un
-- pedido de negocio concreto que los necesite (no se diseñan de antemano sin caso de uso).
--
-- Hallazgo que motivó este cambio (ver docs/claude_history.md, Regla 12 de CLAUDE.md): las
-- 13 policies de RLS que ya existían para "la Familia ve/gestiona lo suyo" comparaban
-- `familia_id = auth.uid()` en forma directa — asumían que el usuario logueado ES la fila
-- de `familias`, sin ningún concepto de un tercero con acceso a esa misma Familia. Esta
-- migración agrega la función SECURITY DEFINER `familia_id_de_usuario()` (mismo patrón que
-- `zonas_de_asistente()` en schema_fix_recursion_rls_asistentes_guardias.sql: resuelve
-- una relación bypaseando RLS, sin duplicar la condición policy por policy) y actualiza las
-- 14 policies (13 + `familia_ve_su_propia_fila`) para usarla, en vez de reescribir la
-- condición a mano en cada una.
--
-- Ejecutar una sola vez en el SQL Editor de Supabase.

-- ============================================================================
-- 1. Tabla de círculo de cuidado
-- ============================================================================

CREATE TABLE IF NOT EXISTS miembros_familia (
  usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  familia_id UUID NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'solo_lectura' CHECK (rol IN ('solo_lectura')),
  creado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_miembros_familia_familia ON miembros_familia (familia_id);

ALTER TABLE miembros_familia ENABLE ROW LEVEL SECURITY;

-- El propio miembro invitado puede leer su fila (para saber a qué Familia está vinculado).
CREATE POLICY "miembro_lee_su_propia_fila" ON miembros_familia
  FOR SELECT USING (usuario_id = auth.uid());

-- Admin/Coordinador de la Prestadora de esa Familia gestionan el círculo — misma acción de
-- permisos ya usada para editar los datos de contacto de la Familia (reutilizada, no se
-- crea un permiso nuevo para esto: gestionar quién tiene acceso es parte de "editar los
-- datos de esta Familia").
CREATE POLICY "admin_gestiona_circulo_familia" ON miembros_familia
  FOR ALL USING (
    es_superadmin() OR EXISTS (
      SELECT 1 FROM familias f
      WHERE f.id = miembros_familia.familia_id
        AND f.prestadora_id = current_tenant()
        AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_gestiona_circulo_familia" ON miembros_familia
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM familias f
      WHERE f.id = miembros_familia.familia_id
        AND f.prestadora_id = current_tenant()
        AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
    )
    AND tiene_permiso('editar_datos_familia')
  );

-- ============================================================================
-- 2. Función helper — punto único de verdad para "¿a qué Familia pertenece este usuario?"
--    Devuelve la propia fila si es el titular, o la Familia a la que fue invitado si es un
--    miembro del círculo. NULL si no es ninguna de las dos cosas.
-- ============================================================================

CREATE OR REPLACE FUNCTION familia_id_de_usuario(p_usuario_id UUID) RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT id FROM familias WHERE id = p_usuario_id),
    (SELECT familia_id FROM miembros_familia WHERE usuario_id = p_usuario_id)
  )
$$;

REVOKE EXECUTE ON FUNCTION familia_id_de_usuario(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION familia_id_de_usuario(UUID) TO authenticated;

-- ============================================================================
-- 3. Actualización de las policies existentes — mismo criterio de negocio de siempre,
--    ahora resuelto a través de la función de arriba en vez de `auth.uid()` directo.
-- ============================================================================

-- schema_etapa2c.sql
DROP POLICY IF EXISTS "familia_ve_su_propia_fila" ON familias;
CREATE POLICY "familia_ve_su_propia_fila" ON familias
  FOR SELECT USING (id = familia_id_de_usuario(auth.uid()));

-- schema_pwa_familias_01.sql
DROP POLICY IF EXISTS "familia_ve_sus_pacientes" ON pacientes;
CREATE POLICY "familia_ve_sus_pacientes" ON pacientes
  FOR SELECT USING (
    pacientes.prestadora_id = current_tenant()
    AND familia_id = familia_id_de_usuario(auth.uid())
  );

DROP POLICY IF EXISTS "familia_ve_guardias_de_sus_pacientes" ON guardias;
CREATE POLICY "familia_ve_guardias_de_sus_pacientes" ON guardias
  FOR SELECT USING (
    guardias.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = guardias.paciente_id AND p.familia_id = familia_id_de_usuario(auth.uid()))
  );

DROP POLICY IF EXISTS "familia_ve_asistente_asignado" ON asistentes;
CREATE POLICY "familia_ve_asistente_asignado" ON asistentes
  FOR SELECT USING (
    asistentes.prestadora_id = current_tenant()
    AND EXISTS (
      SELECT 1 FROM guardias g
      JOIN pacientes p ON p.id = g.paciente_id
      WHERE g.asistente_id = asistentes.id AND p.familia_id = familia_id_de_usuario(auth.uid())
    )
  );

DROP POLICY IF EXISTS "familia_ve_certificado_asistente_asignado" ON certificados;
CREATE POLICY "familia_ve_certificado_asistente_asignado" ON certificados
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guardias g
      JOIN pacientes p ON p.id = g.paciente_id
      WHERE g.asistente_id = certificados.asistente_id AND p.familia_id = familia_id_de_usuario(auth.uid())
    )
  );

-- push_subscriptions: cada miembro del círculo gestiona su PROPIA suscripción push (no la
-- del titular) — sigue siendo `familia_id = auth.uid()` a propósito en la columna
-- `familia_id` de esta tabla puntual, porque el backend (appFamilias.js) ahora escribe ahí
-- el id real del usuario logueado (ver docs/claude_history.md), no el id de la Familia
-- titular. No se toca esta policy.

-- schema_reportes_alertas_01.sql
DROP POLICY IF EXISTS "familia_ve_reportes_de_sus_pacientes" ON reportes;
CREATE POLICY "familia_ve_reportes_de_sus_pacientes" ON reportes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guardias g
      JOIN pacientes p ON p.id = g.paciente_id
      WHERE g.id = reportes.guardia_id AND p.familia_id = familia_id_de_usuario(auth.uid())
    )
  );

DROP POLICY IF EXISTS "familia_ve_alertas_de_sus_pacientes" ON alertas;
CREATE POLICY "familia_ve_alertas_de_sus_pacientes" ON alertas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pacientes p WHERE p.id = alertas.paciente_id AND p.familia_id = familia_id_de_usuario(auth.uid())
    )
  );

-- schema_calificaciones_asistente.sql
DROP POLICY IF EXISTS "familia_gestiona_sus_calificaciones" ON calificaciones_asistente;
CREATE POLICY "familia_gestiona_sus_calificaciones" ON calificaciones_asistente
  FOR ALL USING (
    familia_id = familia_id_de_usuario(auth.uid())
    OR EXISTS (
      SELECT 1 FROM pacientes p WHERE p.id = calificaciones_asistente.paciente_id AND p.familia_id = familia_id_de_usuario(auth.uid())
    )
  )
  WITH CHECK (familia_id = familia_id_de_usuario(auth.uid()));

-- schema_facturacion_familias_01.sql
DROP POLICY IF EXISTS "familia_ve_sus_facturas" ON facturas_familia;
CREATE POLICY "familia_ve_sus_facturas" ON facturas_familia
  FOR SELECT USING (familia_id = familia_id_de_usuario(auth.uid()));

DROP POLICY IF EXISTS "familia_ve_items_de_sus_facturas" ON facturas_familia_items;
CREATE POLICY "familia_ve_items_de_sus_facturas" ON facturas_familia_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM facturas_familia f WHERE f.id = facturas_familia_items.factura_id AND f.familia_id = familia_id_de_usuario(auth.uid()))
  );

NOTIFY pgrst, 'reload schema';
