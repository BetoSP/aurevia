-- Módulo 6 (Guardias) — docs/PRD_02_Panel_Admin.md Módulo 6, diseñado en la sesión del
-- 2026-07-10 (ver docs/PLAN_MULTITENANT_PLM.md). Ejecutar una sola vez en el SQL Editor de
-- Supabase, sobre la base ya migrada por schema_multitenant_02.sql (current_tenant() /
-- es_superadmin() ya tienen que existir).
--
-- Principio rector de este archivo, a diferencia de todos los anteriores: `guardias` y las
-- 7 tablas que la acompañan son las PRIMERAS tablas del proyecto creadas después de que el
-- modelo de tenant ya existe. Nacen con `prestadora_id NOT NULL` sin default y sin período
-- de gracia, con RLS desde la primera versión, y con FK COMPUESTA (no solo validación de
-- aplicación) contra cada tabla referenciada que tiene su propio tenant — para que sea
-- estructuralmente imposible, no solo disciplinado, que una fila de estas tablas apunte a un
-- Asistente/Paciente/Guardia de otra prestadora.

-- ============================================================================
-- 0. PRERREQUISITO DE LAS FK COMPUESTAS — UNIQUE(id, prestadora_id) en las tablas
--    ya existentes que las tablas nuevas van a referenciar. Aditivo, no destructivo,
--    no cambia ninguna policy ni comportamiento existente.
-- ============================================================================

ALTER TABLE asistentes ADD CONSTRAINT asistentes_id_prestadora_unique UNIQUE (id, prestadora_id);
ALTER TABLE pacientes ADD CONSTRAINT pacientes_id_prestadora_unique UNIQUE (id, prestadora_id);

-- ============================================================================
-- 1. SERIES_GUARDIAS — el contrato/patrón recurrente al que pueden pertenecer guardias
--    individuales. Necesaria para poder representar "cancelación parcial" (algunos días
--    de un servicio recurrente) sin tener que inferirla mirando filas sueltas de guardias.
-- ============================================================================

CREATE TABLE IF NOT EXISTS series_guardias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  asistente_id UUID NOT NULL,
  paciente_id UUID NOT NULL,
  dias_semana TEXT[] NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  modalidad TEXT NOT NULL,
  vigente_desde DATE NOT NULL,
  vigente_hasta DATE,
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'cancelada')),
  cancelacion_origen TEXT CHECK (cancelacion_origen IN ('familia', 'prestadora')),
  cancelado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT series_guardias_asistente_tenant_fk
    FOREIGN KEY (asistente_id, prestadora_id) REFERENCES asistentes (id, prestadora_id),
  CONSTRAINT series_guardias_paciente_tenant_fk
    FOREIGN KEY (paciente_id, prestadora_id) REFERENCES pacientes (id, prestadora_id),
  CONSTRAINT series_guardias_cancelacion_check
    CHECK (estado = 'cancelada' OR (cancelacion_origen IS NULL AND cancelado_at IS NULL))
);

ALTER TABLE series_guardias ADD CONSTRAINT series_guardias_id_prestadora_unique UNIQUE (id, prestadora_id);

CREATE INDEX IF NOT EXISTS idx_series_guardias_asistente ON series_guardias (asistente_id);
CREATE INDEX IF NOT EXISTS idx_series_guardias_paciente ON series_guardias (paciente_id);

