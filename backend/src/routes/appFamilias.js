import { Router } from 'express';
import { requiereRolFamilia } from '../middleware/requiereRolFamilia.js';
import { supabase } from '../db/connection.js';

export const appFamiliasRouter = Router();

async function pacienteDeLaFamilia(pacienteId, usuarioFamilia) {
  const { data } = await supabase
    .from('pacientes')
    .select('id, nombre, domicilio, lat, lng, patologias, medicacion_habitual, nivel_complejidad, familia_id, prestadora_id')
    .eq('id', pacienteId)
    .eq('familia_id', usuarioFamilia.id)
    .eq('prestadora_id', usuarioFamilia.prestadoraId)
    .maybeSingle();
  return data;
}

// ============================================================================
// Mi Perfil
// ============================================================================

appFamiliasRouter.get('/perfil', requiereRolFamilia, async (req, res) => {
  // Identidad (nombre/teléfono) vive en `usuarios` — igual que el resto de los roles de
  // login propio (asistentes es la excepción: ahí la tabla de negocio y la de login son la
  // misma). `familias` solo guarda el plan; el email lo tiene Supabase Auth, no una columna.
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('nombre, telefono')
    .eq('id', req.usuarioFamilia.id)
    .single();
  if (error || !usuario) {
    return res.status(404).json({ error: 'Perfil no encontrado' });
  }

  const { data: familia } = await supabase
    .from('familias')
    .select('plan')
    .eq('id', req.usuarioFamilia.id)
    .maybeSingle();

  res.json({ perfil: { ...usuario, plan: familia?.plan ?? null } });
});

// ============================================================================
// Mis Pacientes — un solo Paciente: la app va directo a su pantalla (regla del PRD);
// varios: el frontend arma la lista con esta misma respuesta.
// ============================================================================

appFamiliasRouter.get('/pacientes', requiereRolFamilia, async (req, res) => {
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, nombre, domicilio')
    .eq('familia_id', req.usuarioFamilia.id)
    .eq('prestadora_id', req.usuarioFamilia.prestadoraId)
    .order('nombre');
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ pacientes: data });
});

// ============================================================================
// Pantalla del Paciente — guardia actual (con Asistente asignado, para que el frontend
// abra la suscripción Realtime a esa fila) o, si no hay ninguna activa, la próxima
// programada. Incluye alertas activas (nivel != verde, sin resolver) para el resumen.
// ============================================================================

appFamiliasRouter.get('/pacientes/:id', requiereRolFamilia, async (req, res) => {
  const paciente = await pacienteDeLaFamilia(req.params.id, req.usuarioFamilia);
  if (!paciente) {
    return res.status(404).json({ error: 'Paciente no encontrado' });
  }

  const { data: guardiaActiva } = await supabase
    .from('guardias')
    .select('id, fecha, hora_inicio, hora_fin, estado, checkin_at, ubicacion_actual_lat, ubicacion_actual_lng, ubicacion_actual_at, asistente_id, asistentes(nombre, foto_url)')
    .eq('paciente_id', paciente.id)
    .eq('estado', 'activa')
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle();

  let guardiaProxima = null;
  if (!guardiaActiva) {
    const { data } = await supabase
      .from('guardias')
      .select('id, fecha, hora_inicio, hora_fin, estado, asistente_id, asistentes(nombre, foto_url)')
      .eq('paciente_id', paciente.id)
      .eq('estado', 'programada')
      .gte('fecha', new Date().toISOString().slice(0, 10))
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true })
      .limit(1)
      .maybeSingle();
    guardiaProxima = data || null;
  }

  const { data: alertasActivas } = await supabase
    .from('alertas')
    .select('id, nivel, descripcion, created_at')
    .eq('paciente_id', paciente.id)
    .is('resuelta_at', null)
    .order('created_at', { ascending: false });

  res.json({
    paciente,
    guardiaActiva: guardiaActiva || null,
    guardiaProxima,
    alertasActivas: alertasActivas || [],
  });
});

// ============================================================================
// Reportes del Paciente
// ============================================================================

appFamiliasRouter.get('/pacientes/:id/reportes', requiereRolFamilia, async (req, res) => {
  const paciente = await pacienteDeLaFamilia(req.params.id, req.usuarioFamilia);
  if (!paciente) {
    return res.status(404).json({ error: 'Paciente no encontrado' });
  }

  const { data, error } = await supabase
    .from('reportes')
    .select('id, texto_libre, alimentacion, medicacion, signos_vitales, estado_animo, incidentes, observaciones, foto_url, created_at, guardias!inner(paciente_id, fecha, asistente_id, asistentes(nombre))')
    .eq('guardias.paciente_id', paciente.id)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ reportes: data });
});

