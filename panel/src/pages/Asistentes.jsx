import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleContext';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { EstadoLista } from '../components/layout/EstadoLista';

const ESTADOS = ['activo', 'inactivo', 'cesado'];

export function Asistentes() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { filas, estado, error, recargar } = useSupabaseTable('asistentes', { orderBy: 'created_at' });
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const filasFiltradas = useMemo(() => {
    return filas.filter((a) => {
      const coincideBusqueda =
        !busqueda ||
        a.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.email?.toLowerCase().includes(busqueda.toLowerCase());
      const coincideEstado = !filtroEstado || a.estado === filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  }, [filas, busqueda, filtroEstado]);

  return (
    <div>
      <h1>{t.asistentes.titulo}</h1>

      <div className="panel-filtros">
        <input
          type="text"
          placeholder={t.asistentes.buscar}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">{t.comun.todos}</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {t.asistentes[`estado_${e}`]}
            </option>
          ))}
        </select>
      </div>

      <EstadoLista estado={estado} error={error} vacio={estado === 'listo' && filasFiltradas.length === 0} recargar={recargar}>
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.asistentes.col_nombre}</th>
              <th>{t.asistentes.col_especialidades}</th>
              <th>{t.asistentes.col_zonas}</th>
              <th>{t.asistentes.col_vinculo}</th>
              <th>{t.asistentes.col_estado}</th>
              <th>{t.asistentes.col_score_riesgo}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.map((a) => (
              <tr key={a.id}>
                <td>{a.nombre}</td>
                <td>{(a.especialidades || []).join(', ')}</td>
                <td>{(a.zonas || []).join(', ')}</td>
                <td>{t.asistentes[`vinculo_${a.tipo_vinculo}`]}</td>
                <td>
                  <span className={`badge badge-${a.estado === 'activo' ? 'aprobado' : a.estado === 'cesado' ? 'rechazado' : ''}`}>
                    {t.asistentes[`estado_${a.estado}`]}
                  </span>
                </td>
                <td>{a.score_riesgo_reclasificacion}</td>
                <td>
                  <button onClick={() => navigate(`/asistentes/${a.id}`)}>{t.comun.ver_detalle}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>
    </div>
  );
}
