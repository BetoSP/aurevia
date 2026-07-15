import { Router } from 'express';
import { requiereRolPanel } from '../middleware/requiereRolPanel.js';
import { supabase } from '../db/connection.js';

// Pendiente #30, ítem H — toggle de MFA obligatorio para superadmin/admin_plataforma.
// Es configuración de plataforma, no de una prestadora puntual — por eso va en su propio
// router, separado de panelConfiguracion.js (que es admin_prestadora-scoped). Solo
// superadmin puede tocarlo: ni siquiera admin_plataforma, porque es uno de los 2 roles
// que este toggle protege (docs/CLAUDE.md, nota junto al glosario de Superadmin).
export const panelConfiguracionPlataformaRouter = Router();

panelConfiguracionPlataformaRouter.use(requiereRolPanel);

function requiereSuperadmin(req, res, next) {
  if (req.usuarioPanel?.rol !== 'superadmin') {
    return res.status(403).json({ error: 'Solo Superadmin puede ver o editar esta configuración' });
  }
  next();
}

panelConfiguracionPlataformaRouter.get('/mfa', requiereSuperadmin, async (req, res) => {
  const { data, error } = await supabase
    .from('configuracion_plataforma')
    .select('mfa_admin_obligatorio, updated_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ configuracion: data });
});

panelConfiguracionPlataformaRouter.patch('/mfa', requiereSuperadmin, async (req, res) => {
  const { mfa_admin_obligatorio } = req.body;
  if (typeof mfa_admin_obligatorio !== 'boolean') {
    return res.status(400).json({ error: 'mfa_admin_obligatorio debe ser booleano' });
  }
  const { error } = await supabase
    .from('configuracion_plataforma')
    .update({ mfa_admin_obligatorio, actualizado_por: req.usuarioPanel.id, updated_at: new Date().toISOString() })
    .eq('id', true);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
