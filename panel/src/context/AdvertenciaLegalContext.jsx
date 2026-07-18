import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';

const AdvertenciaLegalContext = createContext(null);

// Infraestructura genérica del pendiente #51 (docs/PENDIENTES.md) / CLAUDE.md §3 — sin
// ningún consumidor real todavía: ninguna función de gestión de Asistentes (rankings,
// penalización de inasistencias, etc.) existe hoy como toggle en el producto. Cuando se
// construya una de esas funciones, el toggle la envuelve así:
//
//   const { verificarAntesDeActivar } = useAdvertenciaLegal();
//   const puedeActivar = await verificarAntesDeActivar(prestadoraId, 'rankings');
//   if (puedeActivar) { ...activar de verdad... }
//
// Si la jurisdicción de esa prestadora no tiene fila en advertencias_legales para esa
// función, verificarAntesDeActivar resuelve true de inmediato, sin mostrar nada (CLAUDE.md
// §3: "si la jurisdicción no tiene documento legal cargado, no se muestra advertencia").
export function AdvertenciaLegalProvider({ children }) {
  const { usuario } = useAuth();
  const { t } = useLocale();
  const [pendiente, setPendiente] = useState(null); // { texto, prestadoraId, jurisdiccion, funcionClave }
  const resolverRef = useRef(null);

  const verificarAntesDeActivar = useCallback(async (prestadoraId, funcionClave) => {
    const { data: prestadora, error: errorPrestadora } = await supabase
      .from('prestadoras')
      .select('pais')
      .eq('id', prestadoraId)
      .single();
    if (errorPrestadora || !prestadora) return true;

    const { data: advertencia } = await supabase
      .from('advertencias_legales')
      .select('texto_advertencia')
      .eq('jurisdiccion', prestadora.pais)
      .eq('funcion_clave', funcionClave)
      .maybeSingle();
    if (!advertencia) return true;

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setPendiente({
        texto: advertencia.texto_advertencia,
        prestadoraId,
        jurisdiccion: prestadora.pais,
        funcionClave,
      });
    });
  }, []);

  const cancelar = useCallback(() => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setPendiente(null);
  }, []);

  const confirmar = useCallback(async () => {
    if (!pendiente) return;
    await supabase.from('auditoria_advertencias_legales').insert({
      prestadora_id: pendiente.prestadoraId,
      usuario_id: usuario.id,
      funcion_clave: pendiente.funcionClave,
      jurisdiccion: pendiente.jurisdiccion,
      texto_mostrado: pendiente.texto,
    });
    resolverRef.current?.(true);
    resolverRef.current = null;
    setPendiente(null);
  }, [pendiente, usuario]);

  return (
    <AdvertenciaLegalContext.Provider value={{ verificarAntesDeActivar }}>
      {children}
      {pendiente && (
        <div className="panel-modal-fondo" onClick={cancelar}>
          <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t.advertencias_legales.titulo}</h2>
            <p>{pendiente.texto}</p>
            <div className="panel-modal-acciones">
              <Button variant="secondary" onClick={cancelar}>{t.advertencias_legales.cancelar}</Button>
              <Button onClick={confirmar}>{t.advertencias_legales.aceptar}</Button>
            </div>
          </div>
        </div>
      )}
    </AdvertenciaLegalContext.Provider>
  );
}

export function useAdvertenciaLegal() {
  const ctx = useContext(AdvertenciaLegalContext);
  if (!ctx) throw new Error('useAdvertenciaLegal debe usarse dentro de AdvertenciaLegalProvider');
  return ctx;
}
