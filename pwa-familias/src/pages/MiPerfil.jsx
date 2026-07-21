import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useLocale } from '../i18n/LocaleContext';
import { activarPush, desactivarPush, pushSoportado, suscripcionActual } from '../lib/push';

export default function MiPerfil() {
  const { t } = useLocale();
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState('');
  const [notifActivas, setNotifActivas] = useState(false);
  const [notifCargando, setNotifCargando] = useState(false);
  const [notifError, setNotifError] = useState('');

  useEffect(() => {
    let activo = true;
    api
      .perfil()
      .then(({ perfil: data }) => {
        if (activo) setPerfil(data);
      })
      .catch(() => {
        if (activo) setError(t.comun.error_generico);
      });
    if (pushSoportado()) {
      suscripcionActual().then((suscripcion) => {
        if (activo) setNotifActivas(!!suscripcion);
      });
    }
    return () => {
      activo = false;
    };
  }, []);

  async function alternarNotificaciones() {
    setNotifError('');
    setNotifCargando(true);
    try {
      if (notifActivas) {
        await desactivarPush();
        setNotifActivas(false);
      } else {
        if (Notification.permission === 'denied') {
          setNotifError(t.perfil.notificaciones_permiso_denegado);
          return;
        }
        const permiso = await Notification.requestPermission();
        if (permiso !== 'granted') {
          setNotifError(t.perfil.notificaciones_permiso_denegado);
          return;
        }
        await activarPush();
        setNotifActivas(true);
      }
    } catch {
      setNotifError(t.perfil.notificaciones_error);
    } finally {
      setNotifCargando(false);
    }
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!perfil) return <div className="estado-cargando">{t.comun.cargando}</div>;

  return (
    <div>
      <h1>{t.perfil.titulo}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '0.5rem 1.5rem' }}>
        <div style={{ fontWeight: 700, color: 'var(--azul-oscuro)', fontSize: '0.85rem' }}>{t.perfil.nombre}</div>
        <div>{perfil.nombre}</div>
        <div style={{ fontWeight: 700, color: 'var(--azul-oscuro)', fontSize: '0.85rem' }}>{t.perfil.telefono}</div>
        <div>{perfil.telefono || '—'}</div>
        <div style={{ fontWeight: 700, color: 'var(--azul-oscuro)', fontSize: '0.85rem' }}>{t.perfil.plan}</div>
        <div>{perfil.plan || '—'}</div>
      </div>

      <h2 style={{ marginTop: '2rem' }}>{t.perfil.notificaciones_titulo}</h2>
      {!pushSoportado() ? (
        <div className="alert">{t.perfil.notificaciones_no_soportadas}</div>
      ) : (
        <>
          <button type="button" className="btn btn-primary" disabled={notifCargando} onClick={alternarNotificaciones}>
            {notifCargando
              ? t.perfil.notificaciones_activando
              : notifActivas
              ? t.perfil.notificaciones_desactivar
              : t.perfil.notificaciones_activar}
          </button>
          {notifActivas && !notifCargando && <p>{t.perfil.notificaciones_activas}</p>}
          {notifError && <div className="alert alert-error">{notifError}</div>}
        </>
      )}
    </div>
  );
}
