-- Pendiente #75 (docs/PENDIENTES.md) — flujo de "primera contraseña" para las cuentas de
-- Familia/Asistente/Círculo de cuidado que crea el Panel sin login propio previo del
-- interesado. `crearCuentaConPerfil` (backend/src/utils/cuentasPanel.js) generaba un
-- passwordTemporal que nunca se comunicaba a nadie; esta tabla guarda un token de
-- activación de un solo uso para que esa persona pueda entrar por primera vez y elegir su
-- propia contraseña, sin depender de un canal manual.
--
-- Solo la toca el backend con la service role key (nunca `anon`/`authenticated`) — mismo
-- criterio que otras tablas puramente internas del sistema, RLS habilitada sin políticas
-- permisivas en vez de dejarla sin RLS (Regla 8, CLAUDE.md §7).
--
-- Ejecutar una sola vez en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS tokens_activacion_cuenta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expira_en TIMESTAMPTZ NOT NULL,
  usado_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tokens_activacion_usuario ON tokens_activacion_cuenta (usuario_id);

ALTER TABLE tokens_activacion_cuenta ENABLE ROW LEVEL SECURITY;
-- Sin políticas: ni anon ni authenticated tienen acceso directo. El endpoint público
-- POST /api/activar-cuenta valida el token con la service role key, que bypassea RLS por
-- diseño de Supabase — el aislamiento real está en que ese endpoint nunca expone más que
-- "token válido/inválido", nunca datos de la Prestadora ni de otros usuarios.

NOTIFY pgrst, 'reload schema';
