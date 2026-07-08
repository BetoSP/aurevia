-- Etapa 2 Módulo 5 (Familias y Pacientes) — ver docs/PRD_02_Panel_Admin.md Módulo 5 y
-- docs/DATA_MODEL.md (tablas "familias"/"pacientes"). Ejecutar una sola vez en el SQL
-- Editor de Supabase, sobre la misma base de Etapa 1/2/2B.
--
-- familias.id referencia usuarios(id) (igual que asistentes) — una Familia solo existe una
-- vez que tiene una cuenta real de Supabase Auth. Esa cuenta se crea desde el backend
-- (POST /api/panel/cuentas/familia, Service Role Key) al convertir una solicitud ya asignada
-- en una Familia real, no antes. No se envía invitación por email todavía (Etapa 4 — PWA
-- Familias — no existe aún); la cuenta queda lista para cuando esa PWA se construya.

CREATE TABLE IF NOT EXISTS familias (
  id UUID REFERENCES usuarios(id) PRIMARY KEY,
  solicitud_id BIGINT REFERENCES solicitudes(id),
  plan TEXT DEFAULT 'directo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE familias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_familias" ON familias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

-- Adelanto de Etapa 4 (login de Familias): permite que la propia Familia lea su fila una
-- vez que la PWA de Familias exista. No es una policy recursiva porque subconsulta
-- "usuarios", no "familias".
CREATE POLICY "familia_ve_su_propia_fila" ON familias
  FOR SELECT USING (id = auth.uid());

CREATE TABLE IF NOT EXISTS pacientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  familia_id UUID REFERENCES familias(id),
  nombre TEXT NOT NULL,
  fecha_nacimiento DATE,
  patologias TEXT[],
  medicacion_habitual JSONB,
  nivel_complejidad TEXT CHECK (nivel_complejidad IN ('I', 'II', 'III')),
  domicilio TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  ioma_afiliado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;

-- Datos de salud del paciente (regla 7 de CLAUDE.md) — solo Admin/Coordinador por ahora.
-- El acceso de la propia Familia a su Paciente es alcance de Etapa 4, se agrega junto con
-- esa PWA.
CREATE POLICY "panel_gestiona_pacientes" ON pacientes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS familia_id UUID REFERENCES familias(id);
