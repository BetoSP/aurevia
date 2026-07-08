import crypto from 'crypto';
import { supabase } from '../db/connection.js';

// Mecanismo compartido: crea una cuenta real de Supabase Auth + su fila en `usuarios`,
// sin enviar ningún email todavía (Etapa 3/4 — PWA Asistentes/Familias — no existen aún,
// así que no tiene sentido invitar a alguien a loguearse en una app que no existe).
// `admin.createUser` nunca dispara emails por sí solo; el envío de invitación queda para
// cuando la PWA correspondiente esté en producción (usar `admin.inviteUserByEmail` en ese
// momento).
export async function crearCuentaConPerfil({ email, nombre, telefono, rol }) {
  const passwordTemporal = crypto.randomBytes(24).toString('base64url');

  const { data: authData, error: errorAuth } = await supabase.auth.admin.createUser({
    email,
    password: passwordTemporal,
    email_confirm: true,
  });

  if (errorAuth) {
    throw new Error(errorAuth.message);
  }

  const userId = authData.user.id;

  const { error: errorPerfil } = await supabase
    .from('usuarios')
    .insert({ id: userId, rol, nombre, telefono });

  if (errorPerfil) {
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(errorPerfil.message);
  }

  return userId;
}

export async function borrarCuenta(userId) {
  await supabase.from('usuarios').delete().eq('id', userId);
  await supabase.auth.admin.deleteUser(userId);
}
