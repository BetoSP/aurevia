import { Router } from 'express';
import { requiereRolPanel } from '../middleware/requiereRolPanel.js';
import { supabase } from '../db/connection.js';
import { crearCuentaConPerfil, borrarCuenta } from '../utils/cuentasPanel.js';

export const panelUsuariosRouter = Router();

// Ver y gestionar otros usuarios del panel es sensible (alta/baja de acceso). Admin gestiona
// Coordinadores. Superadmin además gestiona cuentas de Admin y de otros Superadmin (acceso
// técnico del Módulo 8) — ver CLAUDE.md glosario y docs/CONTEXT.md.
function requiereAdminOSuperior(req, res, next) {
  if (!['admin_prestadora', 'superadmin'].includes(req.usuarioPanel?.rol)) {
    return res.status(403).json({ error: 'Solo Admin o Superadmin puede gestionar usuarios del panel' });
  }
  next();
}

// Roles que el solicitante tiene permitido crear/editar/borrar.
function rolesGestionables(rolSolicitante) {
  return rolSolicitante === 'superadmin'
    ? ['admin_prestadora', 'coordinador', 'superadmin']
    : ['coordinador'];
}

panelUsuariosRouter.get('/', requiereRolPanel, requiereAdminOSuperior, async (req, res) => {
  let query = supabase
    .from('usuarios')
    .select('id, rol, nombre, telefono, zonas, created_at')
    .in('rol', ['admin_prestadora', 'coordinador', 'superadmin'])
    .order('created_at', { ascending: false });

  // Superadmin gestiona cuentas de cualquier prestadora (acceso técnico, ver CLAUDE.md
  // glosario); admin_prestadora solo ve las de la suya — mismo criterio que es_superadmin()
  // en las policies RLS, replicado acá porque esta ruta usa Service Role Key (bypassea RLS).
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json({ usuarios: data });
});

panelUsuariosRouter.post('/', requiereRolPanel, requiereAdminOSuperior, async (req, res) => {
  const { email, nombre, telefono, zonas, rol, prestadora_id } = req.body;
  if (!email || !nombre) {
    return res.status(400).json({ error: 'Faltan email o nombre' });
  }

  const rolPermitidos = rolesGestionables(req.usuarioPanel.rol);
  const rolNuevo = req.usuarioPanel.rol === 'superadmin' ? (rol || 'coordinador') : 'coordinador';
  if (!rolPermitidos.includes(rolNuevo)) {
    return res.status(403).json({ error: 'No tenés permiso para crear cuentas con ese rol' });
  }

  // Superadmin no "pertenece" a una prestadora (su columna prestadora_id solo está
  // backfillada por consistencia de esquema) — puede dar de alta el primer usuario de
  // cualquier licenciataria, eligiendo el destino explícitamente. Admin_prestadora nunca
  // puede elegir: sus cuentas nuevas siempre nacen en su propia prestadora.
  const prestadoraDestino = req.usuarioPanel.rol === 'superadmin' && prestadora_id
    ? prestadora_id
    : req.usuarioPanel.prestadoraId;

  try {
    const { userId, passwordTemporal } = await crearCuentaConPerfil({
      email, nombre, telefono, rol: rolNuevo, zonas,
      prestadoraId: prestadoraDestino,
    });
    res.json({ ok: true, id: userId, passwordTemporal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

panelUsuariosRouter.patch('/:id', requiereRolPanel, requiereAdminOSuperior, async (req, res) => {
  const { nombre, telefono, zonas } = req.body;
  let query = supabase
    .from('usuarios')
    .update({ nombre, telefono, zonas })
    .eq('id', req.params.id)
    .in('rol', rolesGestionables(req.usuarioPanel.rol));

  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }

  const { error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelUsuariosRouter.delete('/:id', requiereRolPanel, requiereAdminOSuperior, async (req, res) => {
  if (req.params.id === req.usuarioPanel.id) {
    return res.status(400).json({ error: 'No podés dar de baja tu propia cuenta desde acá' });
  }

  let queryUsuario = supabase.from('usuarios').select('rol, prestadora_id').eq('id', req.params.id);
  if (req.usuarioPanel.rol !== 'superadmin') {
    queryUsuario = queryUsuario.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { data: usuario } = await queryUsuario.single();
  if (!usuario || !rolesGestionables(req.usuarioPanel.rol).includes(usuario.rol)) {
    return res.status(400).json({ error: 'No tenés permiso para dar de baja esa cuenta' });
  }

  await borrarCuenta(req.params.id, {
    prestadoraId: req.usuarioPanel.prestadoraId,
    esSuperadmin: req.usuarioPanel.rol === 'superadmin',
  });
  res.json({ ok: true });
});
