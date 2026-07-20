-- Fase 3 del plan "Terminar la Etapa 2 (Panel)" (importación masiva de datos con IA):
-- registro de auditoría de cada importación (quién, cuándo, cuántas filas, con qué
-- resultado) — ver alcance de la Fase 3 en el plan aprobado. No reemplaza el pendiente
-- de un log general de actividad de Prestadora (ver "Pendiente relacionado" del plan):
-- queda acotado a importaciones.

CREATE TABLE IF NOT EXISTS importaciones_prestadora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('asistente', 'familia')),
  archivo_nombre TEXT,
  filas_totales INTEGER NOT NULL DEFAULT 0,
  filas_creadas INTEGER NOT NULL DEFAULT 0,
  filas_error INTEGER NOT NULL DEFAULT 0,
  errores JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE importaciones_prestadora ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_lee_importaciones_de_su_prestadora" ON importaciones_prestadora;
CREATE POLICY "admin_lee_importaciones_de_su_prestadora" ON importaciones_prestadora
  FOR SELECT USING (
    es_superadmin() OR (
      importaciones_prestadora.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

-- El INSERT del registro de auditoría lo hace siempre el backend con la service role key
-- (backend/src/routes/panelImportacion.js) — no hace falta policy de INSERT para
-- `authenticated`, ninguna sesión de usuario escribe acá directo.

NOTIFY pgrst, 'reload schema';
