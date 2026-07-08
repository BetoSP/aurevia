import { Router } from 'express';
import { requiereRolPanel } from '../middleware/requiereRolPanel.js';
import { enviarEmail } from '../utils/email.js';

export const panelNotificacionesRouter = Router();

const MENSAJES_ESTADO_POSTULACION = {
  en_revision: 'Tu postulación como Asistente Integral está en revisión.',
  aprobado: 'Tu postulación como Asistente Integral fue aprobada. Pronto nos pondremos en contacto para los próximos pasos.',
  rechazado: 'Gracias por tu interés en prestadora-original Salud. En esta oportunidad no vamos a avanzar con tu postulación.',
};

panelNotificacionesRouter.post('/postulante', requiereRolPanel, async (req, res) => {
  const { email, nombre, nuevoEstado } = req.body;

  if (!email || !nuevoEstado || !MENSAJES_ESTADO_POSTULACION[nuevoEstado]) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  try {
    await enviarEmail({
      to: email,
      asunto: 'prestadora-original Salud — Actualización de tu postulación',
      texto: `Hola ${nombre || ''},\n\n${MENSAJES_ESTADO_POSTULACION[nuevoEstado]}\n\nEquipo prestadora-original Salud`,
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo enviar el email' });
  }
});
