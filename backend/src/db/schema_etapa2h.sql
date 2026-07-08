-- Etapa 2 — Módulo 8 (Configuración): datos de la empresa, zonas de cobertura activas,
-- configuración de notificaciones. Ver docs/PRD_02_Panel_Admin.md Módulo 8.
-- Ejecutar una sola vez en el SQL Editor de Supabase, sobre la misma base de Etapa 2.
--
-- "Usuarios del panel (crear/modificar Coordinadores)", la cuarta pieza de este módulo
-- según el PRD, ya existe (panelUsuariosRouter / UsuariosPanel.jsx) — no se toca acá.

-- ============================================================================
-- DATOS DE LA EMPRESA (fila única — nunca hardcodear estos datos en el sitio público,
-- regla 1 de CLAUDE.md)
-- ============================================================================
CREATE TABLE IF NOT EXISTS configuracion_empresa (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nombre TEXT NOT NULL DEFAULT 'prestadora-original Salud',
  telefono TEXT,
  whatsapp_numero TEXT,
  email TEXT,
  dominio TEXT,
  zona_cobertura_texto TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO configuracion_empresa (id, nombre, telefono, whatsapp_numero, email, dominio, zona_cobertura_texto)
VALUES (1, 'prestadora-original Salud', '+54 9 11 3787 4193', '+54 9 11 3787 4193', 'prestadora-original.salud@gmail.com', 'prestadora-originalsalud.com.ar', 'AMBA')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE configuracion_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_lee_configuracion_empresa" ON configuracion_empresa
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );

CREATE POLICY "panel_edita_configuracion_empresa" ON configuracion_empresa
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );

-- ============================================================================
-- ZONAS DE COBERTURA ACTIVAS (reemplaza la lista fija que vivía en siteConfig.js del
-- sitio público — el formulario trabaja-con-nosotros pasa a leerlas desde acá)
-- ============================================================================
CREATE TABLE IF NOT EXISTS zonas_cobertura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('caba', 'gba', 'otras')),
  activa BOOLEAN NOT NULL DEFAULT true,
  orden SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE zonas_cobertura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_zonas_cobertura" ON zonas_cobertura
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );

-- lectura pública de zonas activas (el sitio público las usa sin login, vía Service Role Key
-- desde el backend, no directo desde el browser — esta policy es la barrera real igual)
CREATE POLICY "publico_lee_zonas_activas" ON zonas_cobertura
  FOR SELECT USING (activa = true);

INSERT INTO zonas_cobertura (codigo, nombre, categoria, orden) VALUES
  ('norte', 'Zona Norte (CABA)', 'caba', 1),
  ('sur', 'Zona Sur (CABA)', 'caba', 2),
  ('centro', 'Zona Centro (CABA)', 'caba', 3),
  ('zona_norte', 'Zona Norte (GBA)', 'gba', 4),
  ('zona_oeste', 'Zona Oeste (GBA)', 'gba', 5),
  ('zona_sur', 'Zona Sur (GBA)', 'gba', 6),
  ('la_plata', 'La Plata', 'otras', 7)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- CONFIGURACIÓN DE NOTIFICACIONES (a qué emails avisar por cada evento — reemplaza el
-- hardcode a SMTP_USER en backend/src/utils/email.js)
-- ============================================================================
CREATE TABLE IF NOT EXISTS configuracion_notificaciones (
  evento TEXT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  emails TEXT[] NOT NULL DEFAULT '{}',
  activo BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE configuracion_notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_configuracion_notificaciones" ON configuracion_notificaciones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'superadmin'))
  );

INSERT INTO configuracion_notificaciones (evento, descripcion, emails) VALUES
  ('nueva_solicitud_servicio', 'Nueva solicitud de servicio desde el sitio público', '{}'),
  ('nueva_postulacion_asistente', 'Nueva postulación de Asistente desde el sitio público', '{}')
ON CONFLICT (evento) DO NOTHING;
