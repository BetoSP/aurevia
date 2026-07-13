import { supabase } from '../db/connection.js';

// Resuelve de qué prestadora es una request pública sin sesión (formularios del sitio
// público, sin login) a partir del dominio de origen — reemplaza el valor fijo que tenía
// backend/src/db/tenantTemporal.js (eliminado, ver schema_multitenant_04/05.sql). Mismo
// patrón que ya usa whatsappWebhook.js para resolver tenant sin sesión: nunca asumir un
// id fijo, siempre resolver contra un dato real de la request.
export async function resolverPrestadoraPublica(req, res, next) {
  let hostname = '';
  const origen = req.get('origin') || req.get('referer');
  if (origen) {
    try {
      hostname = new URL(origen).hostname;
    } catch {
      hostname = '';
    }
  }
  if (!hostname) {
    hostname = (req.get('host') || '').split(':')[0];
  }
  hostname = hostname.replace(/^www\./, '');

  const { data, error } = await supabase
    .from('configuracion_prestadora')
    .select('*')
    .eq('dominio', hostname)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  if (data) {
    req.prestadoraPublica = data;
    return next();
  }

  // Sin match de dominio: si hoy existe una única prestadora con presencia pública, se
  // asume esa (cubre desarrollo local y clientes sin Origin/Host reales, ej. curl/Postman).
  // Deja de alcanzar en cuanto exista una segunda prestadora pública — a partir de ahí un
  // dominio sin match debe rechazarse en vez de adivinar.
  const { data: todas, error: errorTodas } = await supabase
    .from('configuracion_prestadora')
    .select('*');
  if (errorTodas) return res.status(500).json({ error: errorTodas.message });

  if (todas.length === 1) {
    req.prestadoraPublica = todas[0];
    return next();
  }

  return res.status(404).json({ error: 'dominio_no_reconocido' });
}
