import { Router } from 'express';
import { requiereRolPanel } from '../middleware/requiereRolPanel.js';
import { supabase } from '../db/connection.js';
import {
  crearCuentaConPerfil,
  borrarCuenta,
  crearAsistenteDirecto,
  crearFamiliaDirecta,
  invitarMiembroCirculo,
  revocarMiembroCirculo,
} from '../utils/cuentasPanel.js';
import { tienePermiso, ACCIONES_PERMISOS } from '../utils/permisos.js';

export const panelCuentasRouter = Router();

// Crear una cuenta real (Auth + perfil) es una acción sensible y difícil de revertir —
// se restringe a Admin/Superadmin, a diferencia del resto del panel que también admite Coordinador.
function requiereAdmin(req, res, next) {
  if (!['admin_prestadora', 'superadmin'].includes(req.usuarioPanel?.rol)) {
    return res.status(403).json({ error: 'Solo Admin puede crear cuentas' });
  }
  next();
}

// Alta desde Postulación/Solicitud (rutas /familia y /asistente, más abajo) se queda
// admin-only sin cambios — el motor de permisos de la Fase 2 (docs/PENDIENTES.md, plan
// aprobado) solo cubre el alta manual (/familia-directa y /asistente-directo), que es lo
// que el plan pidió hacer configurable para Coordinador.
function requierePermiso(accion) {
  return async (req, res, next) => {
    const permitido = await tienePermiso({
      accion,
      rol: req.usuarioPanel?.rol,
      usuarioId: req.usuarioPanel?.id,
      prestadoraId: req.usuarioPanel?.prestadoraId,
    });
    if (!permitido) {
      return res.status(403).json({ error: 'Tu Prestadora no te habilitó para esta acción' });
    }
    next();
  };
}

// Usado por el frontend (botones "Nuevo Asistente"/"Nueva Familia", campos de edición de
// Fase 1) para saber qué mostrar sin duplicar la lógica de permisos en el cliente — la
// única fuente de verdad sigue siendo este chequeo del lado del servidor.
panelCuentasRouter.get('/permisos-efectivos', requiereRolPanel, async (req, res) => {
  const resultados = await Promise.all(
    ACCIONES_PERMISOS.map((accion) =>
      tienePermiso({
        accion,
        rol: req.usuarioPanel.rol,
        usuarioId: req.usuarioPanel.id,
        prestadoraId: req.usuarioPanel.prestadoraId,
      })
    )
  );
  res.json({ permisos: Object.fromEntries(ACCIONES_PERMISOS.map((accion, i) => [accion, resultados[i]])) });
});

panelCuentasRouter.post('/familia', requiereRolPanel, requiereAdmin, async (req, res) => {
  const { solicitudId } = req.body;
  if (!solicitudId) {
    return res.status(400).json({ error: 'Falta solicitudId' });
  }

  let querySolicitud = supabase.from('solicitudes').select('*').eq('id', solicitudId);
  if (req.usuarioPanel.rol !== 'superadmin') {
    querySolicitud = querySolicitud.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { data: solicitud, error: errorSolicitud } = await querySolicitud.single();

  if (errorSolicitud || !solicitud) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }
  if (solicitud.familia_id) {
    return res.status(409).json({ error: 'Esta solicitud ya tiene una Familia asociada' });
  }

  const prestadoraId = req.usuarioPanel.prestadoraId;

  let familiaId;
  try {
    ({ userId: familiaId } = await crearCuentaConPerfil({
      email: solicitud.email,
      nombre: solicitud.nombre,
      telefono: solicitud.telefono,
      rol: 'familia',
      prestadoraId,
    }));

    const { error: errorFamilia } = await supabase
      .from('familias')
      .insert({ id: familiaId, solicitud_id: solicitudId, prestadora_id: prestadoraId });
    if (errorFamilia) throw new Error(errorFamilia.message);

    const { data: paciente, error: errorPaciente } = await supabase
      .from('pacientes')
      .insert({
        familia_id: familiaId,
        nombre: solicitud.nombre_paciente || solicitud.nombre,
        domicilio: solicitud.localidad,
        prestadora_id: prestadoraId,
      })
      .select()
      .single();
    if (errorPaciente) throw new Error(errorPaciente.message);

    // SEGURIDAD: depende de que el SELECT de arriba (línea ~23) ya haya validado que
    // `solicitudId` pertenece al tenant del solicitante — no llamar este UPDATE con un
    // id que no haya pasado por ese filtro.
    const { error: errorUpdate } = await supabase
      .from('solicitudes')
      .update({ familia_id: familiaId })
      .eq('id', solicitudId);
    if (errorUpdate) throw new Error(errorUpdate.message);

    res.json({ ok: true, familiaId, pacienteId: paciente.id });
  } catch (error) {
    if (familiaId) {
      await supabase.from('pacientes').delete().eq('familia_id', familiaId);
      await supabase.from('familias').delete().eq('id', familiaId);
      await borrarCuenta(familiaId, { prestadoraId });
    }
    res.status(500).json({ error: error.message });
  }
});

