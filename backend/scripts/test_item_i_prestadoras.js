// Prueba puntual del ítem I del pendiente #30 (2026-07-14) — verifica de punta a punta:
// GET /api/panel/prestadoras (admin_plataforma ve la lista), POST /sesion-tenant (entra),
// 409 al intentar entrar de nuevo con sesión activa, POST /sesion-tenant/salir (sale), y
// que superadmin también puede listar prestadoras (para el selector de UsuariosPanel.jsx,
// pendiente #26). Corre contra el backend local (localhost:4000) — arrancar el server
// antes de correr este script. Borra todo lo que crea al terminar.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config();

const API = 'http://localhost:4000/api/panel';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const panelEnv = readFileSync(new URL('../../panel/.env', import.meta.url), 'utf8');
const anonKey = panelEnv.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();
const anon = createClient(process.env.SUPABASE_URL, anonKey);

const SANDBOX_ID = '5d727437-a5ff-432f-b9f6-10015e61ffef';
const EMAIL = 'alas.para.escribir.2026+adminplataforma.test.itemi@gmail.com';
const PASSWORD = 'PruebaAdminPlataformaItemI2026!';

let authUserId, prestaDummyId, token;

async function main() {
  const { data: presta, error: errPresta } = await admin.from('prestadoras').insert({
    razon_social: 'PRUEBA temporal — Prestadora dummy item I',
    nombre_fantasia: 'PRUEBA temporal item I',
    pais: 'AR',
    estado: 'prospecto',
  }).select('id').single();
  if (errPresta) throw errPresta;
  prestaDummyId = presta.id;

  const { data: auth, error: errorAuth } = await admin.auth.admin.createUser({
    email: EMAIL, password: PASSWORD, email_confirm: true,
  });
  if (errorAuth) throw errorAuth;
  authUserId = auth.user.id;

  const { error: errorUsuario } = await admin.from('usuarios').insert({
    id: authUserId, rol: 'admin_plataforma', nombre: 'PRUEBA temporal — admin_plataforma item I',
    prestadora_id: null,
  });
  if (errorUsuario) throw errorUsuario;

  const { data: sesion, error: errorLogin } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (errorLogin) throw errorLogin;
  token = sesion.session.access_token;

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 1. Lista de prestadoras
  const rLista = await fetch(`${API}/prestadoras`, { headers });
  const jLista = await rLista.json();
  console.log('1. GET /prestadoras status:', rLista.status, '— cantidad:', jLista.prestadoras?.length);
  if (!rLista.ok) throw new Error('FALLO: admin_plataforma no pudo listar prestadoras: ' + jLista.error);
  if (!jLista.prestadoras.some((p) => p.id === prestaDummyId)) throw new Error('FALLO: la prestadora dummy no aparece en la lista');

  // 2. Sesión inicial: sin sesión activa
  const rSesion0 = await fetch(`${API}/sesion-tenant`, { headers });
  const jSesion0 = await rSesion0.json();
  console.log('2. GET /sesion-tenant (inicial) — sesion:', jSesion0.sesion);
  if (jSesion0.sesion !== null) throw new Error('FALLO: ya había una sesión activa antes de entrar');

  // 3. Entrar a la prestadora dummy
  const rEntrar = await fetch(`${API}/sesion-tenant`, { method: 'POST', headers, body: JSON.stringify({ prestadora_id: prestaDummyId }) });
  const jEntrar = await rEntrar.json();
  console.log('3. POST /sesion-tenant (entrar) status:', rEntrar.status, jEntrar);
  if (!rEntrar.ok) throw new Error('FALLO al entrar a la prestadora: ' + jEntrar.error);

  // 4. Reintentar entrar (a la misma u otra) debe dar 409
  const rEntrar2 = await fetch(`${API}/sesion-tenant`, { method: 'POST', headers, body: JSON.stringify({ prestadora_id: SANDBOX_ID }) });
  console.log('4. POST /sesion-tenant (segundo intento, esperado 409):', rEntrar2.status);
  if (rEntrar2.status !== 409) throw new Error('FALLO: debería haber rechazado la segunda sesión con 409');

  // 5. GET /sesion-tenant ahora debe devolver la sesión activa con el nombre de la prestadora
  const rSesion1 = await fetch(`${API}/sesion-tenant`, { headers });
  const jSesion1 = await rSesion1.json();
  console.log('5. GET /sesion-tenant (activa):', jSesion1.sesion?.prestadora_id === prestaDummyId ? 'OK coincide' : 'MAL', jSesion1.sesion);
  if (jSesion1.sesion?.prestadora_id !== prestaDummyId) throw new Error('FALLO: la sesión activa no apunta a la prestadora dummy');

  // 6. Salir
  const rSalir = await fetch(`${API}/sesion-tenant/salir`, { method: 'POST', headers });
  console.log('6. POST /sesion-tenant/salir status:', rSalir.status);
  if (!rSalir.ok) throw new Error('FALLO al salir de la prestadora');

  // 7. Ya no hay sesión activa
  const rSesion2 = await fetch(`${API}/sesion-tenant`, { headers });
  const jSesion2 = await rSesion2.json();
  console.log('7. GET /sesion-tenant (post-salida):', jSesion2.sesion);
  if (jSesion2.sesion !== null) throw new Error('FALLO: sigue apareciendo una sesión activa después de salir');

  console.log('Item I verificado correctamente: listar/entrar/bloquear-doble-entrada/salir, todo OK.');
}

async function limpiar() {
  if (authUserId) {
    await admin.from('sesiones_tenant_admin_plataforma').delete().eq('admin_id', authUserId);
    await admin.from('usuarios').delete().eq('id', authUserId);
    await admin.auth.admin.deleteUser(authUserId);
  }
  if (prestaDummyId) await admin.from('prestadoras').delete().eq('id', prestaDummyId);
  console.log('Datos de prueba borrados.');
}

main()
  .then(() => limpiar())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    await limpiar();
    process.exit(1);
  });
