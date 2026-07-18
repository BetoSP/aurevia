-- WhatsApp + IA (pendiente #9 de docs/PENDIENTES.md, diseño cerrado en docs/PRD_06_WhatsApp_IA.md
-- puntos A-E, 2026-07-13). Ejecutar una sola vez en el SQL Editor de Supabase, sobre la base ya
-- migrada por schema_multitenant_02.sql y schema_modulo6_guardias_03.sql (current_tenant() /
-- es_superadmin() ya tienen que existir).
--
-- Incluye, como prerrequisito aprobado por el Desarrollador el 2026-07-13 (pendiente #18,
-- candidato 9): la corrección de aislamiento multi-tenant de configuracion_notificaciones,
-- que había quedado afuera de schema_multitenant_02.sql sin prestadora_id.
--
-- Cada prestadora nueva que se incorpore necesita, además de este schema ya aplicado una sola
-- vez, sus propias filas en configuracion_notificaciones (2 eventos), configuracion_whatsapp_prestadora
-- y configuracion_escalada_coordinador — mismo patrón manual que configuracion_ausencia_automatica
-- (schema_modulo6_guardias_03.sql), no hay todavía un alta automática de prestadora.

-- ============================================================================
-- 0. FIX: configuracion_notificaciones pasa a ser por prestadora (antes era una fila
--    global por evento, compartida sin darse cuenta por todas las prestadoras licenciatarias).
--    Se suma también whatsapp_activo (antes solo existía el canal email).
-- ============================================================================

ALTER TABLE configuracion_notificaciones ADD COLUMN IF NOT EXISTS prestadora_id UUID REFERENCES prestadoras(id);
ALTER TABLE configuracion_notificaciones ADD COLUMN IF NOT EXISTS whatsapp_activo BOOLEAN NOT NULL DEFAULT false;

UPDATE configuracion_notificaciones
SET prestadora_id = '874f54d7-4383-4d54-8b9f-f51d02f0dd11'
WHERE prestadora_id IS NULL;

ALTER TABLE configuracion_notificaciones ALTER COLUMN prestadora_id SET NOT NULL;
ALTER TABLE configuracion_notificaciones DROP CONSTRAINT IF EXISTS configuracion_notificaciones_pkey;
ALTER TABLE configuracion_notificaciones ADD PRIMARY KEY (evento, prestadora_id);

DROP POLICY IF EXISTS "panel_gestiona_configuracion_notificaciones" ON configuracion_notificaciones;

