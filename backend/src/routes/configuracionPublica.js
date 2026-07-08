import { Router } from 'express';
import { supabase } from '../db/connection.js';

export const configuracionPublicaRouter = Router();

// Sin auth a propósito: el sitio público (sin login) necesita estos datos para no
// hardcodear teléfono/email/zonas (regla 1 de CLAUDE.md). Nunca expone nada de
// escalas_legales ni datos internos — solo lo que ya es público en el sitio.
configuracionPublicaRouter.get('/', async (req, res) => {
  const [{ data: empresa, error: errorEmpresa }, { data: zonas, error: errorZonas }] = await Promise.all([
    supabase.from('configuracion_empresa').select('nombre, telefono, whatsapp_numero, email, dominio, zona_cobertura_texto').eq('id', 1).single(),
    supabase.from('zonas_cobertura').select('codigo, nombre, categoria').eq('activa', true).order('orden'),
  ]);

  if (errorEmpresa || errorZonas) {
    return res.status(500).json({ error: (errorEmpresa || errorZonas).message });
  }

  res.json({ empresa, zonas });
});
