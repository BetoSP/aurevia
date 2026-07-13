import nodemailer from 'nodemailer';
import { supabase } from '../db/connection.js';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  family: 4,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Destinatarios configurables desde el Panel (Módulo 8 > Notificaciones) en vez de
// hardcodeados. configuracion_notificaciones es por prestadora desde 2026-07-13
// (backend/src/db/schema_whatsapp_ia_01.sql sección 0) — antes era una fila global por
// evento, compartida sin darse cuenta por todas las prestadoras licenciatarias.
async function configuracionEvento(evento, prestadoraId) {
  const { data } = await supabase
    .from('configuracion_notificaciones')
    .select('emails, activo, whatsapp_activo')
    .eq('evento', evento)
    .eq('prestadora_id', prestadoraId)
    .single();

  return data;
}

// Si el evento no tiene emails cargados (o está desactivado), antes caía al inbox operativo
// de la cuenta SMTP compartida (process.env.SMTP_USER) — con más de una prestadora eso
// significaba que un aviso sin configurar en la prestadora B terminaba en el inbox operativo
// de la prestadora A. Ahora cae al email de contacto propio de esa prestadora
// (configuracion_prestadora.email), nunca a una cuenta de otra.
async function destinatariosEvento(evento, prestadoraId) {
  const data = await configuracionEvento(evento, prestadoraId);
  if (data && data.activo === false) return [];
  if (data?.emails?.length) return data.emails;

  const { data: prestadora } = await supabase
    .from('configuracion_prestadora')
    .select('email')
    .eq('prestadora_id', prestadoraId)
    .single();

  return prestadora?.email ? [prestadora.email] : [];
}

export async function enviarEmailCoordinador({ evento, prestadoraId, asunto, texto }) {
  const destinatarios = await destinatariosEvento(evento, prestadoraId);
  if (destinatarios.length === 0) return;

  // `from` sigue siendo la cuenta SMTP compartida a propósito: es un único relay de correo
  // saliente (credencial de infraestructura, no de negocio) — cada prestadora manda "desde"
  // esa cuenta hoy porque no existe (todavía) aprovisionamiento de SMTP propio por
  // licenciataria. El aislamiento real está en el destinatario, no en el remitente.
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: destinatarios.join(', '),
    subject: asunto,
    text: texto,
  });
}

export { configuracionEvento };

export async function enviarEmail({ to, asunto, texto }) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: asunto,
    text: texto,
  });
}
