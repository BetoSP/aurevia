import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const EmpresaContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL;

// Sin sesión (Login) usamos el endpoint público, resuelto por dominio.
// Con sesión, cada Organización lee su propia fila vía RLS
// (prestadora_lee_su_configuracion) — nunca el fallback de dominio, que
// solo sirve para tráfico anónimo del sitio público.
async function cargarConfiguracionPublica() {
  const r = await fetch(`${API_URL}/api/configuracion-publica`);
  const data = await r.json();
  return data.empresa ?? null;
}

async function cargarConfiguracionPropia() {
  const { data } = await supabase
    .from('configuracion_prestadora')
    .select('nombre, telefono, whatsapp_numero, email, dominio, zona_cobertura_texto')
    .maybeSingle();
  return data ?? null;
}

export function EmpresaProvider({ children }) {
  const [empresa, setEmpresa] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargarSegunSesion(session) {
      const data = session ? await cargarConfiguracionPropia() : await cargarConfiguracionPublica();
      if (activo) setEmpresa(data);
    }

    supabase.auth.getSession().then(({ data: { session } }) => cargarSegunSesion(session));

    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, session) => {
      cargarSegunSesion(session);
    });

    return () => {
      activo = false;
      suscripcion.subscription.unsubscribe();
    };
  }, []);

  return <EmpresaContext.Provider value={{ empresa }}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error('useEmpresa debe usarse dentro de EmpresaProvider');
  return ctx;
}
