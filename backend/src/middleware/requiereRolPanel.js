import { supabase } from '../db/connection.js';

// Ítem D del pendiente #30 (docs/PLAN_MULTITENANT_PLM.md 3.4.1): tope de 5 min de
// inactividad dentro del "modo prestadora" — se corta en silencio, sin aviso previo,
// distinto del tope absoluto de 60 min (que sí tiene aviso a los 50, ver panelSesionTenant.js).
const INACTIVIDAD_LIMITE_MS = 5 * 60 * 1000;

// Ítem G del pendiente #30: las mutaciones que pasan por rutas Express usan la service
// role key (backend/src/db/connection.js) — sin JWT de usuario, así que los triggers de
// auditoria_admin_plataforma (schema_admin_plataforma_03_auditoria.sql) no las ven, porque
// auth.uid() da NULL dentro de un trigger disparado por una escritura con service role.
// Se audita acá, a nivel de request, en vez de a nivel de tabla/fila.
const METODOS_MUTACION = ['POST', 'PUT', 'PATCH', 'DELETE'];

async function registrarAuditoriaMutacionExpress({ adminId, prestadoraId, metodo, ruta }) {
  const { error } = await supabase.from('auditoria_admin_plataforma').insert({
    admin_id: adminId,
    prestadora_id: prestadoraId,
    tipo_evento: 'mutacion',
    detalle: { metodo, ruta },
  });
  if (error) console.error('Error registrando auditoría admin_plataforma (Express):', error.message);
}

// Ítem H del pendiente #30: decodifica el claim `aal` del JWT ya validado por
// supabase.auth.getUser() más arriba (no hace falta reverificar firma, solo leer el
// payload) — Supabase no expone el AAL en el objeto `user`, solo en el JWT en sí.
function leerAalDelToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload.aal ?? null;
  } catch {
    return null;
  }
}

export async function requiereRolPanel(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { data: userData, error: errorUsuario } = await supabase.auth.getUser(token);
  if (errorUsuario || !userData?.user) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { data: perfil, error: errorPerfil } = await supabase
    .from('usuarios')
    .select('rol, prestadora_id')
    .eq('id', userData.user.id)
    .single();

  if (errorPerfil || !perfil || !['admin_prestadora', 'coordinador', 'superadmin', 'admin_plataforma'].includes(perfil.rol)) {
    return res.status(403).json({ error: 'Rol sin permiso' });
  }

  if (['superadmin', 'admin_plataforma'].includes(perfil.rol)) {
    const { data: configPlataforma } = await supabase
      .from('configuracion_plataforma')
      .select('mfa_admin_obligatorio')
      .single();
    if (configPlataforma?.mfa_admin_obligatorio && leerAalDelToken(token) !== 'aal2') {
      return res.status(403).json({ error: 'MFA requerido', codigo: 'mfa_requerido' });
    }
  }

  let prestadoraId = perfil.prestadora_id;

  // admin_plataforma no tiene prestadora_id propia (docs/PLAN_MULTITENANT_PLM.md 3.4.1):
  // la resuelve acá, una vez, a partir de su sesión de tenant activa — así el resto de
  // las rutas reutiliza el mismo req.usuarioPanel.prestadoraId que ya usa admin_prestadora,
  // sin ningún branch específico de admin_plataforma en cada endpoint.
  if (perfil.rol === 'admin_plataforma') {
    const { data: sesion } = await supabase
      .from('sesiones_tenant_admin_plataforma')
      .select('id, prestadora_id, expira_at, ultima_actividad_at')
      .eq('admin_id', userData.user.id)
      .is('salida_at', null)
      .order('entrada_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const ahora = new Date();
    const vigente = Boolean(
      sesion &&
        new Date(sesion.expira_at) > ahora &&
        ahora.getTime() - new Date(sesion.ultima_actividad_at).getTime() <= INACTIVIDAD_LIMITE_MS
    );

    // El cierre real de la sesión vencida (salida_at) lo hace GET /sesion-tenant, que el
    // frontend hace polling cada 30s — acá alcanza con no exponer prestadoraId si no está
    // vigente, más info directa a Supabase con RLS queda igual bloqueada por current_tenant().
    // El polling de estado (GET /sesion-tenant) y el heartbeat de actividad (POST /actividad)
    // no bumpean acá — /actividad ya lo hace explícitamente, y contar el polling como
    // actividad real anularía el propio timeout de inactividad.
    const esRutaPropiaDeSesion = req.baseUrl === '/api/panel/sesion-tenant';
    if (sesion && vigente && !esRutaPropiaDeSesion) {
      await supabase
        .from('sesiones_tenant_admin_plataforma')
        .update({ ultima_actividad_at: ahora.toISOString() })
        .eq('id', sesion.id);
    }

    prestadoraId = vigente ? sesion.prestadora_id : null;
  }

  req.usuarioPanel = { id: userData.user.id, rol: perfil.rol, prestadoraId };

  // La ruta de sesión de tenant (entrar/salir/renovar) ya audita login/logout/renovación
  // explícitamente (panelSesionTenant.js) — no duplicar acá como "mutacion" genérica.
  const esRutaPropiaDeSesion = req.baseUrl === '/api/panel/sesion-tenant';
  if (perfil.rol === 'admin_plataforma' && prestadoraId && METODOS_MUTACION.includes(req.method) && !esRutaPropiaDeSesion) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        registrarAuditoriaMutacionExpress({
          adminId: userData.user.id,
          prestadoraId,
          metodo: req.method,
          ruta: req.originalUrl,
        });
      }
    });
  }

  next();
}
