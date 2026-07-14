import { Router } from 'express';
import { requiereRolPanel } from '../middleware/requiereRolPanel.js';
import { supabase } from '../db/connection.js';

export const panelConfiguracionRouter = Router();

// Módulo 8 (Configuración) es a nivel de toda la empresa — Coordinador no entra acá,
// solo Admin/Superadmin (misma restricción que precios y escalas legales).
function requiereAdminOSuperior(req, res, next) {
  if (!['admin_prestadora', 'superadmin'].includes(req.usuarioPanel?.rol)) {
    return res.status(403).json({ error: 'Solo Admin o Superadmin puede editar la configuración' });
  }
  next();
}

panelConfiguracionRouter.use(requiereRolPanel, requiereAdminOSuperior);

// --- Datos de la prestadora (configuracion_prestadora, ver schema_multitenant_04.sql —
//     reemplaza el singleton configuracion_empresa: cada prestadora tiene su propia fila) ---
panelConfiguracionRouter.get('/empresa', async (req, res) => {
  const prestadoraId = req.usuarioPanel.rol === 'superadmin' && req.query.prestadora_id
    ? req.query.prestadora_id
    : req.usuarioPanel.prestadoraId;
  const { data, error } = await supabase
    .from('configuracion_prestadora')
    .select('*')
    .eq('prestadora_id', prestadoraId)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ empresa: data });
});

