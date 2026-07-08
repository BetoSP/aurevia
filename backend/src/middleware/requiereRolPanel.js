import { supabase } from '../db/connection.js';

export async function requiereRolPanel(req, res, next) {
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
    .select('rol')
    .eq('id', userData.user.id)
    .single();

  if (errorPerfil || !perfil || !['admin', 'coordinador', 'superadmin'].includes(perfil.rol)) {
    return res.status(403).json({ error: 'Rol sin permiso' });
  }

  req.usuarioPanel = { id: userData.user.id, rol: perfil.rol };
  next();
}
