-- ============================================================================
-- schema_multitenant_04.sql
-- Bloque 4 del plan (docs/PLAN_MULTITENANT_PLM.md, ver también
-- schema_multitenant_01.sql:9-11): reemplaza el singleton `configuracion_empresa`
-- (fila única `id=1`, sin tenant) por `configuracion_prestadora`, con una fila
-- por prestadora y RLS real vía current_tenant()/es_superadmin().
--
-- Columna `dominio` queda acá (no en `prestadoras`) porque la resolución de
-- tenant en rutas públicas sin sesión (schema_multitenant_05.sql) necesita
-- exactamente los mismos datos que hoy expone /api/configuracion-publica:
-- una sola consulta por dominio entrega prestadora_id + nombre/teléfono/email.
--
-- Ejecutar una sola vez contra Supabase real. Al final: NOTIFY pgrst, 'reload schema';
-- (regla 13.2 de CLAUDE.md).
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracion_prestadora (
  prestadora_id UUID PRIMARY KEY REFERENCES prestadoras(id),
  nombre TEXT NOT NULL,
  telefono TEXT,
  whatsapp_numero TEXT,
  email TEXT,
  dominio TEXT UNIQUE,
  zona_cobertura_texto TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migra la fila única existente al primer licenciatario real (mismo UUID sembrado
-- en schema_multitenant_01.sql:58). Es un hecho histórico puntual, no una regla de
-- arquitectura — por eso sí lleva el prestadora_id real acá.
INSERT INTO configuracion_prestadora (prestadora_id, nombre, telefono, whatsapp_numero, email, dominio, zona_cobertura_texto)
SELECT '874f54d7-4383-4d54-8b9f-f51d02f0dd11', nombre, telefono, whatsapp_numero, email, dominio, zona_cobertura_texto
FROM configuracion_empresa WHERE id = 1
ON CONFLICT (prestadora_id) DO NOTHING;

ALTER TABLE configuracion_prestadora ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prestadora_lee_su_configuracion" ON configuracion_prestadora
  FOR SELECT USING (
    es_superadmin() OR (
      prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "prestadora_edita_su_configuracion" ON configuracion_prestadora
  FOR UPDATE USING (
    es_superadmin() OR (
      prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

-- No hace falta una policy para lectura pública sin sesión: las rutas sin auth
-- (/api/configuracion-publica y la resolución de tenant por dominio de
-- schema_multitenant_05.sql) usan el cliente `supabase` de connection.js, que
-- corre con la service role key y no pasa por RLS — mismo patrón que ya usa hoy
-- configuracion_empresa.

-- `configuracion_empresa` queda deprecada pero NO se dropea en este archivo: el
-- código que la consume (panelConfiguracion.js, Configuracion.jsx,
-- configuracionPublica.js, panelNotificaciones.js) se migra a
-- configuracion_prestadora en el mismo cambio de código que aplica este SQL — se
-- dropea recién en una migración posterior, una vez confirmado en producción que
-- ya no queda ningún lector.

NOTIFY pgrst, 'reload schema';