panelConfiguracionRouter.patch('/empresa', async (req, res) => {
  const { nombre, telefono, whatsapp_numero, email, dominio, zona_cobertura_texto } = req.body;
  const { error } = await supabase
    .from('configuracion_prestadora')
    .update({ nombre, telefono, whatsapp_numero, email, dominio, zona_cobertura_texto, updated_at: new Date().toISOString() })
    .eq('prestadora_id', req.usuarioPanel.prestadoraId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// --- Zonas de cobertura ---
panelConfiguracionRouter.get('/zonas', async (req, res) => {
  let query = supabase.from('zonas_cobertura').select('*').order('orden');
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ zonas: data });
});

panelConfiguracionRouter.post('/zonas', async (req, res) => {
  const { codigo, nombre, categoria, orden } = req.body;
  if (!codigo || !nombre || !categoria) {
    return res.status(400).json({ error: 'Faltan código, nombre o categoría' });
  }
  const { error } = await supabase
    .from('zonas_cobertura')
    .insert({ codigo, nombre, categoria, orden: orden ?? 0, prestadora_id: req.usuarioPanel.prestadoraId });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelConfiguracionRouter.patch('/zonas/:id', async (req, res) => {
  const { nombre, categoria, activa, orden } = req.body;
  let query = supabase
    .from('zonas_cobertura')
    .update({ nombre, categoria, activa, orden })
    .eq('id', req.params.id);
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelConfiguracionRouter.delete('/zonas/:id', async (req, res) => {
  let query = supabase.from('zonas_cobertura').delete().eq('id', req.params.id);
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// --- Servicios: escalada de relevo (protocolo de continuidad de guardia) ---
panelConfiguracionRouter.get('/escalada-relevo', async (req, res) => {
  let query = supabase.from('configuracion_escalada_relevo').select('*').order('nivel');
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ niveles: data });
});

panelConfiguracionRouter.post('/escalada-relevo', async (req, res) => {
  const { nivel, minutos_demora, orden_prioridad, plantilla_mensaje } = req.body;
  if (!nivel || !plantilla_mensaje) {
    return res.status(400).json({ error: 'Faltan nivel o plantilla de mensaje' });
  }
  const { error } = await supabase
    .from('configuracion_escalada_relevo')
    .insert({ nivel, minutos_demora, orden_prioridad, plantilla_mensaje, prestadora_id: req.usuarioPanel.prestadoraId });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelConfiguracionRouter.patch('/escalada-relevo/:id', async (req, res) => {
  const { nivel, minutos_demora, orden_prioridad, plantilla_mensaje } = req.body;
  let query = supabase
    .from('configuracion_escalada_relevo')
    .update({ nivel, minutos_demora, orden_prioridad, plantilla_mensaje })
    .eq('id', req.params.id);
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelConfiguracionRouter.delete('/escalada-relevo/:id', async (req, res) => {
  let query = supabase.from('configuracion_escalada_relevo').delete().eq('id', req.params.id);
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// --- Servicios: personal de emergencia (roster de suplentes/franqueros/emergencia
//     disponibles para el protocolo de continuidad de guardia, Parte 2 de Módulo 6) ---
panelConfiguracionRouter.get('/personal-emergencia', async (req, res) => {
  let query = supabase
    .from('personal_emergencia')
    .select('id, asistente_id, tipo, activo, created_at, asistentes(nombre)')
    .order('created_at', { ascending: false });
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ personal: data });
});

panelConfiguracionRouter.post('/personal-emergencia', async (req, res) => {
  const { asistente_id, tipo } = req.body;
  if (!asistente_id || !tipo) {
    return res.status(400).json({ error: 'Faltan asistente_id o tipo' });
  }
  const { error } = await supabase
    .from('personal_emergencia')
    .insert({ asistente_id, tipo, prestadora_id: req.usuarioPanel.prestadoraId });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelConfiguracionRouter.patch('/personal-emergencia/:id', async (req, res) => {
  const { activo } = req.body;
  let query = supabase.from('personal_emergencia').update({ activo }).eq('id', req.params.id);
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelConfiguracionRouter.delete('/personal-emergencia/:id', async (req, res) => {
  let query = supabase.from('personal_emergencia').delete().eq('id', req.params.id);
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// --- Configuración de notificaciones ---
// configuracion_notificaciones pasó a ser por prestadora el 2026-07-13
// (backend/src/db/schema_whatsapp_ia_01.sql sección 0) — antes era una fila global por
// evento, compartida sin darse cuenta por todas las prestadoras licenciatarias.
panelConfiguracionRouter.get('/notificaciones', async (req, res) => {
  let query = supabase.from('configuracion_notificaciones').select('*').order('evento');
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ notificaciones: data });
});

panelConfiguracionRouter.patch('/notificaciones/:evento', async (req, res) => {
  const { emails, activo, whatsapp_activo } = req.body;
  let query = supabase
    .from('configuracion_notificaciones')
    .update({ emails, activo, whatsapp_activo })
    .eq('evento', req.params.evento);
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// --- WhatsApp: credenciales de Meta Cloud API (Supabase Vault, ver
//     backend/src/db/schema_whatsapp_ia_01.sql secciones 1-2 — el token nunca vuelve a
//     mostrarse en el Panel una vez guardado) ---
panelConfiguracionRouter.get('/whatsapp', async (req, res) => {
  const prestadoraId = req.usuarioPanel.rol === 'superadmin' && req.query.prestadora_id
    ? req.query.prestadora_id
    : req.usuarioPanel.prestadoraId;
  const { data, error } = await supabase
    .from('configuracion_whatsapp_prestadora')
    .select('prestadora_id, activo, numero_telefono, waba_id, phone_number_id, verificado_at, updated_at')
    .eq('prestadora_id', prestadoraId)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ whatsapp: { ...data, token_cargado: Boolean(data) } });
});

panelConfiguracionRouter.patch('/whatsapp', async (req, res) => {
  const { activo, numero_telefono, waba_id, phone_number_id, token } = req.body;
  const prestadoraId = req.usuarioPanel.prestadoraId;

  const { error } = await supabase
    .from('configuracion_whatsapp_prestadora')
    .upsert({
      prestadora_id: prestadoraId,
      activo,
      numero_telefono,
      waba_id,
      phone_number_id,
      updated_at: new Date().toISOString(),
    });
  if (error) return res.status(500).json({ error: error.message });

  if (token) {
    const { error: errorToken } = await supabase.rpc('guardar_token_whatsapp', {
      p_prestadora_id: prestadoraId,
      p_token: token,
    });
    if (errorToken) return res.status(500).json({ error: errorToken.message });
  }

  res.json({ ok: true });
});

// --- WhatsApp: plantillas de mensaje (requieren aprobación de Meta antes de poder
//     usarse para un mensaje que la prestadora inicia) ---
panelConfiguracionRouter.get('/whatsapp/plantillas', async (req, res) => {
  let query = supabase.from('plantillas_whatsapp').select('*').order('created_at', { ascending: false });
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ plantillas: data });
});

panelConfiguracionRouter.post('/whatsapp/plantillas', async (req, res) => {
  const { nombre_interno, categoria, idioma, cuerpo_texto } = req.body;
  if (!nombre_interno || !categoria || !cuerpo_texto) {
    return res.status(400).json({ error: 'Faltan nombre_interno, categoria o cuerpo_texto' });
  }
  const { error } = await supabase.from('plantillas_whatsapp').insert({
    nombre_interno,
    categoria,
    idioma: idioma || 'es-AR',
    cuerpo_texto,
    prestadora_id: req.usuarioPanel.prestadoraId,
    created_by: req.usuarioPanel.id,
  });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelConfiguracionRouter.patch('/whatsapp/plantillas/:id', async (req, res) => {
  const { cuerpo_texto, estado, meta_template_id, motivo_rechazo } = req.body;
  let query = supabase
    .from('plantillas_whatsapp')
    .update({ cuerpo_texto, estado, meta_template_id, motivo_rechazo, updated_at: new Date().toISOString() })
    .eq('id', req.params.id);
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelConfiguracionRouter.delete('/whatsapp/plantillas/:id', async (req, res) => {
  let query = supabase.from('plantillas_whatsapp').delete().eq('id', req.params.id);
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// --- Catálogo de tipos de documento de Asistente (vencimientos a trackear) + plazo de aviso
//     configurable por prestadora (pendiente #18 punto 1, docs/PENDIENTES.md — ver
//     backend/src/db/schema_documentos_asistente.sql). El plazo vive en la tabla "prestadoras",
//     de gestión exclusiva de superadmin por RLS (schema_multitenant_01.sql) — se expone acá
//     porque el backend usa la service role key y aplica el mismo scoping por prestadora que
//     el resto de este archivo. ---
panelConfiguracionRouter.get('/documentos-tipo', async (req, res) => {
  const prestadoraId = req.usuarioPanel.rol === 'superadmin' && req.query.prestadora_id
    ? req.query.prestadora_id
    : req.usuarioPanel.prestadoraId;

  const [{ data: tipos, error: errorTipos }, { data: prestadora, error: errorPrestadora }] = await Promise.all([
    supabase.from('tipos_documento_asistente').select('*').eq('prestadora_id', prestadoraId).order('nombre'),
    supabase.from('prestadoras').select('dias_aviso_vencimiento_documentos').eq('id', prestadoraId).single(),
  ]);
  if (errorTipos) return res.status(500).json({ error: errorTipos.message });
  if (errorPrestadora) return res.status(500).json({ error: errorPrestadora.message });
  res.json({ tipos, dias_aviso_vencimiento_documentos: prestadora.dias_aviso_vencimiento_documentos });
});

panelConfiguracionRouter.post('/documentos-tipo', async (req, res) => {
  const { nombre, requiere_vencimiento } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Falta nombre' });
  const { error } = await supabase
    .from('tipos_documento_asistente')
    .insert({ nombre, requiere_vencimiento: requiere_vencimiento ?? true, prestadora_id: req.usuarioPanel.prestadoraId });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelConfiguracionRouter.patch('/documentos-tipo/plazo-aviso', async (req, res) => {
  const { dias } = req.body;
  if (!Number.isInteger(dias) || dias <= 0) {
    return res.status(400).json({ error: 'dias debe ser un entero positivo' });
  }
  const { error } = await supabase
    .from('prestadoras')
    .update({ dias_aviso_vencimiento_documentos: dias })
    .eq('id', req.usuarioPanel.prestadoraId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

panelConfiguracionRouter.patch('/documentos-tipo/:id', async (req, res) => {
  const { nombre, requiere_vencimiento, activo } = req.body;
  let query = supabase
    .from('tipos_documento_asistente')
    .update({ nombre, requiere_vencimiento, activo })
    .eq('id', req.params.id);
  if (req.usuarioPanel.rol !== 'superadmin') {
    query = query.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// --- Escalada a Coordinador: respaldo + intervalos de insistencia según premura
//     (punto 5 de docs/PRD_06_WhatsApp_IA.md) ---
panelConfiguracionRouter.get('/escalada-coordinador', async (req, res) => {
  const prestadoraId = req.usuarioPanel.rol === 'superadmin' && req.query.prestadora_id
    ? req.query.prestadora_id
    : req.usuarioPanel.prestadoraId;
  const { data, error } = await supabase
    .from('configuracion_escalada_coordinador')
    .select('*')
    .eq('prestadora_id', prestadoraId)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ escalada: data });
});

panelConfiguracionRouter.patch('/escalada-coordinador', async (req, res) => {
  const {
    coordinador_backup_id, minutos_antes_backup, umbrales_premura,
    fase_automatica_activa, minutos_antes_fase_automatica,
  } = req.body;
  const { error } = await supabase
    .from('configuracion_escalada_coordinador')
    .upsert({
      prestadora_id: req.usuarioPanel.prestadoraId,
      coordinador_backup_id,
      minutos_antes_backup,
      umbrales_premura,
      fase_automatica_activa,
      minutos_antes_fase_automatica,
      updated_at: new Date().toISOString(),
    });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
