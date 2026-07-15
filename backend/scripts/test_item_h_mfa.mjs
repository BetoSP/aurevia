// Prueba puntual del ítem H del pendiente #30 (2026-07-15) — verifica de punta a punta:
// toggle apagado por defecto, PATCH prende el toggle, la siguiente request queda bloqueada
// con 403 mfa_requerido, enrolamiento + verificación TOTP suben la sesión a aal2, la request
// vuelve a pasar, RLS (es_superadmin() vía tabla 'prestadoras') respeta el mismo gate, y
// apagar el toggle de nuevo saca el requisito. Corre contra el backend local (localhost:4000)
// — arrancar el server antes de correr este script. Borra todo lo que crea al terminar.
//
// No hay librería TOTP instalada (otplib/speakeasy) ni conviene sumar una dependencia nueva
// solo para este script de un solo uso — el algoritmo RFC 6238 es ~15 líneas con el módulo
// crypto nativo de Node, así que se implementa acá mismo.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import crypto from 'crypto';
dotenv.config();

const API = 'http://localhost:4000/api/panel';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const panelEnv = readFileSync(new URL('../../panel/.env', import.meta.url), 'utf8');
const anonKey = panelEnv.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();
const anon = createClient(process.env.SUPABASE_URL, anonKey);

const SANDBOX_ID = '5d727437-a5ff-432f-b9f6-10015e61ffef';
const EMAIL = 'alas.para.escribir.2026+superadmin.test.itemh@gmail.com';
const PASSWORD = 'PruebaSuperadminItemH2026!';

let authUserId, factorId;

function base32Decode(base32) {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of base32.replace(/=+$/, '').toUpperCase()) {
    bits += alfabeto.indexOf(c).toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totp(secretBase32, paso = 30, digitos = 6) {
  const contador = Math.floor(Date.now() / 1000 / paso);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(contador));
  const hmac = crypto.createHmac('sha1', base32Decode(secretBase32)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const codigo = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff)) % 10 ** digitos;
  return codigo.toString().padStart(digitos, '0');
}

async function ponerToggle(token, valor) {
  const r = await fetch(`${API}/configuracion-plataforma/mfa`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mfa_admin_obligatorio: valor }),
  });
  return r;
}

async function contarPrestadorasVisibles(client) {
  const { data, error } = await client.from('prestadoras').select('id').eq('id', SANDBOX_ID);
  if (error) throw error;
  return data.length;
}