// ============================================================================
// Alertas del Paciente (activas + historial resuelto — ver AI_PROMPTS.md IA Nivel 2)
// ============================================================================

appFamiliasRouter.get('/pacientes/:id/alertas', requiereRolFamilia, async (req, res) => {
  const paciente = await pacienteDeLaFamilia(req.params.id, req.usuarioFamilia);
  if (!paciente) {
    return res.status(404).json({ error: 'Paciente no encontrado' });
  }

  const { data, error } = await supabase
    .from('alertas')
    .select('id, nivel, descripcion, campos_preocupantes, reportes_relacionados, resuelta_at, created_at')
    .eq('paciente_id', paciente.id)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ alertas: data });
});

// ============================================================================
// Asistente Asignado — datos del Asistente que tuvo o tiene alguna guardia con este
// Paciente (RLS de asistentes/certificados ya lo acota a eso, ver schema_pwa_familias_01.sql
// §3-4), estado del Certificado de Aptitud, evaluaciones anteriores, y el id de la guardia
// activa/última (para el botón de calificar).
// ============================================================================

appFamiliasRouter.get('/pacientes/:id/asistente', requiereRolFamilia, async (req, res) => {
  const paciente = await pacienteDeLaFamilia(req.params.id, req.usuarioFamilia);
  if (!paciente) {
    return res.status(404).json({ error: 'Paciente no encontrado' });
  }

  const { data: guardia } = await supabase
    .from('guardias')
    .select('id, estado, asistente_id')
    .eq('paciente_id', paciente.id)
    .not('asistente_id', 'is', null)
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!guardia?.asistente_id) {
    return res.json({ asistente: null, certificado: null, evaluaciones: [], guardiaId: null });
  }

  const { data: asistente } = await supabase
    .from('asistentes')
    .select('id, nombre, foto_url, especialidades')
    .eq('id', guardia.asistente_id)
    .maybeSingle();

  const { data: certificado } = await supabase
    .from('certificados')
    .select('activo, fecha_vencimiento')
    .eq('asistente_id', guardia.asistente_id)
    .eq('activo', true)
    .order('fecha_vencimiento', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: evaluaciones } = await supabase
    .from('calificaciones_asistente')
    .select('id, estrellas, comentario, created_at')
    .eq('asistente_id', guardia.asistente_id)
    .eq('paciente_id', paciente.id)
    .order('created_at', { ascending: false });

  res.json({
    asistente: asistente || null,
    certificado: certificado || null,
    evaluaciones: evaluaciones || [],
    guardiaId: guardia.id,
  });
});

// ============================================================================
// Calificación del Asistente al cierre de una guardia (tabla calificaciones_asistente,
// ya existente desde el pendiente #13(b)).
// ============================================================================

appFamiliasRouter.post('/guardias/:guardiaId/calificar', requiereRolFamilia, async (req, res) => {
  const { estrellas, comentario } = req.body || {};
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
    return res.status(400).json({ error: 'La calificación debe ser un número entero de 1 a 5' });
  }

  const { data: guardia } = await supabase
    .from('guardias')
    .select('id, asistente_id, paciente_id, prestadora_id, pacientes!inner(familia_id)')
    .eq('id', req.params.guardiaId)
    .eq('pacientes.familia_id', req.usuarioFamilia.id)
    .maybeSingle();
  if (!guardia) {
    return res.status(404).json({ error: 'Guardia no encontrada' });
  }

  const { error } = await supabase.from('calificaciones_asistente').insert({
    asistente_id: guardia.asistente_id,
    paciente_id: guardia.paciente_id,
    familia_id: req.usuarioFamilia.id,
    guardia_id: guardia.id,
    prestadora_id: guardia.prestadora_id,
    estrellas,
    comentario: comentario || null,
  });
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
});

// ============================================================================
// Notificaciones push (Web Push API + VAPID) — mismo contrato que appAsistentes.js,
// generalizado del lado de push.js a familia_id.
// ============================================================================

appFamiliasRouter.post('/push/suscribir', requiereRolFamilia, async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Suscripción push incompleta' });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        prestadora_id: req.usuarioFamilia.prestadoraId,
        familia_id: req.usuarioFamilia.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: req.headers['user-agent'] || null,
      },
      { onConflict: 'endpoint' }
    );
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
});

appFamiliasRouter.delete('/push/suscribir', requiereRolFamilia, async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) {
    return res.status(400).json({ error: 'Falta el endpoint de la suscripción' });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('familia_id', req.usuarioFamilia.id);
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
});
