-- Etapa 2 — Precios y Prestaciones particulares por Paciente. Primer esquema de trabajo,
-- pensado para evolucionar con el uso real (no es un diseño cerrado) — ver docs/PROGRESS.md.
--
-- Modelo (confirmado con el usuario): la lista de precios es solo una referencia interna,
-- nunca vinculante ni visible fuera del panel (regla de negocio explícita: ningún medio
-- público habla de precios). Lo que realmente rige para cada Familia es la Prestación
-- particular, que guarda una FOTO del precio de lista al momento de armarla — no una
-- referencia viva — para que un cambio posterior en la lista general no mueva un precio ya
-- pactado con una familia. Cuando la lista general cambia, se marca la Prestación vigente
-- como "a revisar" (vía trigger) para que el Coordinador decida — nunca se ajusta solo.

CREATE TABLE IF NOT EXISTS lista_precios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo_servicio TEXT NOT NULL,
  modalidad TEXT NOT NULL,
  precio NUMERIC(12,2) NOT NULL,
  vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lista_precios ENABLE ROW LEVEL SECURITY;

-- Es dato comercial interno (nunca público), pero el Coordinador la necesita para cotizar —
-- a diferencia de escalas_legales, que sí está vedada para Coordinador por SECURITY.md.
CREATE POLICY "panel_lee_lista_precios" ON lista_precios
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

-- Solo Admin la edita — es la referencia que usa todo el equipo comercial, un cambio mal
-- hecho afecta a todos los presupuestos futuros.
CREATE POLICY "admin_edita_lista_precios" ON lista_precios
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin')
  );
CREATE POLICY "admin_actualiza_lista_precios" ON lista_precios
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin')
  );
CREATE POLICY "admin_borra_lista_precios" ON lista_precios
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin')
  );

CREATE TABLE IF NOT EXISTS prestaciones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  tipo_servicio TEXT NOT NULL,
  -- Días, horario, cantidad de guardias, feriados, viajes, internación, etc. — particular de
  -- cada Paciente. JSONB (mismo patrón que asistentes.disponibilidad) para no tener que
  -- migrar la tabla cada vez que aparece un caso nuevo.
  configuracion JSONB NOT NULL DEFAULT '{}',
  precio_lista_id BIGINT REFERENCES lista_precios(id),
  precio_lista_snapshot NUMERIC(12,2),
  tipo_descuento TEXT CHECK (tipo_descuento IN ('porcentaje', 'monto_fijo')),
  valor_descuento NUMERIC(12,2),
  precio_final NUMERIC(12,2) NOT NULL,
  nota TEXT,
  estado TEXT NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'de_baja')),
  requiere_revision BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prestaciones ENABLE ROW LEVEL SECURITY;

-- Dato económico/de salud del Paciente (regla 7/8 de CLAUDE.md) — solo Admin/Coordinador.
CREATE POLICY "panel_gestiona_prestaciones" ON prestaciones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

CREATE TABLE IF NOT EXISTS paquetes_prestaciones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  nombre TEXT,
  precio_paquete NUMERIC(12,2) NOT NULL,
  nota TEXT,
  estado TEXT NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'de_baja')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE paquetes_prestaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_paquetes" ON paquetes_prestaciones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

-- Un paquete agrupa Prestaciones existentes del mismo Paciente; el precio del paquete es
-- negociado aparte, no se deriva de sumar las partes (ver docs/PROGRESS.md).
CREATE TABLE IF NOT EXISTS paquete_prestacion_items (
  paquete_id BIGINT NOT NULL REFERENCES paquetes_prestaciones(id),
  prestacion_id BIGINT NOT NULL REFERENCES prestaciones(id),
  PRIMARY KEY (paquete_id, prestacion_id)
);

ALTER TABLE paquete_prestacion_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_paquete_items" ON paquete_prestacion_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'coordinador'))
  );

-- Cuando cambia un precio de la lista general, las Prestaciones vigentes que se armaron con
-- ese precio quedan marcadas "a revisar" para que el Coordinador decida qué hacer — nunca
-- se les toca el precio_final solas.
CREATE OR REPLACE FUNCTION marcar_prestaciones_a_revisar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.precio IS DISTINCT FROM OLD.precio THEN
    UPDATE prestaciones
    SET requiere_revision = true
    WHERE precio_lista_id = NEW.id AND estado = 'vigente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_precio_lista_actualizado
AFTER UPDATE ON lista_precios
FOR EACH ROW
EXECUTE FUNCTION marcar_prestaciones_a_revisar();