async function main() {
  const { data: auth, error: errorAuth } = await admin.auth.admin.createUser({
    email: EMAIL, password: PASSWORD, email_confirm: true,
  });
  if (errorAuth) throw errorAuth;
  authUserId = auth.user.id;

  const { error: errorUsuario } = await admin.from('usuarios').insert({
    id: authUserId, rol: 'superadmin', nombre: 'PRUEBA temporal — superadmin item H',
    prestadora_id: SANDBOX_ID,
  });
  if (errorUsuario) throw errorUsuario;

  let { data: sesion, error: errorLogin } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (errorLogin) throw errorLogin;
  let token = sesion.session.access_token;
  const headers = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

  // 1. Toggle apagado por defecto
  const rGet0 = await fetch(`${API}/configuracion-plataforma/mfa`, { headers: headers() });
  const jGet0 = await rGet0.json();
  console.log('1. GET /configuracion-plataforma/mfa (inicial):', rGet0.status, jGet0.configuracion);
  if (jGet0.configuracion?.mfa_admin_obligatorio !== false) throw new Error('FALLO: el toggle no arrancó apagado');

  // 2. Con el toggle apagado, una ruta cualquiera pasa sin aal2
  const rLibre = await fetch(`${API}/prestadoras`, { headers: headers() });
  console.log('2. GET /prestadoras con toggle apagado:', rLibre.status);
  if (!rLibre.ok) throw new Error('FALLO: no debería exigir MFA con el toggle apagado: ' + (await rLibre.text()));

  // 3. RLS directa (es_superadmin()) también visible sin aal2, toggle apagado
  const visiblesAntes = await contarPrestadorasVisibles(anon);
  console.log('3. RLS prestadoras visibles (toggle apagado, sin aal2):', visiblesAntes);
  if (visiblesAntes !== 1) throw new Error('FALLO: es_superadmin() debería dejar pasar con el toggle apagado');

  // 4. Prender el toggle
  const rPatch1 = await ponerToggle(token, true);
  console.log('4. PATCH toggle -> true:', rPatch1.status);
  if (!rPatch1.ok) throw new Error('FALLO al prender el toggle: ' + (await rPatch1.text()));

  // 5. Con el toggle prendido y sin aal2, la misma ruta debe dar 403 mfa_requerido
  const rBloqueado = await fetch(`${API}/prestadoras`, { headers: headers() });
  const jBloqueado = await rBloqueado.json();
  console.log('5. GET /prestadoras con toggle prendido, sin aal2:', rBloqueado.status, jBloqueado);
  if (rBloqueado.status !== 403 || jBloqueado.codigo !== 'mfa_requerido') throw new Error('FALLO: debería bloquear con mfa_requerido');

  // 6. RLS también debe dejar de mostrar la prestadora sin aal2
  const visiblesBloqueado = await contarPrestadorasVisibles(anon);
  console.log('6. RLS prestadoras visibles (toggle prendido, sin aal2):', visiblesBloqueado);
  if (visiblesBloqueado !== 0) throw new Error('FALLO: es_superadmin() debería bloquear sin aal2 con el toggle prendido');

  // 7. Enrolar TOTP
  const { data: enrolar, error: errorEnroll } = await anon.auth.mfa.enroll({ factorType: 'totp' });
  if (errorEnroll) throw errorEnroll;
  factorId = enrolar.id;
  const secreto = enrolar.totp.secret;
  console.log('7. Enrolado, factorId:', factorId);

  // 8. Challenge + verify con un código TOTP calculado del secreto
  const { data: challenge, error: errorChallenge } = await anon.auth.mfa.challenge({ factorId });
  if (errorChallenge) throw errorChallenge;
  const codigo = totp(secreto);
  const { data: verificado, error: errorVerify } = await anon.auth.mfa.verify({ factorId, challengeId: challenge.id, code: codigo });
  if (errorVerify) throw new Error('FALLO al verificar TOTP: ' + errorVerify.message);
  console.log('8. Verificado, nueva sesión aal:', JSON.parse(Buffer.from(verificado.access_token.split('.')[1], 'base64url').toString('utf8')).aal);
  token = verificado.access_token;

  // 9. Ahora la ruta Express debe pasar
  const rDespuesExpress = await fetch(`${API}/prestadoras`, { headers: headers() });
  console.log('9. GET /prestadoras con aal2:', rDespuesExpress.status);
  if (!rDespuesExpress.ok) throw new Error('FALLO: debería pasar con aal2: ' + (await rDespuesExpress.text()));

  // 10. RLS directa también debe volver a mostrar la prestadora
  const visiblesConAal2 = await contarPrestadorasVisibles(anon);
  console.log('10. RLS prestadoras visibles (toggle prendido, con aal2):', visiblesConAal2);
  if (visiblesConAal2 !== 1) throw new Error('FALLO: es_superadmin() debería dejar pasar con aal2');

  // 11. Apagar el toggle de nuevo saca el requisito (usando el mismo token, ya aal2)
  const rPatch0 = await ponerToggle(token, false);
  console.log('11. PATCH toggle -> false:', rPatch0.status);
  if (!rPatch0.ok) throw new Error('FALLO al apagar el toggle: ' + (await rPatch0.text()));

  console.log('Item H verificado correctamente: toggle off/on, bloqueo Express, bloqueo RLS, enrolamiento, verificación, aal2 en ambas capas, toggle de vuelta a off.');
}

async function limpiar() {
  try {
    // actualizado_por queda apuntando al usuario de prueba tras el PATCH del paso 11 — hay
    // que limpiarlo antes de borrar el usuario, si no la FK configuracion_plataforma_actualizado_por_fkey
    // bloquea el delete en silencio (el error no se estaba chequeando acá).
    await admin.from('configuracion_plataforma').update({ mfa_admin_obligatorio: false, actualizado_por: null }).eq('id', true);
  } catch {}
  if (authUserId) {
    if (factorId) {
      try { await admin.auth.admin.mfa.deleteFactor({ id: factorId, userId: authUserId }); } catch {}
    }
    await admin.from('usuarios').delete().eq('id', authUserId);
    await admin.auth.admin.deleteUser(authUserId);
  }
  console.log('Datos de prueba borrados, toggle confirmado en false.');
}

main()
  .then(() => limpiar())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    await limpiar();
    process.exit(1);
  });
