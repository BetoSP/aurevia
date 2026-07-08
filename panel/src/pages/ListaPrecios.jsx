import { useMemo, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { esAdminOSuperior } from '../lib/roles';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { EstadoLista } from '../components/layout/EstadoLista';
import { Button } from '../components/ui/Button';
import { ListaPrecioDetalle } from './ListaPrecioDetalle';

export function ListaPrecios() {
  const { t } = useLocale();
  const { usuario } = useAuth();
  const { filas, estado, error, recargar } = useSupabaseTable('lista_precios', { orderBy: 'created_at' });
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);

  const esAdmin = esAdminOSuperior(usuario?.rol);

  const filasFiltradas = useMemo(() => {
    return filas.filter((p) => {
      if (!busqueda) return true;
      const b = busqueda.toLowerCase();
      return p.tipo_servicio?.toLowerCase().includes(b) || p.modalidad?.toLowerCase().includes(b);
    });
  }, [filas, busqueda]);

  return (
    <div>
      <h1>{t.lista_precios.titulo}</h1>
      <p className="panel-explicacion">{t.lista_precios.explicacion}</p>

      <div className="panel-filtros">
        <input
          type="text"
          placeholder={t.lista_precios.buscar}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {esAdmin && <Button onClick={() => setCreandoNuevo(true)}>{t.lista_precios.nuevo}</Button>}
      </div>

      <EstadoLista estado={estado} error={error} vacio={estado === 'listo' && filasFiltradas.length === 0} recargar={recargar}>
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.lista_precios.col_tipo_servicio}</th>
              <th>{t.lista_precios.col_modalidad}</th>
              <th>{t.lista_precios.col_precio}</th>
              <th>{t.lista_precios.col_vigente_desde}</th>
              <th>{t.lista_precios.col_activo}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.map((p) => (
              <tr key={p.id}>
                <td>{p.tipo_servicio}</td>
                <td>{p.modalidad}</td>
                <td>{p.precio}</td>
                <td>{new Date(p.vigente_desde).toLocaleDateString()}</td>
                <td>
                  <span className={`badge badge-${p.activo ? 'aprobado' : 'rechazado'}`}>
                    {p.activo ? t.lista_precios.activo_si : t.lista_precios.activo_no}
                  </span>
                </td>
                <td>
                  <button onClick={() => setSeleccionado(p)}>
                    {esAdmin ? t.comun.editar : t.comun.ver_detalle}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>

      {(seleccionado || creandoNuevo) && (
        <ListaPrecioDetalle
          precio={seleccionado}
          soloLectura={!esAdmin}
          onClose={() => {
            setSeleccionado(null);
            setCreandoNuevo(false);
          }}
          onActualizada={() => {
            setSeleccionado(null);
            setCreandoNuevo(false);
            recargar();
          }}
        />
      )}
    </div>
  );
}
