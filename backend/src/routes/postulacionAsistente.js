import { Router } from 'express';
import { supabase } from '../db/connection.js';
import { enviarEmailCoordinador } from '../utils/email.js';

export const postulacionAsistenteRouter = Router();

postulacionAsistenteRouter.post('/', async (req, res) => {
  const {
    nombre, dni, telefono, email, especialidades, zonas, disponibilidad,
    anios_experiencia, situacion_fiscal, como_conocio, mensaje,
  } = req.body;

  if (!nombre || !dni || !telefono || !email || !especialidades || !zonas || !disponibilidad || !situacion_fiscal) {
    return res.status(400).json({ error: 'campos_obligatorios_faltantes' });
  }

  const { error } = await supabase.from('postulaciones').insert({
    nombre, dni, telefono, email, especialidades, zonas, disponibilidad,
    anios_experiencia: anios_experiencia ?? null,
    situacion_fiscal,
    como_conocio: como_conocio ?? null,
    mensaje: mensaje ?? null,
  });

  if (error) {
    console.error('Error insertando postulación:', error.message);
    return res.status(500).json({ error: 'error_guardando_postulacion' });
  }

  try {
    await enviarEmailCoordinador({
      evento: 'nueva_postulacion_asistente',
      asunto: `Nueva postulación de Asistente — ${nombre}`,
      texto: `Nombre: ${nombre}\nDNI: ${dni}\nTeléfono: ${telefono}\nEmail: ${email}\nEspecialidades: ${especialidades}\nZonas: ${zonas}\nDisponibilidad: ${disponibilidad}\nSituación fiscal: ${situacion_fiscal}`,
    });
  } catch (err) {
    console.error('Error enviando email de postulación:', err.message);
  }

  res.status(201).json({ ok: true });
});
