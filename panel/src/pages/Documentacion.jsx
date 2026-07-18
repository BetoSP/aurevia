import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { EstadoLista } from '../components/layout/EstadoLista';

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function diasHasta(fechaISO) {
  const hoy = new Date(`${hoyISO()}T00:00:00`);
  const fecha = new Date(`${fechaISO}T00:00:00`);
  return Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
}

function estadoDocumento(fechaVencimiento, diasAviso) {
  const dias = diasHasta(fechaVencimiento);
  if (dias < 0) return 'vencido';
  if (dias <= diasAviso) return 'por_vencer';
  return 'vigente';
}

export function Documentacion() {
  const { t } = useLocale();
  const { usuario } = useAuth();
  const [filas, setFilas] = useState([]);
  const [diasAviso, setDiasAviso] = useState(30);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('vencido_o_por_vencer');

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);

    const [{ data: docsData, error: errorDocs }, { data: prestadoraData }] = await Promise.all([
      supabase
        .from('documentos_asistente')
        .select('id, fecha_vencimiento, tipos_documento_asistente(nombre, requiere_vencimiento), asistentes(nombre, estado)')
        .not('fecha_vencimiento', 'is', null),
      supabase.from('prestadoras').select('dias_aviso_vencimiento_documentos').eq('id', usuario.prestadora_id).single(),
    ]);

    if (errorDocs) {
      setError(errorDocs.message);
      setEstado('error');
      return;
    }

    const aviso = prestadoraData?.dias_aviso_vencimiento_documentos ?? 30;
    setDiasAviso(aviso);

    const filasConEstado = (docsData ?? [])
      .filter((d) => d.tipos_documento_asistente?.requiere_vencimiento && d.asistentes?.estado === 'activo')
      .map((d) => ({
        id: d.id,
        asistente_nombre: d.asistentes?.nombre || '—',
        tipo_nombre: d.tipos_documento_asistente?.nombre || '—',
        fecha_vencimiento: d.fecha_vencimiento,
        dias: diasHasta(d.fecha_vencimiento),
        estado_documento: estadoDocumento(d.fecha_vencimiento, aviso),
      }))
      .sort((a, b) => a.dias - b.dias);

    setFilas(filasConEstado);
    setEstado('listo');
  }, [usuario.prestadora_id]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const filasFiltradas = useMemo(() => {
    if (filtro === 'todos') return filas;
    if (filtro === 'vencido_o_por_vencer') return filas.filter((f) => f.estado_documento !== 'vigente');
    return filas.filter((f) => f.estado_documento === filtro);
  }, [filas, filtro]);

  return (
    <div>
      <h1>{t.documentacion.titulo}</h1>
      <p className="panel-explicacion">{t.documentacion.explicacion}</p>

      <div className="panel-filtros">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="vencido_o_por_vencer">{t.documentacion.filtro_vencido_o_por_vencer}</option>
          <option value="vencido">{t.documentacion.estado_vencido}</option>
          <option value="por_vencer">{t.documentacion.estado_por_vencer}</option>
          <option value="todos">{t.comun.todos}</option>
        </select>
      </div>

      <EstadoLista estado={estado} error={error} vacio={estado === 'listo' && filasFiltradas.length === 0} recargar={recargar}>
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.documentacion.col_asistente}</th>
              <th>{t.documentacion.col_documento}</th>
              <th>{t.documentacion.col_vencimiento}</th>
              <th>{t.documentacion.col_estado}</th>
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.map((f) => (
              <tr key={f.id}>
                <td>{f.asistente_nombre}</td>
                <td>{f.tipo_nombre}</td>
                <td>{f.fecha_vencimiento}</td>
                <td><span className={`badge badge-${f.estado_documento}`}>{t.documentacion[`estado_${f.estado_documento}`]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>
    </div>
  );
}
