import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../lib/supabaseClient';
import { EstadoLista } from '../components/layout/EstadoLista';
import { Button } from '../components/ui/Button';
import { NuevaGuardiaModal } from './guardias/NuevaGuardiaModal';
import { GuardiaAcciones } from './guardias/GuardiaAcciones';

const ESTADOS = ['programada', 'activa', 'completada', 'cancelada', 'ausente'];
const HORAS_ALERTA_CHECKIN_SIN_CHECKOUT = 2;

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function sumarDias(fechaISO, dias) {
  const f = new Date(`${fechaISO}T00:00:00`);
  f.setDate(f.getDate() + dias);
  return f.toISOString().slice(0, 10);
}

export function Guardias() {
  const { t } = useLocale();
  const [filas, setFilas] = useState([]);
  const [estadoCarga, setEstadoCarga] = useState('cargando');
  const [error, setError] = useState(null);
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(sumarDias(hoyISO(), 14));
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [guardiaSeleccionada, setGuardiaSeleccionada] = useState(null);

  const recargar = useCallback(async () => {
    setEstadoCarga('cargando');
    setError(null);

    const [{ data: guardiasData, error: errorGuardias }, { data: asistentesData }, { data: pacientesData }] = await Promise.all([
      supabase
        .from('guardias')
        .select('*')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true }),
      supabase.from('asistentes').select('id, nombre'),
      supabase.from('pacientes').select('id, nombre'),
    ]);

    if (errorGuardias) {
      setError(errorGuardias.message);
      setEstadoCarga('error');
      return;
    }

    const asistentesPorId = Object.fromEntries((asistentesData ?? []).map((a) => [a.id, a.nombre]));
    const pacientesPorId = Object.fromEntries((pacientesData ?? []).map((p) => [p.id, p.nombre]));

    const filasConNombres = (guardiasData ?? []).map((g) => ({
      ...g,
      asistente_nombre: asistentesPorId[g.asistente_id] || '—',
      paciente_nombre: pacientesPorId[g.paciente_id] || '—',
    }));

    setFilas(filasConNombres);
    setEstadoCarga('listo');
  }, [desde, hasta]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const filasFiltradas = useMemo(() => {
    const b = busqueda.toLowerCase();
    return filas.filter((g) => {
      const coincideEstado = !filtroEstado || g.estado === filtroEstado;
      const coincideBusqueda =
        !b || g.asistente_nombre?.toLowerCase().includes(b) || g.paciente_nombre?.toLowerCase().includes(b);
      return coincideEstado && coincideBusqueda;
    });
  }, [filas, filtroEstado, busqueda]);

  const filasPorDia = useMemo(() => {
    const grupos = {};
    for (const g of filasFiltradas) {
      if (!grupos[g.fecha]) grupos[g.fecha] = [];
      grupos[g.fecha].push(g);
    }
    return Object.entries(grupos);
  }, [filasFiltradas]);

  function tieneAlertaCheckinSinCheckout(g) {
    if (g.estado !== 'activa' || !g.checkin_at || g.checkout_at) return false;
    const finProgramado = new Date(`${g.fecha}T${g.hora_fin}`);
    const limite = new Date(finProgramado.getTime() + HORAS_ALERTA_CHECKIN_SIN_CHECKOUT * 60 * 60 * 1000);
    return new Date() > limite;
  }

  function cerrarYRecargar() {
    setMostrarNueva(false);
    recargar();
  }

  return (
    <div>
      <h1>{t.guardias.titulo}</h1>

      <div className="panel-filtros">
        <FormFieldFecha label={t.guardias.filtro_desde} value={desde} onChange={setDesde} />
        <FormFieldFecha label={t.guardias.filtro_hasta} value={hasta} onChange={setHasta} />
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">{t.comun.todos}</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>{t.guardias[`estado_${e}`]}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder={t.guardias.buscar}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Button onClick={() => setMostrarNueva(true)}>{t.guardias.nueva}</Button>
      </div>

      <EstadoLista
        estado={estadoCarga}
        error={error}
        vacio={estadoCarga === 'listo' && filasFiltradas.length === 0}
        recargar={recargar}
        mensajeVacio={t.guardias.sin_guardias_rango}
      >
        {filasPorDia.map(([fecha, guardiasDelDia]) => (
          <div key={fecha}>
            <h3 className="panel-guardia-dia-titulo">{new Date(`${fecha}T00:00:00`).toLocaleDateString()}</h3>
            {guardiasDelDia.map((g) => (
              <div
                key={g.id}
                className={`panel-guardia-card guardia-${g.estado}`}
                onClick={() => setGuardiaSeleccionada(g)}
              >
                <div>
                  <strong>{g.hora_inicio} – {g.hora_fin}</strong> · {g.asistente_nombre} → {g.paciente_nombre}
                  <div>{g.modalidad}</div>
                  {tieneAlertaCheckinSinCheckout(g) && (
                    <div className="panel-guardia-alerta">{t.guardias.alerta_checkin_sin_checkout}</div>
                  )}
                </div>
                <span>{t.guardias[`estado_${g.estado}`]}</span>
              </div>
            ))}
          </div>
        ))}
      </EstadoLista>

      {mostrarNueva && <NuevaGuardiaModal onClose={() => setMostrarNueva(false)} onCreada={cerrarYRecargar} />}

      {guardiaSeleccionada && (
        <GuardiaAcciones
          guardia={guardiaSeleccionada}
          onClose={() => setGuardiaSeleccionada(null)}
          onActualizada={recargar}
        />
      )}
    </div>
  );
}

function FormFieldFecha({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      {label}
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
