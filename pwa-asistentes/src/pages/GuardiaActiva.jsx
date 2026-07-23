import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLocale } from '../i18n/LocaleContext';
import { agregarACola, nuevoId, pendientesDeGuardia } from '../lib/colaOffline';
import { sincronizarCola, suscribirseASincronizacion } from '../lib/sincronizarCola';

function esErrorDeRed(error) {
  return error instanceof TypeError;
}

function obtenerUbicacion() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('sin_geo'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicion) => resolve({ lat: posicion.coords.latitude, lng: posicion.coords.longitude }),
      () => reject(new Error('sin_geo')),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

function tiempoTranscurrido(desde) {
  const ms = Date.now() - new Date(desde).getTime();
  const minutos = Math.floor(ms / 60000);
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  return `${String(horas).padStart(2, '0')}:${String(minutosRestantes).padStart(2, '0')}`;
}

export default function GuardiaActiva() {
  const { id } = useParams();
  const { t } = useLocale();
  const [guardia, setGuardia] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [haciendoCheckin, setHaciendoCheckin] = useState(false);
  const [reportes, setReportes] = useState(null);
  const [mostrandoReportes, setMostrandoReportes] = useState(false);
  const [tick, setTick] = useState(0);
  const [checkinPendiente, setCheckinPendiente] = useState(null); // { desde } o null

  function cargar() {
    api
      .guardia(id)
      .then(({ guardia: data }) => setGuardia(data))
      .catch(() => setError(t.comun.error_generico));
  }

  async function revisarPendientes() {
    const pendientes = await pendientesDeGuardia(id);
    const checkin = pendientes.find((p) => p.tipo === 'checkin');
    setCheckinPendiente(checkin ? { desde: checkin.creadoEn } : null);
  }

  useEffect(() => {
    cargar();
    revisarPendientes();
  }, [id]);

  useEffect(() => {
    const desuscribir = suscribirseASincronizacion(() => {
      cargar();
      revisarPendientes();
    });
    return desuscribir;
  }, [id]);

  useEffect(() => {
    if ((!guardia?.checkin_at && !checkinPendiente) || guardia?.checkout_at) return;
    const intervalo = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(intervalo);
  }, [guardia, checkinPendiente]);

  async function alHacerCheckin() {
    setError('');
    setAviso('');
    setHaciendoCheckin(true);
    try {
      const { lat, lng } = await obtenerUbicacion();
      const clienteUuid = nuevoId();
      try {
        const resultado = await api.checkin(id, { lat, lng, clienteUuid });
        if (!resultado.dentroDeRango) {
          setAviso(t.guardia_activa.fuera_de_rango);
        }
        cargar();
      } catch (e) {
        if (!esErrorDeRed(e)) throw e;
        // Sin señal: se guarda local y se reintenta solo al volver la conexión.
        await agregarACola({ id: clienteUuid, tipo: 'checkin', guardiaId: id, payload: { lat, lng, clienteUuid } });
        setCheckinPendiente({ desde: Date.now() });
        sincronizarCola();
      }
    } catch (e) {
      setError(e.message === 'sin_geo' ? t.guardia_activa.geo_no_disponible : t.comun.error_generico);
    } finally {
      setHaciendoCheckin(false);
    }
  }

  async function verReportesAnteriores() {
    if (mostrandoReportes) {
      setMostrandoReportes(false);
      return;
    }
    setMostrandoReportes(true);
    if (reportes === null) {
      try {
        const { reportes: data } = await api.reportesDelPaciente(guardia.paciente_id);
        setReportes(data);
      } catch {
        setReportes([]);
      }
    }
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!guardia) return <div className="estado-cargando">{t.comun.cargando}</div>;

  const paciente = guardia.pacientes;

  return (
    <div>
      <Link to="/guardias" className="btn btn-secondary" style={{ marginBottom: '1rem', fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
        <span aria-hidden="true">←</span> {t.comun.volver}
      </Link>
      <h1>{t.guardia_activa.paciente}: {paciente?.nombre}</h1>
      <p className="guardia-card-detalle">
        {t.guardia_activa.domicilio}: {paciente?.domicilio}
      </p>
      {paciente?.patologias && (
        <p className="guardia-card-detalle">
          {t.guardia_activa.patologias}: {paciente.patologias}
        </p>
      )}

      {aviso && <div className="alert alert-alerta">{aviso}</div>}

      {checkinPendiente && (
        <div className="alert alert-info" aria-label={t.comun.pendiente_de_enviar}>
          <span aria-hidden="true">⏳</span> {t.comun.pendiente_de_enviar}
        </div>
      )}

      {!guardia.checkin_at && !checkinPendiente && (
        <button className="btn btn-primary btn-full" onClick={alHacerCheckin} disabled={haciendoCheckin}>
          {haciendoCheckin ? t.guardia_activa.haciendo_checkin : t.guardia_activa.hacer_checkin}
        </button>
      )}

      {(guardia.checkin_at || checkinPendiente) && !guardia.checkout_at && (
        <>
          <div className="guardia-timer">{tiempoTranscurrido(guardia.checkin_at || checkinPendiente.desde)}</div>
          <p className="guardia-card-detalle" style={{ textAlign: 'center', marginTop: '-0.5rem' }}>
            {t.guardia_activa.tiempo_transcurrido}
          </p>
          <Link to={`/guardias/${id}/reporte`} className="btn btn-exito btn-full" style={{ marginTop: '1rem' }}>
            {t.guardia_activa.cargar_reporte}
          </Link>
        </>
      )}

      {guardia.checkout_at && <div className="alert alert-info">{t.guardias.estado_completada}</div>}

      <button className="btn btn-secondary btn-full" onClick={verReportesAnteriores} style={{ marginTop: '1rem' }}>
        {t.guardia_activa.ver_reportes_anteriores}
      </button>

      {mostrandoReportes && (
        <div style={{ marginTop: '1rem' }}>
          {reportes === null && <div className="estado-cargando">{t.comun.cargando}</div>}
          {reportes?.length === 0 && <div className="estado-vacio">{t.comun.vacio}</div>}
          {reportes?.map((r) => (
            <div key={r.id} className="guardia-card">
              <div className="guardia-card-detalle">{r.guardias?.fecha}</div>
              {r.observaciones && <p>{r.observaciones}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
