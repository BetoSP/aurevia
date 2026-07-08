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
// hardcodeados. Si el evento no tiene emails cargados (o está desactivado), cae al inbox
// operativo por defecto para no perder el aviso.
async function destinatariosEvento(evento) {
  const { data } = await supabase
    .from('configuracion_notificaciones')
    .select('emails, activo')
    .eq('evento', evento)
    .single();

  if (data && data.activo === false) return [];
  if (data?.emails?.length) return data.emails;
  return [process.env.SMTP_USER];
}

export async function enviarEmailCoordinador({ evento, asunto, texto }) {
  const destinatarios = await destinatariosEvento(evento);
  if (destinatarios.length === 0) return;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: destinatarios.join(', '),
    subject: asunto,
    text: texto,
  });
}

export async function enviarEmail({ to, asunto, texto }) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: asunto,
    text: texto,
  });
}
