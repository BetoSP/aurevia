import { useMemo, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { EstadoLista } from '../components/layout/EstadoLista';
import { PostulacionDetalle } from './PostulacionDetalle';
import { contieneCodigo, traducirCodigos } from '../lib/postulacionCodigos';

const ESTADOS = ['pendiente', 'en_revision', 'aprobado', 'rechazado'];

export function Postulaciones() {
  const { t } = useLocale();
  const { filas, estado, error, recargar } = useSupabaseTable('postulaciones');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [filtroZona, setFiltroZona] = useState('');
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);

  const filasFiltradas = useMemo(() => {
    return filas.filter((p) => {
      const coincideBusqueda =
        !busqueda ||
        p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.telefono?.toLowerCase().includes(busqueda.toLowerCase());
      const coincideEstado = !filtroEstado || p.estado === filtroEstado;
      return (
        coincideBusqueda &&
        coincideEstado &&
        contieneCodigo(p.especialidades, filtroEspecialidad) &&
        contieneCodigo(p.zonas, filtroZona) &&
        contieneCodigo(p.disponibilidad, filtroDisponibilidad)
      );
    });
  }, [filas, busqueda, filtroEstado, filtroEspecialidad, filtroZona, filtroDisponibilidad]);

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
        <select value={filtroEspecialidad} onChange={(e) => setFiltroEspecialidad(e.target.value)}>
          <option value="">{t.postulaciones.filtro_especialidad}</option>
          {Object.entries(t.postulaciones.especialidades_labels).map(([codigo, label]) => (
            <option key={codigo} value={codigo}>{label}</option>
          ))}
        </select>
        <select value={filtroZona} onChange={(e) => setFiltroZona(e.target.value)}>
          <option value="">{t.postulaciones.filtro_zona}</option>
          {Object.entries(t.postulaciones.zonas_labels).map(([codigo, label]) => (
            <option key={codigo} value={codigo}>{label}</option>
          ))}
        </select>
        <select value={filtroDisponibilidad} onChange={(e) => setFiltroDisponibilidad(e.target.value)}>
          <option value="">{t.postulaciones.filtro_disponibilidad}</option>
          {Object.entries(t.postulaciones.disponibilidad_labels).map(([codigo, label]) => (
            <option key={codigo} value={codigo}>{label}</option>
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
                <td>{traducirCodigos(p.especialidades, t.postulaciones.especialidades_labels)}</td>
                <td>{traducirCodigos(p.zonas, t.postulaciones.zonas_labels)}</td>
                <td>{new Date(p.creado_en).toLocaleDateString()}</td>
                <td>{t.postulaciones.situacion_fiscal_labels[p.situacion_fiscal] ?? p.situacion_fiscal}</td>
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
