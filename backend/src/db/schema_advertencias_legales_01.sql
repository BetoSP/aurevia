-- Pendiente #51 (docs/PENDIENTES.md) — infraestructura genérica para el mecanismo de
-- advertencias legales de CLAUDE.md §3 (tabla configurable jurisdicción → función → texto,
-- auditoría de activación). Se construye ahora solo la infraestructura: ninguna de las
-- funciones de gestión de Asistentes que debería disparar estas advertencias (penalización
-- de inasistencias, rankings, puntuaciones, niveles/categorías, horarios fijos) existe
-- todavía como toggle real en el producto — no hay ningún consumidor real para engancharla
-- ni para probarla de punta a punta. Queda documentado así a propósito (decisión del
-- Desarrollador 2026-07-18): se prepara la base, la integración con un toggle real queda
-- para cuando ese toggle se construya.

-- ============================================================================
-- 1. Catálogo de advertencias por jurisdicción — contenido curado por Xeitra (superadmin),
--    nunca por la Prestadora. "jurisdiccion" usa el mismo código que prestadoras.pais (ISO
--    3166-1 alpha-2, ej. 'AR') para poder cruzar directo sin tabla de mapeo aparte. El
--    archivo fuente del contenido humano-legible vive en docs/legal/<país>.md (ver esa
--    carpeta para la convención de nombre de archivo por país).
-- ============================================================================
CREATE TABLE IF NOT EXISTS advertencias_legales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiccion TEXT NOT NULL,
  funcion_clave TEXT NOT NULL,
  texto_advertencia TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (jurisdiccion, funcion_clave)
);

ALTER TABLE advertencias_legales ENABLE ROW LEVEL SECURITY;

-- Lectura: los roles que gestionan configuración operativa de una Prestadora necesitan ver
-- la advertencia antes de activar una función — no es dato sensible, es texto informativo.
CREATE POLICY "panel_lee_advertencias_legales" ON advertencias_legales
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin_prestadora', 'admin_plataforma', 'superadmin'))
  );

-- Escritura: solo superadmin — es contenido legal curado por Xeitra (mismo criterio que
-- escalas_legales), nunca una Prestadora decide su propio texto de advertencia.
CREATE POLICY "superadmin_gestiona_advertencias_legales" ON advertencias_legales
  FOR ALL USING (es_superadmin());

-- ============================================================================
-- 2. Auditoría de activación — quién, cuándo, sobre qué Prestadora, qué función, qué texto
--    exacto se le mostró (snapshot, no referencia viva — si el texto de advertencias_legales
--    cambia después, la auditoría histórica no debe cambiar con él).
-- ============================================================================
CREATE TABLE IF NOT EXISTS auditoria_advertencias_legales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES prestadoras(id),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  funcion_clave TEXT NOT NULL,
  jurisdiccion TEXT NOT NULL,
  texto_mostrado TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE auditoria_advertencias_legales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_prestadora_lee_su_auditoria_legal" ON auditoria_advertencias_legales
  FOR SELECT USING (
    es_superadmin() OR (
      prestadora_id = current_tenant()
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
    )
  );

-- Inserta quien active la función, dentro de su propio tenant y a su propio nombre — sin
-- ruta Express dedicada todavía (no hay toggle real que la llame), por eso la escritura se
-- resuelve directo por RLS en vez de una función SECURITY DEFINER como en
-- auditoria_admin_plataforma (schema_admin_plataforma_03_auditoria.sql).
CREATE POLICY "panel_registra_advertencia_mostrada" ON auditoria_advertencias_legales
  FOR INSERT WITH CHECK (
    usuario_id = auth.uid()
    AND prestadora_id = current_tenant()
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin_prestadora')
  );

-- ============================================================================
-- 3. Seed del contenido ya redactado para Argentina (docs/legal/argentina.md) — única
--    jurisdicción con documento legal completo hoy. El resto de los países de
--    docs/legal/*.md son placeholders sin investigar todavía (ver esos archivos) y por eso
--    no tienen fila acá: sin fila = sin advertencia, comportamiento correcto según
--    CLAUDE.md §3 ("si la jurisdicción no tiene documento legal cargado, no se muestra
--    advertencia").
-- ============================================================================
INSERT INTO advertencias_legales (jurisdiccion, funcion_clave, texto_advertencia) VALUES
('AR', 'penalizacion_inasistencias', 'Penalizar inasistencias o inconductas de un Asistente autónomo puede interpretarse como ejercicio de poder disciplinario, un indicio de subordinación bajo el art. 23 de la LCT. Evaluá si esta función es coherente con la modalidad de vínculo de tus Asistentes.'),
('AR', 'rankings', 'Publicar rankings que condicionan el acceso futuro a Guardias puede interpretarse como una forma de control jerárquico propia de una relación de dependencia (art. 23 LCT).'),
('AR', 'puntuacion_aceptacion_guardia', 'Puntuar la aceptación de Guardias y usarlo para asignar futuras oportunidades puede funcionar como una exigencia de disponibilidad, un indicio de subordinación (art. 23 LCT) más que de autonomía real del Asistente.'),
('AR', 'puntuacion_calificacion_familia', 'Condicionar oportunidades futuras a una calificación de terceros puede interpretarse como una forma de evaluación de desempeño propia de una relación laboral (art. 23 LCT).'),
('AR', 'limite_oportunidades_rechazos', 'Limitar a un Asistente autónomo por rechazar Guardias reduce su libertad real de decidir su participación, un elemento central para sostener que la relación es autónoma y no dependiente (art. 23 LCT).'),
('AR', 'niveles_categorias', 'Establecer niveles o categorías jerárquicas puede interpretarse como una estructura organizativa propia de relación de dependencia (art. 23 LCT).'),
('AR', 'horarios_fijos', 'Imponer horarios fijos (en vez de que el Asistente decida su disponibilidad) es uno de los indicios más fuertes de subordinación bajo el art. 23 de la LCT.')
ON CONFLICT (jurisdiccion, funcion_clave) DO NOTHING;

NOTIFY pgrst, 'reload schema';
