-- Pendiente #30, ítem H — MFA (TOTP) para superadmin/admin_plataforma, configurable
-- on/off por el propio superadmin. Decisión revisada 2026-07-15 (ver CLAUDE.md, nota
-- junto al glosario de Superadmin/Admin_plataforma): el diseño original de
-- docs/PLAN_MULTITENANT_XEITRA.md:416 pedía "obligatorio sin excepción" — el Desarrollador
-- lo pisó explícitamente para no sumar fricción mientras el sistema todavía se pule.
--
-- Arranca en OFF (default false) — no se le fuerza MFA a nadie hasta que el propio
-- superadmin lo prenda desde Configuración.

-- ============================================================================
-- 1. Tabla singleton de configuración de plataforma (no por prestadora — estos 2 roles
--    son transversales a toda la plataforma, no tiene sentido un toggle por tenant).
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracion_plataforma (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE), -- fuerza una sola fila posible
  mfa_admin_obligatorio BOOLEAN NOT NULL DEFAULT FALSE,
  actualizado_por UUID REFERENCES usuarios(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO configuracion_plataforma (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

ALTER TABLE configuracion_plataforma ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado del Panel puede leer el toggle (lo necesita el
-- propio login para saber si debe exigir MFA), pero solo superadmin puede escribirlo.
CREATE POLICY "lectura_configuracion_plataforma" ON configuracion_plataforma
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "superadmin_escribe_configuracion_plataforma" ON configuracion_plataforma
  FOR UPDATE
  USING (es_superadmin())
  WITH CHECK (es_superadmin());

-- ============================================================================
-- 2. es_superadmin() pasa de SQL puro a plpgsql: cuando el toggle está en ON, exige
--    además aal2 (sesión con MFA verificado) — condicionado al mismo toggle, no
--    hardcodeado. Con el toggle en OFF, se comporta exactamente igual que hoy.
-- ============================================================================

CREATE OR REPLACE FUNCTION es_superadmin() RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mfa_obligatorio BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'superadmin') THEN
    RETURN FALSE;
  END IF;

  SELECT mfa_admin_obligatorio INTO v_mfa_obligatorio FROM configuracion_plataforma LIMIT 1;

  IF COALESCE(v_mfa_obligatorio, FALSE) THEN
    RETURN (auth.jwt() ->> 'aal') = 'aal2';
  END IF;

  RETURN TRUE;
END;
$$;

-- Pendiente #52 (docs/PENDIENTES.md): revocado EXECUTE de PUBLIC (heredado por
-- anon/authenticated) — uso exclusivo interno vía RLS, sin caso de uso legítimo por RPC.
REVOKE EXECUTE ON FUNCTION es_superadmin() FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
