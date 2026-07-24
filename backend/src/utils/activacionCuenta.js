import crypto from 'crypto';
import { supabase } from '../db/connection.js';
import { enviarEmail } from './email.js';

const DIAS_VALIDEZ_TOKEN = 7;

// URL pública de la PWA correspondiente al rol de la cuenta nueva — nunca hardcodeada
// (CLAUDE.md §7 regla 1), viene de variables de entorno propias por app (backend/.env.example).
function urlAppPorRol(rol) {
  if (rol === 'asistente') return process.env.PWA_ASISTENTES_URL;
  return process.env.PWA_FAMILIAS_URL;
}

function textosActivacionCuenta(nombre, link) {
  return {
    'es-AR': {
      asunto: 'Activá tu cuenta en Aurevia',
      texto: `Hola ${nombre},\n\nTe invitamos a activar tu cuenta en Aurevia para poder acceder desde tu celular.\n\nActivá tu cuenta acá (el link vence en ${DIAS_VALIDEZ_TOKEN} días):\n${link}\n\nSi no esperabas este email, podés ignorarlo.`,
    },
    en: {
      asunto: 'Activate your Aurevia account',
      texto: `Hi ${nombre},\n\nYou've been invited to activate your Aurevia account so you can access it from your phone.\n\nActivate your account here (this link expires in ${DIAS_VALIDEZ_TOKEN} days):\n${link}\n\nIf you weren't expecting this email, you can ignore it.`,
    },
    'pt-BR': {
      asunto: 'Ative sua conta na Aurevia',
      texto: `Olá ${nombre},\n\nVocê foi convidado a ativar sua conta na Aurevia para acessar pelo celular.\n\nAtive sua conta aqui (o link expira em ${DIAS_VALIDEZ_TOKEN} dias):\n${link}\n\nSe você não esperava este email, pode ignorá-lo.`,
    },
  };
}

// Punto único de verdad: genera el token de un solo uso y manda el email de activación por
// el SMTP que ya existe (email.js) — usado por crearCuentaConPerfil cuando la cuenta nueva
// es de Familia/Asistente/Círculo (pendiente #75, docs/PENDIENTES.md), nunca para
// Coordinador/Admin_prestadora/Superadmin (esos siguen con el flujo manual existente).
export async function invitarActivacionCuenta({ usuarioId, email, nombre, rol, idioma = 'es-AR' }) {
  const appUrl = urlAppPorRol(rol);
  if (!appUrl) {
    // Sin URL configurada (ej. entorno local sin la variable seteada) no se puede armar un
    // link válido — se registra y se sigue sin romper el alta de la cuenta, en vez de fallar
    // toda la operación por un email que de todos modos no se podría entregar bien.
    console.error(`invitarActivacionCuenta: falta la variable de entorno para el rol "${rol}", no se envió el email de activación`);
    return;
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const expiraEn = new Date(Date.now() + DIAS_VALIDEZ_TOKEN * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('tokens_activacion_cuenta')
    .insert({ usuario_id: usuarioId, token, expira_en: expiraEn });
  if (error) throw new Error(error.message);

  const link = `${appUrl}/activar-cuenta?token=${token}`;
  const textos = textosActivacionCuenta(nombre, link)[idioma] ?? textosActivacionCuenta(nombre, link)['es-AR'];
  await enviarEmail({ to: email, asunto: textos.asunto, texto: textos.texto });
}

// Usado tanto por el alta inicial como por "Reenviar invitación" (token vencido o extraviado).
export async function reenviarActivacionCuenta(usuarioId) {
  const { data: usuario, error: errorUsuario } = await supabase
    .from('usuarios')
    .select('email, nombre, rol')
    .eq('id', usuarioId)
    .single();
  if (errorUsuario || !usuario) throw new Error('Cuenta no encontrada');

  await invitarActivacionCuenta({ usuarioId, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol });
}

// Consumido por el endpoint público POST /api/activar-cuenta — valida el token (existe, no
// vencido, no usado), fija la contraseña real elegida por la persona, y lo marca usado.
// Nunca expone a qué Prestadora pertenece la cuenta ni ningún otro dato del usuario.
export async function activarCuentaConToken(token, passwordNueva) {
  const { data: fila, error: errorFila } = await supabase
    .from('tokens_activacion_cuenta')
    .select('id, usuario_id, expira_en, usado_en')
    .eq('token', token)
    .maybeSingle();

  if (errorFila || !fila) throw new Error('token_invalido');
  if (fila.usado_en) throw new Error('token_ya_usado');
  if (new Date(fila.expira_en) < new Date()) throw new Error('token_vencido');

  const { error: errorPassword } = await supabase.auth.admin.updateUserById(fila.usuario_id, { password: passwordNueva });
  if (errorPassword) throw new Error(errorPassword.message);

  await supabase.from('tokens_activacion_cuenta').update({ usado_en: new Date().toISOString() }).eq('id', fila.id);
}
