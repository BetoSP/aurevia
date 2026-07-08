import { Router } from 'express';
import { requiereRolPanel } from '../middleware/requiereRolPanel.js';
import { supabase } from '../db/connection.js';

export const panelConfiguracionRouter = Router();

// Módulo 8 (Configuración) es a nivel de toda la empresa — Coordinador no entra acá,
// solo Admin/Superadmin (misma restricción que precios y escalas legales).
function requiereAdminOSuperior(req, res, next) {
  if (!['admin', 'superadmin'].includes(req.usuarioPanel?.rol)) {
    return res.status(403).json({ error: 'Solo Admin o Superadmin puede editar la configuración' });
  }
  next();
}

panelConfiguracionRouter.use(requiereRolPanel, requiereAdminOSuperior);

// --- Datos de la empresa ---
panelConfiguracionRouter.get('/empresa', async (req, res) => {
  const { data, error } = await supabase.from('configuracion_empresa').select('*').eq('id', 1).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ empresa: data });
});

panelConfiguracionRouter.patch('/empresa', async (req, res) => {
  const { nombre, telefono, whatsapp_numero, email, dominio, zona_cobertura_texto } = req.body;
  const { error } = await supabase
    .from('configuracion_empresa')
    .update({ nombre, telefono, whatsapp_numero, email, dominio, zona_cobertura_texto, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// --- Zonas de cobertura ---
panelConfiguracionRouter.get('/zonas', async (req, res) => {
  const { data, error } = await supabase.from('zonas_cobertura').select('*').order('orden');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ zonas: data });
});

panelConfiguracionRouter.post('/zonas', async (req, res) => {
  const { codigo, nombre, categoria, orden } = req.body;
  if (!codigo || !nombre || !categoria) {
    return res.status(400).json({ error: 'Faltan código, nombre o categoría' });
  }
  const { error } = await supabase.from('zonas_cobertura').insert({ codigo, nombre, categoria, orden: orden ?? 0 });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelConfiguracionRouter.patch('/zonas/:id', async (req, res) => {
  const { nombre, categoria, activa, orden } = req.body;
  const { error } = await supabase
    .from('zonas_cobertura')
    .update({ nombre, categoria, activa, orden })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelConfiguracionRouter.delete('/zonas/:id', async (req, res) => {
  const { error } = await supabase.from('zonas_cobertura').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// --- Configuración de notificaciones ---
panelConfiguracionRouter.get('/notificaciones', async (req, res) => {
  const { data, error } = await supabase.from('configuracion_notificaciones').select('*').order('evento');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ notificaciones: data });
});

panelConfiguracionRouter.patch('/notificaciones/:evento', async (req, res) => {
  const { emails, activo } = req.body;
  const { error } = await supabase
    .from('configuracion_notificaciones')
    .update({ emails, activo })
    .eq('evento', req.params.evento);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
