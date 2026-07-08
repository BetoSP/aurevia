import { Router } from 'express';
import { requiereRolPanel } from '../middleware/requiereRolPanel.js';
import { supabase } from '../db/connection.js';
import { crearCuentaConPerfil, borrarCuenta } from '../utils/cuentasPanel.js';

export const panelUsuariosRouter = Router();

// Ver y gestionar otros usuarios del panel es sensible (alta/baja de acceso). Admin gestiona
// Coordinadores. Superadmin además gestiona cuentas de Admin y de otros Superadmin (acceso
// técnico del Módulo 8) — ver CLAUDE.md glosario y docs/CONTEXT.md.
function requiereAdminOSuperior(req, res, next) {
  if (!['admin', 'superadmin'].includes(req.usuarioPanel?.rol)) {
    return res.status(403).json({ error: 'Solo Admin o Superadmin puede gestionar usuarios del panel' });
  }
  next();
}

// Roles que el solicitante tiene permitido crear/editar/borrar.
function rolesGestionables(rolSolicitante) {
  return rolSolicitante === 'superadmin' ? ['admin', 'coordinador', 'superadmin'] : ['coordinador'];
}

panelUsuariosRouter.get('/', requiereRolPanel, requiereAdminOSuperior, async (req, res) => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, rol, nombre, telefono, zonas, created_at')
    .in('rol', ['admin', 'coordinador', 'superadmin'])
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ usuarios: data });
});

panelUsuariosRouter.post('/', requiereRolPanel, requiereAdminOSuperior, async (req, res) => {
  const { email, nombre, telefono, zonas, rol } = req.body;
  if (!email || !nombre) {
    return res.status(400).json({ error: 'Faltan email o nombre' });
  }

  const rolPermitidos = rolesGestionables(req.usuarioPanel.rol);
  const rolNuevo = req.usuarioPanel.rol === 'superadmin' ? (rol || 'coordinador') : 'coordinador';
  if (!rolPermitidos.includes(rolNuevo)) {
    return res.status(403).json({ error: 'No tenés permiso para crear cuentas con ese rol' });
  }

  try {
    const userId = await crearCuentaConPerfil({ email, nombre, telefono, rol: rolNuevo, zonas });
    res.json({ ok: true, id: userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

panelUsuariosRouter.patch('/:id', requiereRolPanel, requiereAdminOSuperior, async (req, res) => {
  const { nombre, telefono, zonas } = req.body;
  const { error } = await supabase
    .from('usuarios')
    .update({ nombre, telefono, zonas })
    .eq('id', req.params.id)
    .in('rol', rolesGestionables(req.usuarioPanel.rol));

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelUsuariosRouter.delete('/:id', requiereRolPanel, requiereAdminOSuperior, async (req, res) => {
  if (req.params.id === req.usuarioPanel.id) {
    return res.status(400).json({ error: 'No podés dar de baja tu propia cuenta desde acá' });
  }

  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', req.params.id).single();
  if (!usuario || !rolesGestionables(req.usuarioPanel.rol).includes(usuario.rol)) {
    return res.status(400).json({ error: 'No tenés permiso para dar de baja esa cuenta' });
  }

  await borrarCuenta(req.params.id);
  res.json({ ok: true });
});
