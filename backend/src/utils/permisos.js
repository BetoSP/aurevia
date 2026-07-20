import { supabase } from '../db/connection.js';

// Acciones cuyo default (sin fila configurada en permisos_prestadora) es "solo admin" —
// espejo en JS de la lógica de la función SQL `tiene_permiso()`
// (backend/src/db/schema_permisos_prestadora_01.sql). Se duplica acá porque el alta manual
// corre en Express con la service role key, sin auth.uid(), así que la función SQL
// (pensada para RLS) no aplica en este contexto.
const ACCIONES_DEFAULT_SOLO_ADMIN = new Set(['alta_manual_asistente', 'alta_manual_familia', 'importar_datos_masivos']);

export const ACCIONES_PERMISOS = [
  'alta_manual_asistente',
  'alta_manual_familia',
  'editar_identidad_asistente',
  'editar_datos_familia',
  'editar_datos_paciente',
  'importar_datos_masivos',
];

export async function tienePermiso({ accion, rol, usuarioId, prestadoraId }) {
  if (['admin_prestadora', 'superadmin'].includes(rol)) return true;
  if (rol !== 'coordinador') return false;

  const { data: cfg } = await supabase
    .from('permisos_prestadora')
    .select('alcance, excepciones_permitir, excepciones_denegar')
    .eq('prestadora_id', prestadoraId)
    .eq('accion', accion)
    .maybeSingle();

  if (!cfg) return !ACCIONES_DEFAULT_SOLO_ADMIN.has(accion);
  if ((cfg.excepciones_denegar || []).includes(usuarioId)) return false;
  if ((cfg.excepciones_permitir || []).includes(usuarioId)) return true;
  return cfg.alcance === 'admin_y_coordinador';
}
