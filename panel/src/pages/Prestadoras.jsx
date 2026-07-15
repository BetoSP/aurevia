import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../lib/supabaseClient';
import { useTenantSession } from '../context/TenantSessionContext';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { EstadoLista } from '../components/layout/EstadoLista';

const API_URL = import.meta.env.VITE_API_URL;

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

export function Prestadoras() {
  const { t } = useLocale();
  const { sesion, recargar: recargarSesion, salir } = useTenantSession();
  const [prestadoras, setPrestadoras] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [entrando, setEntrando] = useState(null);
  const [saliendo, setSaliendo] = useState(false);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    try {
      const [{ prestadoras: filas }] = await Promise.all([
        llamarApi('/prestadoras'),
        recargarSesion(),
      ]);
      setPrestadoras(filas);
      setEstado('listo');
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  }, [recargarSesion]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function handleEntrar(prestadoraId) {
    setEntrando(prestadoraId);
    setError(null);
    try {
      await llamarApi('/sesion-tenant', {
        method: 'POST',
        body: JSON.stringify({ prestadora_id: prestadoraId }),
      });
      await recargarSesion();
    } catch (err) {
      setError(err.message);
    } finally {
      setEntrando(null);
    }
  }

  async function handleSalir() {
    setSaliendo(true);
    setError(null);
    try {
      await salir();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaliendo(false);
    }
  }

  return (
    <div>
      <h1>{t.prestadoras.titulo}</h1>
      <p className="panel-explicacion">{t.prestadoras.explicacion}</p>

      {error && <Alert variant="error">{error}</Alert>}

      {sesion && (
        <Alert variant="info">
          <strong>{t.prestadoras.sesion_activa_titulo}:</strong> {sesion.prestadoras?.nombre_fantasia}
          {' — '}
          {t.prestadoras.sesion_activa_expira.replace('{hora}', new Date(sesion.expira_at).toLocaleTimeString())}
          {' '}
          <Button variant="secondary" onClick={handleSalir} disabled={saliendo}>
            {saliendo ? t.prestadoras.saliendo : t.prestadoras.salir}
          </Button>
        </Alert>
      )}

      <EstadoLista estado={estado} error={error} vacio={estado === 'listo' && prestadoras.length === 0} recargar={recargar}>
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.prestadoras.col_nombre}</th>
              <th>{t.prestadoras.col_estado}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {prestadoras.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre_fantasia}</td>
                <td>{p.estado}</td>
                <td>
                  <Button
                    variant="secondary"
                    onClick={() => handleEntrar(p.id)}
                    disabled={Boolean(sesion) || entrando === p.id}
                  >
                    {entrando === p.id ? t.prestadoras.entrando : t.prestadoras.entrar}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>
    </div>
  );
}
