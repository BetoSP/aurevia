// Prueba puntual del ítem B del pendiente #30 (2026-07-14) — verifica que es_superadmin() ya
// no da bypass total: una cuenta superadmin debe ver filas de la sandbox pero NO filas de una
// prestadora real (prestadora-original), leyendo con su propia sesión (RLS real, no Service Role Key).
// Borra todo lo que crea al terminar — la sandbox (prestadoras) y la cuenta superadmin real no
// se tocan.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
dotenv.config();

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const panelEnv = readFileSync(new URL('../../panel/.env', import.meta.url), 'utf8');
const anonKey = panelEnv.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();
const anon = createClient(process.env.SUPABASE_URL, anonKey);

const SANDBOX_ID = '5d727437-a5ff-432f-b9f6-10015e61ffef';
const prestadora-original_ID = '874f54d7-4383-4d54-8b9f-f51d02f0dd11';
const EMAIL = 'alas.para.escribir.2026+superadmin.test.itemb@gmail.com';
const PASSWORD = 'PruebaSuperadminItemB2026!';

let authUserId, asistenteSandboxId, asistenteprestadora-originalId, usuarioAsistenteSandboxId, usuarioAsistenteprestadora-originalId;

async function main() {
  const { data: auth, error: errorAuth } = await admin.auth.admin.createUser({
    email: EMAIL, password: PASSWORD, email_confirm: true,
  });
  if (errorAuth) throw errorAuth;
  authUserId = auth.user.id;

  const { error: errorUsuario } = await admin.from('usuarios').insert({
    id: authUserId, rol: 'superadmin', nombre: 'PRUEBA temporal — Superadmin item B',
    prestadora_id: SANDBOX_ID,
  });
  if (errorUsuario) throw errorUsuario;

  // asistentes.id referencia usuarios(id), que a su vez referencia auth.users(id) — hace
  // falta un auth user real (no solo un UUID cualquiera) por cada asistente de prueba.
  const { data: authSandbox, error: errAuthSandbox } = await admin.auth.admin.createUser({
    email: 'alas.para.escribir.2026+asistente.test.itemb.sandbox@gmail.com', password: PASSWORD, email_confirm: true,
  });
  if (errAuthSandbox) throw errAuthSandbox;
  const { data: authprestadora-original, error: errAuthprestadora-original } = await admin.auth.admin.createUser({
    email: 'alas.para.escribir.2026+asistente.test.itemb.prestadora-original@gmail.com', password: PASSWORD, email_confirm: true,
  });
  if (errAuthprestadora-original) throw errAuthprestadora-original;
  usuarioAsistenteSandboxId = authSandbox.user.id;
  usuarioAsistenteprestadora-originalId = authprestadora-original.user.id;
  const { error: errUSandbox } = await admin.from('usuarios').insert({
    id: usuarioAsistenteSandboxId, rol: 'asistente', nombre: 'PRUEBA temporal — usuario asistente sandbox',
    prestadora_id: SANDBOX_ID,
  });
  if (errUSandbox) throw errUSandbox;
  const { error: errUprestadora-original } = await admin.from('usuarios').insert({
    id: usuarioAsistenteprestadora-originalId, rol: 'asistente', nombre: 'PRUEBA temporal — usuario asistente prestadora-original',
    prestadora_id: prestadora-original_ID,
  });
  if (errUprestadora-original) throw errUprestadora-original;

  const { data: aSandbox, error: errASandbox } = await admin.from('asistentes').insert({
    id: usuarioAsistenteSandboxId, nombre: 'PRUEBA temporal — Asistente sandbox', estado: 'activo', tipo_vinculo: 'monotributo',
    fecha_alta: '2026-07-14', prestadora_id: SANDBOX_ID, canales: ['directo'],
  }).select('id').single();
  if (errASandbox) throw errASandbox;
  asistenteSandboxId = aSandbox.id;

  const { data: aprestadora-original, error: errAprestadora-original } = await admin.from('asistentes').insert({
    id: usuarioAsistenteprestadora-originalId, nombre: 'PRUEBA temporal — Asistente prestadora-original real', estado: 'activo', tipo_vinculo: 'monotributo',
    fecha_alta: '2026-07-14', prestadora_id: prestadora-original_ID, canales: ['directo'],
  }).select('id').single();
  if (errAprestadora-original) throw errAprestadora-original;
  asistenteprestadora-originalId = aprestadora-original.id;

  const { data: sesion, error: errorLogin } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (errorLogin) throw errorLogin;

  const clienteSuperadmin = createClient(process.env.SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: `Bearer ${sesion.session.access_token}` } },
  });

  const { data: veSandbox, error: errVeSandbox } = await clienteSuperadmin
    .from('asistentes').select('id, nombre').eq('id', asistenteSandboxId).maybeSingle();
  const { data: veprestadora-original, error: errVeprestadora-original } = await clienteSuperadmin
    .from('asistentes').select('id, nombre').eq('id', asistenteprestadora-originalId).maybeSingle();

  console.log('--- Resultado ---');
  console.log('Ve asistente de la sandbox (esperado: SÍ lo ve):', veSandbox ? 'OK ve' : 'NO ve', errVeSandbox?.message || '');
  console.log('Ve asistente de prestadora-original real (esperado: NO lo ve):', veprestadora-original ? 'MAL — lo ve' : 'OK no lo ve', errVeprestadora-original?.message || '');

  if (!veSandbox) throw new Error('FALLO: superadmin no ve la sandbox, algo se rompió en el acotamiento');
  if (veprestadora-original) throw new Error('FALLO DE SEGURIDAD: superadmin todavía ve datos de una prestadora real');

  console.log('Item B verificado correctamente: superadmin acotado a la sandbox.');
}

async function limpiar() {
  if (asistenteSandboxId) await admin.from('asistentes').delete().eq('id', asistenteSandboxId);
  if (asistenteprestadora-originalId) await admin.from('asistentes').delete().eq('id', asistenteprestadora-originalId);
  if (usuarioAsistenteSandboxId) {
    await admin.from('usuarios').delete().eq('id', usuarioAsistenteSandboxId);
    await admin.auth.admin.deleteUser(usuarioAsistenteSandboxId);
  }
  if (usuarioAsistenteprestadora-originalId) {
    await admin.from('usuarios').delete().eq('id', usuarioAsistenteprestadora-originalId);
    await admin.auth.admin.deleteUser(usuarioAsistenteprestadora-originalId);
  }
  if (authUserId) {
    await admin.from('usuarios').delete().eq('id', authUserId);
    await admin.auth.admin.deleteUser(authUserId);
  }
  console.log('Datos de prueba borrados (sandbox prestadora permanece intacta).');
}

main()
  .then(() => limpiar())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    await limpiar();
    process.exit(1);
  });
