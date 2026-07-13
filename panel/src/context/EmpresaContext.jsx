import { createContext, useContext, useEffect, useState } from 'react';

const EmpresaContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL;

export function EmpresaProvider({ children }) {
  const [empresa, setEmpresa] = useState(null);

  useEffect(() => {
    let activo = true;
    fetch(`${API_URL}/api/configuracion-publica`)
      .then((r) => r.json())
      .then((data) => {
        if (activo) setEmpresa(data.empresa ?? null);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  return <EmpresaContext.Provider value={{ empresa }}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error('useEmpresa debe usarse dentro de EmpresaProvider');
  return ctx;
}
