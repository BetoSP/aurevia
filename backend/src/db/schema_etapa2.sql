-- Etapa 2 (Panel de Administración) — ver docs/PRD_02_Panel_Admin.md y docs/DATA_MODEL.md
-- Ejecutar una sola vez en el SQL Editor de Supabase, sobre la misma base de Etapa 1.
-- Este primer corte cubre solo Módulo 1 (Dashboard), Módulo 2 (Postulaciones) y
-- Módulo 3 (Solicitudes de Servicio). Las tablas de asistentes/verificaciones/familias/
-- pacientes/guardias se crean cuando se construya el Módulo 4 (no antes, ver PROGRESS.md).

-- Tabla usuarios (extiende auth.users) — ver docs/DATA_MODEL.md
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID REFERENCES auth.users PRIMARY KEY,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'coordinador', 'asistente', 'familia')),
  nombre TEXT NOT NULL,
  telefono TEXT,
  zonas TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Nota: no agregar una policy "admin ve todos los usuarios" con un EXISTS que vuelva a
-- consultar esta misma tabla — Postgres reevalúa RLS dentro del EXISTS y entra en
-- recursión infinita ("infinite recursion detected in policy for relation usuarios").
-- Cada usuario del panel solo necesita leer su propia fila (para saber su rol); gestión
-- de otros usuarios (Módulo 8) se resuelve más adelante con una función SECURITY DEFINER.
CREATE POLICY "usuario_ve_su_propia_fila" ON usuarios
  FOR SELECT USING (id = auth.uid());

-- Columnas nuevas sobre las tablas de Etapa 1, para que el panel pueda operarlas
ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS nota_interna TEXT;

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS estado VARCHAR(30) DEFAULT 'nueva';
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS nota_interna TEXT;

-- RLS: admin ve y edita todo; coordinador ve y edita todo (todavía no hay campo de zona
-- en solicitudes/postulaciones para filtrar por zona — se agrega cuando el dato de zona
-- de la familia/aspirante esté modelado; por ahora coordinador tiene el mismo acceso que
-- admin sobre estas dos tablas, ver docs/PROGRESS.md deuda técnica)
CREATE POLICY "panel_lee_postulaciones" ON postulaciones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

CREATE POLICY "panel_edita_postulaciones" ON postulaciones
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

CREATE POLICY "panel_lee_solicitudes" ON solicitudes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

CREATE POLICY "panel_edita_solicitudes" ON solicitudes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );
