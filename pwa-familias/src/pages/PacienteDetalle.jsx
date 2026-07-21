import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import { useLocale } from '../i18n/LocaleContext';

function segundosDesde(fecha) {
  return Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 1000));
}

export default function PacienteDetalle() {
  const { id } = useParams();
  const { t } = useLocale();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [ubicacion, setUbicacion] = useState(null);
  const [, setTick] = useState(0);

  function cargar() {
    api
      .paciente(id)
      .then((data) => setDatos(data))
      .catch(() => setError(t.comun.error_generico));
  }

  useEffect(() => {
    setDatos(null);
    cargar();
  }, [id]);

  const guardiaActiva = datos?.guardiaActiva;

  useEffect(() => {
    if (!guardiaActiva?.id) {
      setUbicacion(null);
      return;
    }
    if (guardiaActiva.ubicacion_actual_lat && guardiaActiva.ubicacion_actual_lng) {
      setUbicacion({
        lat: guardiaActiva.ubicacion_actual_lat,
        lng: guardiaActiva.ubicacion_actual_lng,
        at: guardiaActiva.ubicacion_actual_at,
      });
    }
    const canal = supabase
      .channel(`guardia-ubicacion-${guardiaActiva.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'guardias', filter: `id=eq.${guardiaActiva.id}` },
        (payload) => {
          const fila = payload.new;
          if (fila.ubicacion_actual_lat && fila.ubicacion_actual_lng) {
            setUbicacion({ lat: fila.ubicacion_actual_lat, lng: fila.ubicacion_actual_lng, at: fila.ubicacion_actual_at });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [guardiaActiva?.id]);

  useEffect(() => {
    if (!ubicacion) return;
    const intervalo = setInterval(() => setTick((v) => v + 1), 5000);
    return () => clearInterval(intervalo);
  }, [ubicacion]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (datos === null) return <div className="estado-cargando">{t.comun.cargando}</div>;

  const { paciente, guardiaProxima, alertasActivas } = datos;
  const guardia = guardiaActiva || guardiaProxima;
  const asistente = guardia?.asistentes;

  return (
    <div>
      <h1>{paciente.nombre}</h1>
      <p className="guardia-card-detalle">
        {t.paciente.domicilio}: {paciente.domicilio || '—'}
      </p>

      {alertasActivas.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h2>{t.paciente.alertas_activas_titulo}</h2>
          {alertasActivas.map((a) => (
            <div key={a.id} className={`alert alerta-${a.nivel}`}>
              <span className={`badge badge-${a.nivel}`}>{t.alertas[`nivel_${a.nivel}`] || a.nivel}</span> {a.descripcion}
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: '1.5rem' }}>{guardiaActiva ? t.paciente.guardia_actual_titulo : t.paciente.guardia_proxima_titulo}</h2>

      {!guardia && <div className="estado-vacio">{t.paciente.sin_guardia}</div>}

      {guardia && (
        <div className={`guardia-card guardia-${guardia.estado}`}>
          <div className="guardia-card-paciente">{t.paciente.asistente_asignado}: {asistente?.nombre || t.paciente.sin_asistente}</div>
          <div className="guardia-card-detalle">
            {guardia.fecha} · {guardia.hora_inicio?.slice(0, 5)} - {guardia.hora_fin?.slice(0, 5)}
          </div>
          {guardiaActiva && !guardiaActiva.checkin_at && <div className="guardia-card-detalle">{t.paciente.checkin_pendiente}</div>}
        </div>
      )}

      {guardiaActiva && ubicacion && (
        <>
          <h2 style={{ marginTop: '1.5rem' }}>{t.paciente.ubicacion_en_vivo}</h2>
          <iframe
            className="mapa-embed"
            title={t.paciente.ubicacion_en_vivo}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${ubicacion.lng - 0.01}%2C${ubicacion.lat - 0.01}%2C${ubicacion.lng + 0.01}%2C${ubicacion.lat + 0.01}&layer=mapnik&marker=${ubicacion.lat}%2C${ubicacion.lng}`}
          />
          <p className="mapa-actualizado">{t.paciente.ubicacion_actualizada.replace('{segundos}', segundosDesde(ubicacion.at))}</p>
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.5rem' }}>
        <Link to={`/pacientes/${id}/reportes`} className="btn btn-secondary btn-full">
          {t.paciente.ver_reportes}
        </Link>
        <Link to={`/pacientes/${id}/alertas`} className="btn btn-secondary btn-full">
          {t.paciente.ver_alertas}
        </Link>
        <Link to={`/pacientes/${id}/asistente`} className="btn btn-secondary btn-full">
          {t.paciente.ver_asistente}
        </Link>
      </div>
    </div>
  );
}
