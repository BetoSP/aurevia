import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

const API_URL = import.meta.env.VITE_API_URL;
const TenantSessionContext = createContext(null);

async function llamarApi(path, opciones = {}) {
  const { data } = await supabase.auth.getSession();
  const respuesta = await fetch(`${API_URL}/api/panel${path}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token}`,
      ...opciones.headers,
    },
  });
  const resultado = await respuesta.json();
  if (!respuesta.ok) throw new Error(resultado.error);
  return resultado;
}

export function TenantSessionProvider({ children }) {
  const { usuario } = useAuth();
  const puedeTenerSesion = ['admin_plataforma', 'superadmin'].includes(usuario?.rol);
  const [sesion, setSesion] = useState(null);

  const recargar = useCallback(async () => {
    if (!puedeTenerSesion) {
      setSesion(null);
      return;
    }
    try {
      const { sesion: sesionActiva } = await llamarApi('/sesion-tenant');
      setSesion(sesionActiva);
    } catch {
      setSesion(null);
    }
  }, [puedeTenerSesion]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const salir = useCallback(async () => {
    await llamarApi('/sesion-tenant/salir', { method: 'POST' });
    await recargar();
  }, [recargar]);

  return (
    <TenantSessionContext.Provider value={{ sesion, recargar, salir }}>
      {children}
    </TenantSessionContext.Provider>
  );
}

export function useTenantSession() {
  const ctx = useContext(TenantSessionContext);
  if (!ctx) throw new Error('useTenantSession debe usarse dentro de TenantSessionProvider');
  return ctx;
}