// Alta manual de Familia+Paciente (sin Solicitud previa) — cubre el caso de una
// Prestadora que llega a Aurevia con una cartera de familias ya en atención.
// Se crea igual una fila de `solicitudes` (canal 'alta_manual') para que el contacto
// de la Familia siga viviendo en un único lugar (evita reproducir el bug de contacto
// en blanco que tenían las Familias sembradas sin solicitud vinculada).
panelCuentasRouter.post('/familia-directa', requiereRolPanel, requierePermiso('alta_manual_familia'), async (req, res) => {
  const { nombreContacto, telefono, email, localidad, nombrePaciente, domicilioPaciente } = req.body;
  try {
    const { familiaId, pacienteId } = await crearFamiliaDirecta({
      nombreContacto, telefono, email, localidad, nombrePaciente, domicilioPaciente,
      prestadoraId: req.usuarioPanel.prestadoraId,
    });
    res.json({ ok: true, familiaId, pacienteId });
  } catch (error) {
    res.status(error.message.startsWith('Faltan datos') ? 400 : 500).json({ error: error.message });
  }
});

const ETAPAS_INCORPORACION = [
  'postulacion',
  'verificacion_identidad',
  'antecedentes_penales',
  'entrevista',
  'capacitacion',
];

// Inicia el Proceso de Incorporación de Asistentes (uso interno del Panel, ver glosario
// de CLAUDE.md): crea la cuenta real de Asistente a partir de una postulación aprobada,
// y registra las 5 etapas de verificacion_asistente.
// La primera etapa ("postulacion") queda aprobada de entrada porque ya se cumplió.
panelCuentasRouter.post('/asistente', requiereRolPanel, requiereAdmin, async (req, res) => {
  const { postulacionId } = req.body;
  if (!postulacionId) {
    return res.status(400).json({ error: 'Falta postulacionId' });
  }

  let queryPostulacion = supabase.from('postulaciones').select('*').eq('id', postulacionId);
  if (req.usuarioPanel.rol !== 'superadmin') {
    queryPostulacion = queryPostulacion.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { data: postulacion, error: errorPostulacion } = await queryPostulacion.single();

  if (errorPostulacion || !postulacion) {
    return res.status(404).json({ error: 'Postulación no encontrada' });
  }
  if (postulacion.asistente_id) {
    return res.status(409).json({ error: 'Esta postulación ya tiene un Asistente asociado' });
  }

  const prestadoraId = req.usuarioPanel.prestadoraId;

  let asistenteId;
  try {
    ({ userId: asistenteId } = await crearCuentaConPerfil({
      email: postulacion.email,
      nombre: postulacion.nombre,
      telefono: postulacion.telefono,
      rol: 'asistente',
      zonas: postulacion.zonas.split(',').map((z) => z.trim()).filter(Boolean),
      prestadoraId,
    }));

    const { error: errorAsistente } = await supabase.from('asistentes').insert({
      id: asistenteId,
      nombre: postulacion.nombre,
      dni: postulacion.dni,
      telefono: postulacion.telefono,
      email: postulacion.email,
      especialidades: postulacion.especialidades.split(',').map((e) => e.trim()).filter(Boolean),
      zonas: postulacion.zonas.split(',').map((z) => z.trim()).filter(Boolean),
      estado: 'inactivo',
      prestadora_id: prestadoraId,
    });
    if (errorAsistente) throw new Error(errorAsistente.message);

    const filasVerificacion = ETAPAS_INCORPORACION.map((etapa) => ({
      asistente_id: asistenteId,
      etapa,
      estado: etapa === 'postulacion' ? 'aprobada' : 'pendiente',
      revisado_por: etapa === 'postulacion' ? req.usuarioPanel.id : null,
      completado_en: etapa === 'postulacion' ? new Date().toISOString() : null,
    }));
    const { error: errorVerificaciones } = await supabase.from('verificaciones_asistente').insert(filasVerificacion);
    if (errorVerificaciones) throw new Error(errorVerificaciones.message);

    // SEGURIDAD: depende de que el SELECT de arriba (línea ~100) ya haya validado que
    // `postulacionId` pertenece al tenant del solicitante — no llamar este UPDATE con un
    // id que no haya pasado por ese filtro.
    const { error: errorUpdate } = await supabase
      .from('postulaciones')
      .update({ asistente_id: asistenteId })
      .eq('id', postulacionId);
    if (errorUpdate) throw new Error(errorUpdate.message);

    res.json({ ok: true, asistenteId });
  } catch (error) {
    if (asistenteId) {
      await supabase.from('verificaciones_asistente').delete().eq('asistente_id', asistenteId);
      await supabase.from('asistentes').delete().eq('id', asistenteId);
      await borrarCuenta(asistenteId, { prestadoraId });
    }
    res.status(500).json({ error: error.message });
  }
});

// Alta manual de Asistente (sin Postulación previa) — cubre el caso de una Prestadora
// que llega a Aurevia con un equipo que ya venía trabajando desde antes. Entra activo
// por defecto y, a diferencia de /asistente, no genera filas en `verificaciones_asistente`
// (equivalente al default 'omitir' del pendiente #18 — política de verificación por
// prestadora; la Fase 2 de este trabajo suma la configuración para cambiar este comportamiento).
panelCuentasRouter.post('/asistente-directo', requiereRolPanel, requierePermiso('alta_manual_asistente'), async (req, res) => {
  const { nombre, telefono, email, dni, especialidades, zonas, estado, tipo_vinculo, categoria_cct, valor_hora, sueldo_basico, horas_semanales } = req.body;
  try {
    const { asistenteId } = await crearAsistenteDirecto({
      nombre, telefono, email, dni, especialidades, zonas, estado,
      tipo_vinculo, categoria_cct, valor_hora, sueldo_basico, horas_semanales,
      prestadoraId: req.usuarioPanel.prestadoraId,
      usuarioPanelId: req.usuarioPanel.id,
    });
    res.json({ ok: true, asistenteId });
  } catch (error) {
    res.status(error.message.startsWith('Faltan datos') ? 400 : 500).json({ error: error.message });
  }
});

// ============================================================================
// Círculo de cuidado (Fase 5) — reutiliza el permiso 'editar_datos_familia' ya existente:
// gestionar quién más tiene acceso a la Familia es parte de administrar sus datos, no una
// acción nueva (ver docs/claude_history.md).
// ============================================================================

panelCuentasRouter.get('/familia/:familiaId/circulo', requiereRolPanel, requierePermiso('editar_datos_familia'), async (req, res) => {
  let queryFamilia = supabase.from('familias').select('id').eq('id', req.params.familiaId);
  if (req.usuarioPanel.rol !== 'superadmin') {
    queryFamilia = queryFamilia.eq('prestadora_id', req.usuarioPanel.prestadoraId);
  }
  const { data: familia } = await queryFamilia.maybeSingle();
  if (!familia) {
    return res.status(404).json({ error: 'Familia no encontrada' });
  }

  const { data: miembros, error } = await supabase
    .from('miembros_familia')
    .select('usuario_id, email, rol, created_at, usuarios!miembros_familia_usuario_id_fkey(nombre)')
    .eq('familia_id', req.params.familiaId)
    .order('created_at', { ascending: true });
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ miembros: miembros || [] });
});

