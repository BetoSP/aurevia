import { Router } from 'express';
import { requiereRolPanel } from '../middleware/requiereRolPanel.js';
import { supabase } from '../db/connection.js';
import { crearCuentaConPerfil, borrarCuenta } from '../utils/cuentasPanel.js';

export const panelCuentasRouter = Router();

// Crear una cuenta real (Auth + perfil) es una acción sensible y difícil de revertir —
// se restringe a Admin/Superadmin, a diferencia del resto del panel que también admite Coordinador.
function requiereAdmin(req, res, next) {
  if (!['admin', 'superadmin'].includes(req.usuarioPanel?.rol)) {
    return res.status(403).json({ error: 'Solo Admin puede crear cuentas' });
  }
  next();
}

panelCuentasRouter.post('/familia', requiereRolPanel, requiereAdmin, async (req, res) => {
  const { solicitudId } = req.body;
  if (!solicitudId) {
    return res.status(400).json({ error: 'Falta solicitudId' });
  }

  const { data: solicitud, error: errorSolicitud } = await supabase
    .from('solicitudes')
    .select('*')
    .eq('id', solicitudId)
    .single();

  if (errorSolicitud || !solicitud) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }
  if (solicitud.familia_id) {
    return res.status(409).json({ error: 'Esta solicitud ya tiene una Familia asociada' });
  }

  let familiaId;
  try {
    familiaId = await crearCuentaConPerfil({
      email: solicitud.email,
      nombre: solicitud.nombre,
      telefono: solicitud.telefono,
      rol: 'familia',
    });

    const { error: errorFamilia } = await supabase
      .from('familias')
      .insert({ id: familiaId, solicitud_id: solicitudId });
    if (errorFamilia) throw new Error(errorFamilia.message);

    const { data: paciente, error: errorPaciente } = await supabase
      .from('pacientes')
      .insert({
        familia_id: familiaId,
        nombre: solicitud.nombre_paciente || solicitud.nombre,
        domicilio: solicitud.localidad,
      })
      .select()
      .single();
    if (errorPaciente) throw new Error(errorPaciente.message);

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
      await borrarCuenta(familiaId);
    }
    res.status(500).json({ error: error.message });
  }
});

const ETAPAS_INCORPORACION = [
  'postulacion',
  'verificacion_identidad',
  'antecedentes_penales',
  'entrevista',
  'capacitacion',
];

// Inicia el Proceso de Incorporación de Asistentes (uso interno del Panel — nunca llamar
// "Filtro prestadora-original" acá, ver nota de CLAUDE.md 2026-07-08): crea la cuenta real de Asistente
// a partir de una postulación aprobada, y registra las 5 etapas de verificacion_asistente.
// La primera etapa ("postulacion") queda aprobada de entrada porque ya se cumplió.
panelCuentasRouter.post('/asistente', requiereRolPanel, requiereAdmin, async (req, res) => {
  const { postulacionId } = req.body;
  if (!postulacionId) {
    return res.status(400).json({ error: 'Falta postulacionId' });
  }

  const { data: postulacion, error: errorPostulacion } = await supabase
    .from('postulaciones')
    .select('*')
    .eq('id', postulacionId)
    .single();

  if (errorPostulacion || !postulacion) {
    return res.status(404).json({ error: 'Postulación no encontrada' });
  }
  if (postulacion.asistente_id) {
    return res.status(409).json({ error: 'Esta postulación ya tiene un Asistente asociado' });
  }

  let asistenteId;
  try {
    asistenteId = await crearCuentaConPerfil({
      email: postulacion.email,
      nombre: postulacion.nombre,
      telefono: postulacion.telefono,
      rol: 'asistente',
      zonas: postulacion.zonas.split(',').map((z) => z.trim()).filter(Boolean),
    });

    const { error: errorAsistente } = await supabase.from('asistentes').insert({
      id: asistenteId,
      nombre: postulacion.nombre,
      dni: postulacion.dni,
      telefono: postulacion.telefono,
      email: postulacion.email,
      especialidades: postulacion.especialidades.split(',').map((e) => e.trim()).filter(Boolean),
      zonas: postulacion.zonas.split(',').map((z) => z.trim()).filter(Boolean),
      estado: 'inactivo',
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
      await borrarCuenta(asistenteId);
    }
    res.status(500).json({ error: error.message });
  }
});
