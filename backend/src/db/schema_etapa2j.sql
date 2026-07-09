-- Etapa 2J — cierre de hallazgo de auditoría (2026-07-09): la policy RLS de UPDATE para
-- Coordinador sobre "asistentes" (schema_etapa2i.sql, "coordinador_edita_asistentes_de_su_zona")
-- es row-level únicamente — deja pasar la fila completa de un Asistente de su zona, sin
-- restringir qué columnas puede tocar. El frontend (PerfilTab.jsx) solo oculta los campos
-- laborales sensibles (sueldo_basico, valor_hora, categoria_cct, tipo_vinculo, causal_baja,
-- fecha_baja, vencimiento_monotributo/art/seguro, score_riesgo_reclasificacion,
-- indicadores_riesgo) cuando el usuario no es Admin — eso es UI, no seguridad: un Coordinador
-- podía escribir esos campos directo vía supabase.from('asistentes').update(...) desde la
-- consola del navegador. Postgres RLS no soporta restricción por columna dentro de una misma
-- policy, así que la barrera real es un trigger BEFORE UPDATE (regla 8 de CLAUDE.md).

CREATE OR REPLACE FUNCTION bloquear_edicion_laboral_coordinador()
RETURNS TRIGGER AS $$
DECLARE
  rol_actual TEXT;
BEGIN
  SELECT rol INTO rol_actual FROM usuarios WHERE id = auth.uid();

  IF rol_actual = 'coordinador' THEN
    IF NEW.tipo_vinculo IS DISTINCT FROM OLD.tipo_vinculo
      OR NEW.categoria_cct IS DISTINCT FROM OLD.categoria_cct
      OR NEW.valor_hora IS DISTINCT FROM OLD.valor_hora
      OR NEW.sueldo_basico IS DISTINCT FROM OLD.sueldo_basico
      OR NEW.horas_semanales IS DISTINCT FROM OLD.horas_semanales
      OR NEW.causal_baja IS DISTINCT FROM OLD.causal_baja
      OR NEW.fecha_baja IS DISTINCT FROM OLD.fecha_baja
      OR NEW.vencimiento_monotributo IS DISTINCT FROM OLD.vencimiento_monotributo
      OR NEW.vencimiento_art IS DISTINCT FROM OLD.vencimiento_art
      OR NEW.vencimiento_seguro IS DISTINCT FROM OLD.vencimiento_seguro
      OR NEW.score_riesgo_reclasificacion IS DISTINCT FROM OLD.score_riesgo_reclasificacion
      OR NEW.indicadores_riesgo IS DISTINCT FROM OLD.indicadores_riesgo
    THEN
      RAISE EXCEPTION 'Coordinador no puede modificar datos laborales internos del Asistente (regla 8 de CLAUDE.md)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_bloquear_edicion_laboral_coordinador ON asistentes;
CREATE TRIGGER trigger_bloquear_edicion_laboral_coordinador
BEFORE UPDATE ON asistentes
FOR EACH ROW
EXECUTE FUNCTION bloquear_edicion_laboral_coordinador();
