import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../lib/supabaseClient';
import { distanciaKm } from '../lib/distancia';
import { EstadoLista } from '../components/layout/EstadoLista';

// Umbral de cercanía para considerar un check-in/check-out "verificado" contra el
// domicilio registrado del Paciente — mismo criterio de constante local ya usado en
// Guardias.jsx (HORAS_ALERTA_CHECKIN_SIN_CHECKOUT), no es un valor legal/económico
// (CLAUDE.md §3/§7.10) sino un umbral técnico de tolerancia GPS.
const RADIO_VERIFICACION_KM = 0.3;

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function sumarDias(fechaISO, dias) {
  const f = new Date(`${fechaISO}T00:00:00`);
  f.setDate(f.getDate() + dias);
  return f.toISOString().slice(0, 10);
}

function estadoVerificacion(punto, paciente) {
  if (!punto?.lat || !punto?.lng) return 'sin_datos';
  if (!paciente?.lat || !paciente?.lng) return 'sin_domicilio';
  const distancia = distanciaKm(punto.lat, punto.lng, paciente.lat, paciente.lng);
  return distancia <= RADIO_VERIFICACION_KM ? 'verificado' : 'fuera_de_rango';
}

export function Evv() {
  const { t } = useLocale();
  const [filas, setFilas] = useState([]);
  const [estadoCarga, setEstadoCarga] = useState('cargando');
  const [error, setError] = useState(null);
  const [desde, setDesde] = useState(sumarDias(hoyISO(), -7));
  const [hasta, setHasta] = useState(hoyISO());
  const [filtro, setFiltro] = useState('');

  const recargar = useCallback(async () => {
    setEstadoCarga('cargando');
    setError(null);

    const [{ data: guardiasData, error: errorGuardias }, { data: asistentesData }, { data: pacientesData }] = await Promise.all([
      supabase
        .from('guardias')
        .select('id, fecha, hora_inicio, hora_fin, estado, asistente_id, paciente_id, checkin_at, checkin_lat, checkin_lng, checkout_at, checkout_lat, checkout_lng')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .in('estado', ['activa', 'completada'])
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: true }),
      supabase.from('asistentes').select('id, nombre'),
      supabase.from('pacientes').select('id, nombre, lat, lng'),
    ]);

    if (errorGuardias) {
      setError(errorGuardias.message);
      setEstadoCarga('error');
      return;
    }

    const asistentesPorId = Object.fromEntries((asistentesData ?? []).map((a) => [a.id, a.nombre]));
    const pacientesPorId = Object.fromEntries((pacientesData ?? []).map((p) => [p.id, p]));

    const filasConEstado = (guardiasData ?? []).map((g) => {
      const paciente = pacientesPorId[g.paciente_id];
      return {
        ...g,
        asistente_nombre: asistentesPorId[g.asistente_id] || '—',
        paciente_nombre: paciente?.nombre || '—',
        estado_checkin: estadoVerificacion({ lat: g.checkin_lat, lng: g.checkin_lng }, paciente),
        estado_checkout: estadoVerificacion({ lat: g.checkout_lat, lng: g.checkout_lng }, paciente),
      };
    });

    setFilas(filasConEstado);
    setEstadoCarga('listo');
  }, [desde, hasta]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const filasFiltradas = useMemo(() => {
    if (!filtro) return filas;
    return filas.filter((g) => g.estado_checkin === filtro || g.estado_checkout === filtro);
  }, [filas, filtro]);

  return (
    <div>
      <h1>{t.evv.titulo}</h1>
      <p className="panel-explicacion">{t.evv.explicacion}</p>

      <div className="panel-filtros">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {t.guardias.filtro_desde}
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {t.guardias.filtro_hasta}
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">{t.comun.todos}</option>
          <option value="verificado">{t.evv.estado_verificado}</option>
          <option value="fuera_de_rango">{t.evv.estado_fuera_de_rango}</option>
          <option value="sin_datos">{t.evv.estado_sin_datos}</option>
          <option value="sin_domicilio">{t.evv.estado_sin_domicilio}</option>
        </select>
      </div>

      <EstadoLista
        estado={estadoCarga}
        error={error}
        vacio={estadoCarga === 'listo' && filasFiltradas.length === 0}
        recargar={recargar}
      >
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.evv.col_fecha}</th>
              <th>{t.evv.col_asistente}</th>
              <th>{t.evv.col_paciente}</th>
              <th>{t.evv.col_checkin}</th>
              <th>{t.evv.col_checkout}</th>
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.map((g) => (
              <tr key={g.id}>
                <td>{g.fecha} · {g.hora_inicio}–{g.hora_fin}</td>
                <td>{g.asistente_nombre}</td>
                <td>{g.paciente_nombre}</td>
                <td>
                  {g.checkin_at ? (
                    <span className={`badge badge-evv-${g.estado_checkin}`}>{t.evv[`estado_${g.estado_checkin}`]}</span>
                  ) : (
                    <span className="badge">{t.evv.sin_checkin}</span>
                  )}
                </td>
                <td>
                  {g.checkout_at ? (
                    <span className={`badge badge-evv-${g.estado_checkout}`}>{t.evv[`estado_${g.estado_checkout}`]}</span>
                  ) : (
                    <span className="badge">{t.evv.sin_checkout}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>
    </div>
  );
}
