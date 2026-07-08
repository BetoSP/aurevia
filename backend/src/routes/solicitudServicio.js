import { Router } from 'express';
import { supabase } from '../db/connection.js';
import { enviarEmailCoordinador } from '../utils/email.js';

export const solicitudServicioRouter = Router();

solicitudServicioRouter.post('/', async (req, res) => {
  const {
    nombre, telefono, email, nombre_paciente, localidad,
    tipo_servicio, modalidad, dias_horario, descripcion,
  } = req.body;

  if (!nombre || !telefono || !email || !localidad || !tipo_servicio || !modalidad || !dias_horario) {
    return res.status(400).json({ error: 'campos_obligatorios_faltantes' });
  }

  const { error } = await supabase.from('solicitudes').insert({
    nombre, telefono, email,
    nombre_paciente: nombre_paciente ?? null,
    localidad, tipo_servicio, modalidad, dias_horario,
    descripcion: descripcion ?? null,
  });

  if (error) {
    console.error('Error insertando solicitud:', error.message);
    return res.status(500).json({ error: 'error_guardando_solicitud' });
  }

  try {
    await enviarEmailCoordinador({
      evento: 'nueva_solicitud_servicio',
      asunto: `Nueva solicitud de servicio — ${nombre}`,
      texto: `Nombre: ${nombre}\nTeléfono: ${telefono}\nEmail: ${email}\nLocalidad: ${localidad}\nServicio: ${tipo_servicio} (${modalidad})\nDías y horario: ${dias_horario}\nDescripción: ${descripcion ?? '—'}`,
    });
  } catch (err) {
    console.error('Error enviando email de solicitud de servicio:', err.message);
  }

  res.status(201).json({ ok: true });
});