ALTER TABLE series_guardias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_series_guardias" ON series_guardias
  FOR ALL USING (
    es_superadmin() OR (
      series_guardias.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_gestiona_series_guardias_de_su_zona" ON series_guardias
  FOR ALL USING (
    series_guardias.prestadora_id = current_tenant()
    AND EXISTS (
      SELECT 1 FROM usuarios u
      JOIN asistentes a ON a.id = series_guardias.asistente_id
      WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && a.zonas
    )
  );

-- ============================================================================
-- 2. GUARDIAS — la tabla central del módulo. estado incluye 'ausente' como quinto
--    valor (confirmado como necesario, distinto de 'cancelada') y toda la
--    infraestructura preventiva del protocolo de no-show: checkpoint de salida
--    (~1h antes, independiente del check-in de llegada), medio de transporte
--    declarado, y el bloqueo de check-out por continuidad (no retirarse sin relevo).
-- ============================================================================

CREATE TABLE IF NOT EXISTS guardias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  asistente_id UUID NOT NULL,
  paciente_id UUID NOT NULL,
  serie_id UUID,
  coordinador_id UUID REFERENCES usuarios(id),
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  modalidad TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'programada'
    CHECK (estado IN ('programada', 'activa', 'completada', 'cancelada', 'ausente')),
  cancelacion_origen TEXT CHECK (cancelacion_origen IN ('familia', 'prestadora')),
  cancelacion_alcance TEXT CHECK (cancelacion_alcance IN ('parcial', 'total')),

  -- Checkpoint de salida, previo al trayecto (punto 1 del diseño de no-show)
  salida_checkin_at TIMESTAMPTZ,
  salida_lat DOUBLE PRECISION,
  salida_lng DOUBLE PRECISION,
  medio_transporte TEXT,

  -- Check-in/check-out de llegada y fin, ya contemplados en el diseño original
  checkin_at TIMESTAMPTZ,
  checkin_lat DOUBLE PRECISION,
  checkin_lng DOUBLE PRECISION,
  checkout_at TIMESTAMPTZ,
  checkout_lat DOUBLE PRECISION,
  checkout_lng DOUBLE PRECISION,

  -- Regla de continuidad: no retirarse sin relevo (punto 4 del diseño)
  checkout_bloqueado BOOLEAN NOT NULL DEFAULT false,
  checkout_excepcion_motivo TEXT,
  checkout_excepcion_autorizado_por UUID REFERENCES usuarios(id),
  checkout_excepcion_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT guardias_asistente_tenant_fk
    FOREIGN KEY (asistente_id, prestadora_id) REFERENCES asistentes (id, prestadora_id),
  CONSTRAINT guardias_paciente_tenant_fk
    FOREIGN KEY (paciente_id, prestadora_id) REFERENCES pacientes (id, prestadora_id),
  CONSTRAINT guardias_serie_tenant_fk
    FOREIGN KEY (serie_id, prestadora_id) REFERENCES series_guardias (id, prestadora_id),
  CONSTRAINT guardias_cancelacion_check
    CHECK (estado = 'cancelada' OR (cancelacion_origen IS NULL AND cancelacion_alcance IS NULL))
);

ALTER TABLE guardias ADD CONSTRAINT guardias_id_prestadora_unique UNIQUE (id, prestadora_id);

CREATE INDEX IF NOT EXISTS idx_guardias_asistente ON guardias (asistente_id);
CREATE INDEX IF NOT EXISTS idx_guardias_paciente ON guardias (paciente_id);
CREATE INDEX IF NOT EXISTS idx_guardias_fecha ON guardias (fecha);
CREATE INDEX IF NOT EXISTS idx_guardias_serie ON guardias (serie_id);

ALTER TABLE guardias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_guardias" ON guardias
  FOR ALL USING (
    es_superadmin() OR (
      guardias.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_gestiona_guardias_de_su_zona" ON guardias
  FOR ALL USING (
    guardias.prestadora_id = current_tenant()
    AND EXISTS (
      SELECT 1 FROM usuarios u
      JOIN asistentes a ON a.id = guardias.asistente_id
      WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && a.zonas
    )
  );

-- ============================================================================
-- 3. DOMICILIOS_TEMPORALES_PACIENTE — relocalización temporal (punto 3 del diseño).
--    RLS sin filtro de zona, a propósito: `pacientes` mismo no tiene columna de zona
--    (deuda técnica ya documentada en docs/PROGRESS.md) y su RLS de hoy ya deja que
--    Coordinador vea todos los pacientes del tenant sin restricción de zona. Esta
--    tabla es consistente con ese mismo gap ya aceptado, no inventa uno nuevo.
-- ============================================================================

CREATE TABLE IF NOT EXISTS domicilios_temporales_paciente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  paciente_id UUID NOT NULL,
  domicilio TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  motivo TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT domicilios_temp_paciente_tenant_fk
    FOREIGN KEY (paciente_id, prestadora_id) REFERENCES pacientes (id, prestadora_id)
);

CREATE INDEX IF NOT EXISTS idx_domicilios_temp_paciente ON domicilios_temporales_paciente (paciente_id);

ALTER TABLE domicilios_temporales_paciente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_domicilios_temporales" ON domicilios_temporales_paciente
  FOR ALL USING (
    es_superadmin() OR (
      domicilios_temporales_paciente.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin_prestadora', 'coordinador'))
    )
  );

-- ============================================================================
-- 4. PERSONAL_EMERGENCIA — roster de franqueros/personal de emergencia (punto 4).
--    No es zonal (el objetivo es encontrar a cualquiera disponible) — admin gestiona,
--    coordinador lee el roster completo de su tenant.
-- ============================================================================

CREATE TABLE IF NOT EXISTS personal_emergencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  asistente_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('franquero', 'emergencia')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT personal_emergencia_asistente_tenant_fk
    FOREIGN KEY (asistente_id, prestadora_id) REFERENCES asistentes (id, prestadora_id)
);

ALTER TABLE personal_emergencia ADD CONSTRAINT personal_emergencia_id_prestadora_unique UNIQUE (id, prestadora_id);

ALTER TABLE personal_emergencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestiona_personal_emergencia" ON personal_emergencia
  FOR ALL USING (
    es_superadmin() OR (
      personal_emergencia.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_lee_personal_emergencia" ON personal_emergencia
  FOR SELECT USING (
    personal_emergencia.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
  );

-- ============================================================================
-- 5. INCIDENTES_RELEVO — máquina de estados del protocolo de escalada (punto 4).
--    guardia_saliente_id es NULLABLE a propósito: contempla el caso "ausente sin
--    handoff" (primera guardia del día, nadie de la prestadora estaba presente antes),
--    identificado como el de mayor riesgo porque el paciente puede quedar
--    completamente solo. guardia_entrante_id es siempre obligatorio — ese es el
--    Asistente que no se presentó.
-- ============================================================================

CREATE TABLE IF NOT EXISTS incidentes_relevo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  guardia_saliente_id UUID,
  guardia_entrante_id UUID NOT NULL,
  nivel_actual INTEGER NOT NULL DEFAULT 1,
  iniciado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resuelto_at TIMESTAMPTZ,
  resuelto_por_tipo TEXT CHECK (resuelto_por_tipo IN ('suplente', 'franquero', 'emergencia', 'familiar')),
  resuelto_por_id UUID,

  CONSTRAINT incidentes_relevo_saliente_tenant_fk
    FOREIGN KEY (guardia_saliente_id, prestadora_id) REFERENCES guardias (id, prestadora_id),
  CONSTRAINT incidentes_relevo_entrante_tenant_fk
    FOREIGN KEY (guardia_entrante_id, prestadora_id) REFERENCES guardias (id, prestadora_id),
  -- FK compuesta sobre resuelto_por_id: MATCH SIMPLE (default de Postgres) no valida la
  -- FK cuando cualquiera de las dos columnas es NULL — no hace falta ningún trigger para
  -- que esto sea "condicional", es el comportamiento estándar de una FK nullable.
  CONSTRAINT incidentes_relevo_resuelto_tenant_fk
    FOREIGN KEY (resuelto_por_id, prestadora_id) REFERENCES asistentes (id, prestadora_id),
  CONSTRAINT incidentes_relevo_resuelto_por_check
    CHECK ((resuelto_por_id IS NULL) = (resuelto_por_tipo = 'familiar' OR resuelto_por_tipo IS NULL))
);

ALTER TABLE incidentes_relevo ADD CONSTRAINT incidentes_relevo_id_prestadora_unique UNIQUE (id, prestadora_id);

CREATE INDEX IF NOT EXISTS idx_incidentes_relevo_saliente ON incidentes_relevo (guardia_saliente_id);
CREATE INDEX IF NOT EXISTS idx_incidentes_relevo_entrante ON incidentes_relevo (guardia_entrante_id);

ALTER TABLE incidentes_relevo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_incidentes_relevo" ON incidentes_relevo
  FOR ALL USING (
    es_superadmin() OR (
      incidentes_relevo.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

-- Coordinador ve el incidente si la guardia ENTRANTE está en su zona, O (cuando exista)
-- si la guardia SALIENTE lo está — nunca una condición que dependa de que las dos
-- columnas tengan valor, porque guardia_saliente_id es NULL justo en el caso "ausente
-- sin handoff", que es el más grave de todos y no puede quedar invisible para Coordinador.
CREATE POLICY "coordinador_gestiona_incidentes_relevo_de_su_zona" ON incidentes_relevo
  FOR ALL USING (
    incidentes_relevo.prestadora_id = current_tenant()
    AND (
      EXISTS (
        SELECT 1 FROM usuarios u
        JOIN guardias ge ON ge.id = incidentes_relevo.guardia_entrante_id
        JOIN asistentes ae ON ae.id = ge.asistente_id
        WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && ae.zonas
      )
      OR (
        incidentes_relevo.guardia_saliente_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM usuarios u
          JOIN guardias gs ON gs.id = incidentes_relevo.guardia_saliente_id
          JOIN asistentes as2 ON as2.id = gs.asistente_id
          WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && as2.zonas
        )
      )
    )
  );

-- ============================================================================
-- 6. CONFIGURACION_ESCALADA_RELEVO — tiempos, orden de prioridad y plantillas de
--    mensaje del protocolo de escalada. Configuración propia de cada prestadora
--    (mismo patrón que escalas_legales: valores ajustables sin tocar código). Los
--    valores de negocio (minutos_demora, orden_prioridad) quedan sin cargar hasta
--    que el Desarrollador los defina — la fila puede existir con plantilla_mensaje
--    cargado y esos dos todavía en NULL (un nivel sin timing simplemente no se
--    dispara; un nivel sin mensaje podría fallar en silencio, por eso ese campo
--    es NOT NULL desde el principio).
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracion_escalada_relevo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  nivel INTEGER NOT NULL,
  minutos_demora INTEGER,
  orden_prioridad TEXT[],
  plantilla_mensaje TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (prestadora_id, nivel)
);

ALTER TABLE configuracion_escalada_relevo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestiona_configuracion_escalada_relevo" ON configuracion_escalada_relevo
  FOR ALL USING (
    es_superadmin() OR (
      configuracion_escalada_relevo.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_lee_configuracion_escalada_relevo" ON configuracion_escalada_relevo
  FOR SELECT USING (
    configuracion_escalada_relevo.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
  );

-- ============================================================================
-- 7. EXCEPCIONES_FAMILIAR_RELEVO — registro trazable de la única excepción admisible
--    a "el paciente no puede quedar solo": un familiar acepta quedarse hasta que
--    llegue el relevo. Mismo nivel de trazabilidad que el reporte diario/GPS, porque
--    cumple la misma función (prueba del servicio ante un reclamo).
-- ============================================================================

CREATE TABLE IF NOT EXISTS excepciones_familiar_relevo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  incidente_id UUID NOT NULL,
  familiar_nombre TEXT NOT NULL,
  autorizado_por UUID NOT NULL REFERENCES usuarios(id),
  motivo TEXT NOT NULL,
  desde_at TIMESTAMPTZ NOT NULL,
  hasta_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT excepciones_familiar_relevo_incidente_tenant_fk
    FOREIGN KEY (incidente_id, prestadora_id) REFERENCES incidentes_relevo (id, prestadora_id)
);

CREATE INDEX IF NOT EXISTS idx_excepciones_familiar_relevo_incidente ON excepciones_familiar_relevo (incidente_id);

ALTER TABLE excepciones_familiar_relevo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_excepciones_familiar_relevo" ON excepciones_familiar_relevo
  FOR ALL USING (
    es_superadmin() OR (
      excepciones_familiar_relevo.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_gestiona_excepciones_familiar_relevo_de_su_zona" ON excepciones_familiar_relevo
  FOR ALL USING (
    excepciones_familiar_relevo.prestadora_id = current_tenant()
    AND (
      EXISTS (
        SELECT 1 FROM usuarios u
        JOIN incidentes_relevo ir ON ir.id = excepciones_familiar_relevo.incidente_id
        JOIN guardias ge ON ge.id = ir.guardia_entrante_id
        JOIN asistentes ae ON ae.id = ge.asistente_id
        WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && ae.zonas
      )
      OR EXISTS (
        SELECT 1 FROM usuarios u
        JOIN incidentes_relevo ir ON ir.id = excepciones_familiar_relevo.incidente_id
        JOIN guardias gs ON gs.id = ir.guardia_saliente_id
        JOIN asistentes as2 ON as2.id = gs.asistente_id
        WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && as2.zonas
      )
    )
  );

-- ============================================================================
-- 8. GUARDIAS_TRACKING_GPS — trayecto continuo del Asistente (punto 1 del diseño de
--    no-show), separado del check-in/check-out puntual porque acumula muchas filas
--    por guardia.
--
--    BLOQUEANTE EXPLÍCITO, no usar con datos reales de producción todavía: dato de
--    ubicación en tiempo real de personas es sensible bajo Ley 25.326 y esta tabla
--    no tiene política de retención definida. La tabla puede existir desde ahora
--    (diseño de schema), pero la función que la escribe no se activa contra
--    pacientes/Asistentes reales hasta que exista esa política.
-- ============================================================================

CREATE TABLE IF NOT EXISTS guardias_tracking_gps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  guardia_id UUID NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  registrado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT guardias_tracking_gps_guardia_tenant_fk
    FOREIGN KEY (guardia_id, prestadora_id) REFERENCES guardias (id, prestadora_id)
);

CREATE INDEX IF NOT EXISTS idx_guardias_tracking_gps_guardia ON guardias_tracking_gps (guardia_id);

ALTER TABLE guardias_tracking_gps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panel_gestiona_guardias_tracking_gps" ON guardias_tracking_gps
  FOR ALL USING (
    es_superadmin() OR (
      guardias_tracking_gps.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_gestiona_guardias_tracking_gps_de_su_zona" ON guardias_tracking_gps
  FOR ALL USING (
    guardias_tracking_gps.prestadora_id = current_tenant()
    AND EXISTS (
      SELECT 1 FROM usuarios u
      JOIN guardias g ON g.id = guardias_tracking_gps.guardia_id
      JOIN asistentes a ON a.id = g.asistente_id
      WHERE u.id = auth.uid() AND u.rol = 'coordinador' AND u.zonas && a.zonas
    )
  );