panelCuentasRouter.post('/familia/:familiaId/circulo', requiereRolPanel, requierePermiso('editar_datos_familia'), async (req, res) => {
  const { nombre, email, telefono } = req.body || {};
  const prestadoraId = req.usuarioPanel.prestadoraId;

  let queryFamilia = supabase.from('familias').select('id').eq('id', req.params.familiaId);
  if (req.usuarioPanel.rol !== 'superadmin') {
    queryFamilia = queryFamilia.eq('prestadora_id', prestadoraId);
  }
  const { data: familia } = await queryFamilia.maybeSingle();
  if (!familia) {
    return res.status(404).json({ error: 'Familia no encontrada' });
  }

  try {
    const { miembroId } = await invitarMiembroCirculo({
      email,
      nombre,
      telefono,
      familiaId: req.params.familiaId,
      prestadoraId,
      invitadoPor: req.usuarioPanel.id,
    });
    res.json({ ok: true, usuarioId: miembroId });
  } catch (error) {
    res.status(error.message.startsWith('Faltan datos') ? 400 : 500).json({ error: error.message });
  }
});

panelCuentasRouter.delete('/familia/:familiaId/circulo/:usuarioId', requiereRolPanel, requierePermiso('editar_datos_familia'), async (req, res) => {
  const prestadoraId = req.usuarioPanel.prestadoraId;

  let queryFamilia = supabase.from('familias').select('id').eq('id', req.params.familiaId);
  if (req.usuarioPanel.rol !== 'superadmin') {
    queryFamilia = queryFamilia.eq('prestadora_id', prestadoraId);
  }
  const { data: familia } = await queryFamilia.maybeSingle();
  if (!familia) {
    return res.status(404).json({ error: 'Familia no encontrada' });
  }

  try {
    await revocarMiembroCirculo(req.params.usuarioId, { prestadoraId, familiaId: req.params.familiaId });
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
