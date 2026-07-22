import { supabase } from '../db/connection.js';

// Mismo patrón que requiereRolAsistente.js, acotado al rol `familia` — Etapa 4 (PWA
// Familias).
export async function requiereRolFamilia(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { data: userData, error: errorUsuario } = await supabase.auth.getUser(token);
  if (errorUsuario || !userData?.user) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { data: perfil, error: errorPerfil } = await supabase
    .from('usuarios')
    .select('rol, prestadora_id')
    .eq('id', userData.user.id)
    .single();

  if (errorPerfil || !perfil || perfil.rol !== 'familia') {
    return res.status(403).json({ error: 'Rol sin permiso' });
  }

  // El usuario logueado puede ser el titular de la cuenta (fila propia en `familias`) o
  // alguien invitado al círculo de cuidado (fila en `miembros_familia`, Fase 5) — se
  // resuelve acá una sola vez, no en cada ruta de appFamilias.js.
  const { data: titular } = await supabase
    .from('familias')
    .select('id')
    .eq('id', userData.user.id)
    .maybeSingle();

  let familiaId = titular?.id ?? null;
  let rolCirculo = titular ? 'titular' : null;

  if (!familiaId) {
    const { data: miembro } = await supabase
      .from('miembros_familia')
      .select('familia_id, rol')
      .eq('usuario_id', userData.user.id)
      .maybeSingle();

    familiaId = miembro?.familia_id ?? null;
    rolCirculo = miembro?.rol ?? null;
  }

  if (!familiaId) {
    return res.status(403).json({ error: 'Rol sin permiso' });
  }

  req.usuarioFamilia = {
    id: userData.user.id,
    familiaId,
    rolCirculo,
    prestadoraId: perfil.prestadora_id,
  };
  next();
}
