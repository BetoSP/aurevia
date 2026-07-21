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

  req.usuarioFamilia = { id: userData.user.id, prestadoraId: perfil.prestadora_id };
  next();
}