CREATE POLICY "admin_gestiona_configuracion_notificaciones" ON configuracion_notificaciones
  FOR ALL USING (
    es_superadmin() OR (
      configuracion_notificaciones.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_lee_configuracion_notificaciones" ON configuracion_notificaciones
  FOR SELECT USING (
    configuracion_notificaciones.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
  );

-- Eventos nuevos que dispara el cron de continuidad de guardia (backend/src/utils/
-- revisarNotificacionesCoordinador.js) — sin esta fila, notificarCoordinador() cae al
-- inbox operativo por defecto (comportamiento seguro, ver backend/src/utils/email.js) pero
-- es mejor dejarlos configurables desde ya.
INSERT INTO configuracion_notificaciones (evento, prestadora_id, descripcion, emails) VALUES
  ('alerta_temprana_guardia', '874f54d7-4383-4d54-8b9f-f51d02f0dd11', 'Alerta temprana de posible ausencia en una guardia', '{}'),
  ('incidente_relevo_sin_resolver', '874f54d7-4383-4d54-8b9f-f51d02f0dd11', 'Incidente de relevo todavía sin resolver, según los umbrales de insistencia configurados', '{}')
ON CONFLICT (evento, prestadora_id) DO NOTHING;

-- Los seeds de configuracion_escalada_coordinador y configuracion_whatsapp_prestadora se
-- hacen al final del archivo (sección 7) — esas tablas recién se crean en las secciones 4 y 1
-- respectivamente, y un INSERT no puede correr antes de que exista la tabla. Bug real
-- encontrado 2026-07-13 al aplicar este archivo contra Supabase: apply_migration no aborta el
-- resto del batch si un statement individual falla, así que el error quedó silencioso hasta
-- verificarlo con una consulta aparte — ver docs/PENDIENTES.md #22.

-- ============================================================================
-- 1. CONFIGURACION_WHATSAPP_PRESTADORA — credenciales de Meta Cloud API por prestadora.
--    El token nunca se guarda en texto plano en esta tabla: se guarda en Supabase Vault
--    y acá solo se referencia su id (token_secret_id). Guardar/leer el valor real pasa
--    únicamente por las funciones SECURITY DEFINER de la sección 2, ejecutables solo con
--    el service role (el mismo que ya usa el backend, ver backend/src/db/connection.js) —
--    el Panel nunca vuelve a mostrar el token una vez guardado.
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracion_whatsapp_prestadora (
  prestadora_id UUID PRIMARY KEY REFERENCES prestadoras(id),
  activo BOOLEAN NOT NULL DEFAULT false,
  numero_telefono TEXT,
  waba_id TEXT,
  phone_number_id TEXT,
  token_secret_id UUID,
  verificado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE configuracion_whatsapp_prestadora ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestiona_configuracion_whatsapp_prestadora" ON configuracion_whatsapp_prestadora
  FOR ALL USING (
    es_superadmin() OR (
      configuracion_whatsapp_prestadora.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

-- ============================================================================
-- 2. Funciones de Vault (guardar/leer el token real) — ejecutables solo por service_role,
--    nunca por el Panel ni por ningún rol de usuario final.
-- ============================================================================

CREATE OR REPLACE FUNCTION guardar_token_whatsapp(p_prestadora_id UUID, p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  SELECT token_secret_id INTO v_secret_id
  FROM configuracion_whatsapp_prestadora
  WHERE prestadora_id = p_prestadora_id;

  IF v_secret_id IS NULL THEN
    v_secret_id := vault.create_secret(p_token, 'whatsapp_token_' || p_prestadora_id::text);
    UPDATE configuracion_whatsapp_prestadora
    SET token_secret_id = v_secret_id, updated_at = NOW()
    WHERE prestadora_id = p_prestadora_id;
  ELSE
    PERFORM vault.update_secret(v_secret_id, p_token);
    UPDATE configuracion_whatsapp_prestadora SET updated_at = NOW() WHERE prestadora_id = p_prestadora_id;
  END IF;

  RETURN v_secret_id;
END;
$$;

REVOKE ALL ON FUNCTION guardar_token_whatsapp(UUID, TEXT) FROM PUBLIC;
-- Supabase otorga EXECUTE a anon/authenticated por defecto en funciones nuevas del
-- schema public; el REVOKE ALL FROM PUBLIC de arriba no alcanza a revocar esos grants
-- directos (bug real encontrado y corregido 2026-07-18: permitía leer/pisar el token de
-- WhatsApp de cualquier prestadora vía RPC directo de PostgREST, sin pasar por RLS).
REVOKE EXECUTE ON FUNCTION guardar_token_whatsapp(UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION guardar_token_whatsapp(UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION leer_token_whatsapp(p_prestadora_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id UUID;
  v_token TEXT;
BEGIN
  SELECT token_secret_id INTO v_secret_id
  FROM configuracion_whatsapp_prestadora
  WHERE prestadora_id = p_prestadora_id;

  IF v_secret_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_token FROM vault.decrypted_secrets WHERE id = v_secret_id;
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION leer_token_whatsapp(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION leer_token_whatsapp(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION leer_token_whatsapp(UUID) TO service_role;

-- ============================================================================
-- 3. PLANTILLAS_WHATSAPP — mensajes pre-aprobados por Meta (requisito de la Cloud API
--    para cualquier mensaje que inicia la prestadora, no una respuesta dentro de las 24hs
--    de una conversación abierta por el Asistente/Familia).
-- ============================================================================

CREATE TABLE IF NOT EXISTS plantillas_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  nombre_interno TEXT NOT NULL,
  categoria TEXT NOT NULL,
  idioma TEXT NOT NULL DEFAULT 'es-AR',
  cuerpo_texto TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviada_meta', 'aprobada', 'rechazada')),
  meta_template_id TEXT,
  motivo_rechazo TEXT,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (prestadora_id, nombre_interno)
);

ALTER TABLE plantillas_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestiona_plantillas_whatsapp" ON plantillas_whatsapp
  FOR ALL USING (
    es_superadmin() OR (
      plantillas_whatsapp.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_lee_plantillas_whatsapp" ON plantillas_whatsapp
  FOR SELECT USING (
    plantillas_whatsapp.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
  );

-- ============================================================================
-- 4. CONFIGURACION_ESCALADA_COORDINADOR — coordinador de respaldo + intervalos de
--    insistencia según premura (todo parametrizable por prestadora, punto E de
--    docs/PRD_06_WhatsApp_IA.md). umbrales_premura es un array ordenado de tramos;
--    el último tramo con maximo_minutos NULL es el que aplica en adelante.
--    Ejemplo del valor por defecto: hasta 60' de premura, insistir cada 10'; de 60' a
--    240', cada 30'; pasado eso, cada 60'.
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracion_escalada_coordinador (
  prestadora_id UUID PRIMARY KEY REFERENCES prestadoras(id),
  coordinador_backup_id UUID REFERENCES usuarios(id),
  minutos_antes_backup INTEGER NOT NULL DEFAULT 15,
  umbrales_premura JSONB NOT NULL DEFAULT '[
    {"maximo_minutos": 60, "intervalo_minutos": 10},
    {"maximo_minutos": 240, "intervalo_minutos": 30},
    {"maximo_minutos": null, "intervalo_minutos": 60}
  ]'::jsonb,
  fase_automatica_activa BOOLEAN NOT NULL DEFAULT false,
  minutos_antes_fase_automatica INTEGER NOT NULL DEFAULT 120,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE configuracion_escalada_coordinador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestiona_configuracion_escalada_coordinador" ON configuracion_escalada_coordinador
  FOR ALL USING (
    es_superadmin() OR (
      configuracion_escalada_coordinador.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_lee_configuracion_escalada_coordinador" ON configuracion_escalada_coordinador
  FOR SELECT USING (
    configuracion_escalada_coordinador.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
  );

-- ============================================================================
-- 5. Seguimiento de insistencia sobre alertas/incidentes ya existentes — necesario para
--    que el cron nuevo (revisarNotificacionesCoordinador, backend/src/utils) sepa cuándo
--    ya avisó y cuándo le toca volver a insistir, sin mandar el mismo aviso en cada corrida.
-- ============================================================================

ALTER TABLE alertas_tempranas_guardia ADD COLUMN IF NOT EXISTS ultima_notificacion_at TIMESTAMPTZ;
ALTER TABLE alertas_tempranas_guardia ADD COLUMN IF NOT EXISTS veces_notificado INTEGER NOT NULL DEFAULT 0;
ALTER TABLE alertas_tempranas_guardia ADD COLUMN IF NOT EXISTS backup_notificado_at TIMESTAMPTZ;

ALTER TABLE incidentes_relevo ADD COLUMN IF NOT EXISTS ultima_notificacion_at TIMESTAMPTZ;
ALTER TABLE incidentes_relevo ADD COLUMN IF NOT EXISTS veces_notificado INTEGER NOT NULL DEFAULT 0;
ALTER TABLE incidentes_relevo ADD COLUMN IF NOT EXISTS backup_notificado_at TIMESTAMPTZ;
-- Se completa cuando el cron detecta que pasó minutos_antes_fase_automatica sin resolverse.
-- El envío automático del mensaje de nivel a los Asistentes (orden_prioridad) requiere una
-- plantilla de WhatsApp aprobada por Meta — queda para el test final con una prestadora real
-- (decisión del Desarrollador, 2026-07-13); por ahora esta columna solo registra que el
-- Coordinador fue notificado de que la fase automática debería haber arrancado.
ALTER TABLE incidentes_relevo ADD COLUMN IF NOT EXISTS fase_automatica_notificada_at TIMESTAMPTZ;

-- ============================================================================
-- 6. CONVERSACIONES_WHATSAPP / MENSAJES_WHATSAPP — punto 6 del diseño (mensajes entrantes,
--    la IA redacta o responde según el caso, el Coordinador siempre puede ver la conversación
--    completa). Se construye acá el schema completo; la parte del webhook que recibe
--    mensajes reales de Meta se completa en el test final con una prestadora real
--    (decisión explícita del Desarrollador, 2026-07-13).
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversaciones_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  telefono TEXT NOT NULL,
  asistente_id UUID REFERENCES asistentes(id),
  ultimo_mensaje_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requiere_atencion_coordinador BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (prestadora_id, telefono)
);

ALTER TABLE conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestiona_conversaciones_whatsapp" ON conversaciones_whatsapp
  FOR ALL USING (
    es_superadmin() OR (
      conversaciones_whatsapp.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_gestiona_conversaciones_whatsapp" ON conversaciones_whatsapp
  FOR ALL USING (
    conversaciones_whatsapp.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
  );

CREATE TABLE IF NOT EXISTS mensajes_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  conversacion_id UUID NOT NULL REFERENCES conversaciones_whatsapp(id),
  direccion TEXT NOT NULL CHECK (direccion IN ('entrante', 'saliente')),
  texto TEXT NOT NULL,
  generado_por_ia BOOLEAN NOT NULL DEFAULT false,
  enviado_automaticamente BOOLEAN NOT NULL DEFAULT false,
  revisado_por_coordinador_at TIMESTAMPTZ,
  meta_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_whatsapp_conversacion ON mensajes_whatsapp (conversacion_id);

ALTER TABLE mensajes_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestiona_mensajes_whatsapp" ON mensajes_whatsapp
  FOR ALL USING (
    es_superadmin() OR (
      mensajes_whatsapp.prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

CREATE POLICY "coordinador_gestiona_mensajes_whatsapp" ON mensajes_whatsapp
  FOR ALL USING (
    mensajes_whatsapp.prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'coordinador')
  );

-- ============================================================================
-- 7. Seeds de configuración por defecto para la Prestadora Demo (única prestadora real hoy), mismo
--    patrón que configuracion_ausencia_automatica en schema_modulo6_guardias_03.sql —
--    corren acá, después de que las tablas de las secciones 1 y 4 ya existen.
-- ============================================================================

INSERT INTO configuracion_escalada_coordinador (prestadora_id)
VALUES ('874f54d7-4383-4d54-8b9f-f51d02f0dd11')
ON CONFLICT (prestadora_id) DO NOTHING;

INSERT INTO configuracion_whatsapp_prestadora (prestadora_id, activo)
VALUES ('874f54d7-4383-4d54-8b9f-f51d02f0dd11', false)
ON CONFLICT (prestadora_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
