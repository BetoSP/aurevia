import nodemailer from 'nodemailer';

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

export async function enviarEmailCoordinador({ asunto, texto }) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.SMTP_USER,
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
