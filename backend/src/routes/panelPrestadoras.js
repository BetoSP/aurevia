import { Router } from 'express';
import { requiereRolPanel } from '../middleware/requiereRolPanel.js';
import { supabase } from '../db/connection.js';

// Listado de prestadoras licenciatarias — pendiente #30, ítem I
// (docs/PLAN_MULTITENANT_PLM.md 3.4.1). Solo admin_plataforma (para elegir a cuál
// entrar) y superadmin (para elegir la prestadora_id al dar de alta el primer
// admin_prestadora de una prestadora nueva, pendiente #26) tienen uso legítimo de
// esto — admin_prestadora/coordinador no ven otras prestadoras bajo ninguna
// circunstancia (CLAUDE.md glosario).
export const panelPrestadorasRouter = Router();

function requiereAdminPlataformaOSuperadmin(req, res, next) {
  if (!['admin_plataforma', 'superadmin'].includes(req.usuarioPanel?.rol)) {
    return res.status(403).json({ error: 'Solo admin_plataforma o superadmin puede ver la lista de prestadoras' });
  }
  next();
}

panelPrestadorasRouter.get('/', requiereRolPanel, requiereAdminPlataformaOSuperadmin, async (req, res) => {
  const { data, error } = await supabase
    .from('prestadoras')
    .select('id, nombre_fantasia, estado')
    .order('nombre_fantasia', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ prestadoras: data });
});
