import { useMemo, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { EstadoLista } from '../components/layout/EstadoLista';
import { PostulacionDetalle } from './PostulacionDetalle';

const ESTADOS = ['pendiente', 'en_revision', 'aprobado', 'rechazado'];

export function Postulaciones() {
  const { t } = useLocale();
  const { filas, estado, error, recargar } = useSupabaseTable('postulaciones');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);

  const filasFiltradas = useMemo(() => {
    return filas.filter((p) => {
      const coincideBusqueda =
        !busqueda ||
        p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.telefono?.toLowerCase().includes(busqueda.toLowerCase());
      const coincideEstado = !filtroEstado || p.estado === filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  }, [filas, busqueda, filtroEstado]);

  return (
    <div>
      <h1>{t.postulaciones.titulo}</h1>

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
              {t.postulaciones[`estado_${e}`]}
            </option>
          ))}
        </select>
      </div>

      <EstadoLista estado={estado} error={error} vacio={estado === 'listo' && filasFiltradas.length === 0} recargar={recargar}>
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.postulaciones.col_nombre}</th>
              <th>{t.postulaciones.col_especialidades}</th>
              <th>{t.postulaciones.col_zonas}</th>
              <th>{t.postulaciones.col_fecha}</th>
              <th>{t.postulaciones.col_situacion_fiscal}</th>
              <th>{t.postulaciones.col_estado}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td>{p.especialidades}</td>
                <td>{p.zonas}</td>
                <td>{new Date(p.creado_en).toLocaleDateString()}</td>
                <td>{p.situacion_fiscal}</td>
                <td>
                  <span className={`badge badge-${p.estado}`}>{t.postulaciones[`estado_${p.estado}`]}</span>
                </td>
                <td>
                  <button onClick={() => setSeleccionada(p)}>{t.comun.ver_detalle}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>

      {seleccionada && (
        <PostulacionDetalle
          postulacion={seleccionada}
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
