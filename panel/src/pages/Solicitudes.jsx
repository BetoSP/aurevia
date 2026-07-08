import { useMemo, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { EstadoLista } from '../components/layout/EstadoLista';
import { SolicitudDetalle } from './SolicitudDetalle';

const ESTADOS = ['nueva', 'en_gestion', 'asignada', 'cancelada', 'completada'];

export function Solicitudes() {
  const { t } = useLocale();
  const { filas, estado, error, recargar } = useSupabaseTable('solicitudes', { orderBy: 'creado_en', ascending: false });
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);

  const filasFiltradas = useMemo(() => {
    return filas.filter((s) => {
      const coincideBusqueda =
        !busqueda ||
        s.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.telefono?.toLowerCase().includes(busqueda.toLowerCase());
      const coincideEstado = !filtroEstado || (s.estado || 'nueva') === filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  }, [filas, busqueda, filtroEstado]);

  return (
    <div>
      <h1>{t.solicitudes.titulo}</h1>

      <div className="panel-filtros">
        <input
          type="text"
          placeholder={t.comun.buscar}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">{t.comun.todos}</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {t.solicitudes[`estado_${e}`]}
            </option>
          ))}
        </select>
      </div>

      <EstadoLista estado={estado} error={error} vacio={estado === 'listo' && filasFiltradas.length === 0} recargar={recargar}>
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.solicitudes.col_nombre}</th>
              <th>{t.solicitudes.col_telefono}</th>
              <th>{t.solicitudes.col_localidad}</th>
              <th>{t.solicitudes.col_tipo_servicio}</th>
              <th>{t.solicitudes.col_modalidad}</th>
              <th>{t.solicitudes.col_fecha}</th>
              <th>{t.solicitudes.col_estado}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.map((s) => (
              <tr key={s.id}>
                <td>{s.nombre}</td>
                <td>
                  <a href={`tel:${s.telefono}`}>{s.telefono}</a>
                </td>
                <td>{s.localidad}</td>
                <td>{s.tipo_servicio}</td>
                <td>{s.modalidad}</td>
                <td>{new Date(s.creado_en).toLocaleDateString()}</td>
                <td>
                  <span className={`badge badge-${s.estado || 'nueva'}`}>
                    {t.solicitudes[`estado_${s.estado || 'nueva'}`]}
                  </span>
                </td>
                <td>
                  <button onClick={() => setSeleccionada(s)}>{t.comun.ver_detalle}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>

      {seleccionada && (
        <SolicitudDetalle
          solicitud={seleccionada}
          onClose={() => setSeleccionada(null)}
          onActualizada={() => {
            setSeleccionada(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}
