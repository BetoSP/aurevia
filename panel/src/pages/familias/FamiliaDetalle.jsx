import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocale } from '../../i18n/LocaleContext';
import { linkWhatsapp } from '../../lib/telefono';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { PrestacionesPaciente } from './PrestacionesPaciente';

export function FamiliaDetalle() {
  const { t } = useLocale();
  const { id } = useParams();
  const navigate = useNavigate();
  const [familia, setFamilia] = useState(null);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    const { data, error: errorConsulta } = await supabase
      .from('familias')
      .select('id, plan, created_at, solicitudes!familias_solicitud_id_fkey(nombre, telefono, email, localidad), pacientes(*)')
      .eq('id', id)
      .single();

    if (errorConsulta) {
      setError(errorConsulta.code === 'PGRST116' ? null : errorConsulta.message);
      setEstado(errorConsulta.code === 'PGRST116' ? 'no_encontrado' : 'error');
      return;
    }

    setFamilia(data);
    setEstado('listo');
  }, [id]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  if (estado === 'cargando') return <p className="estado-cargando">{t.comun.cargando}</p>;
  if (estado === 'no_encontrado') return <p className="estado-vacio">{t.comun.no_encontrado}</p>;
  if (estado === 'error') return <p className="estado-vacio">{error || t.comun.error_generico}</p>;

  return (
    <div>
      <button className="link-volver" onClick={() => navigate('/familias')}>← {t.familias.volver_a_familias}</button>
      <h1>{familia.solicitudes?.nombre || '—'}</h1>

      <h2>{t.familias.contacto}</h2>
      <dl className="panel-detalle-lista">
        <dt>{t.familias.col_telefono}</dt>
        <dd>
          {familia.solicitudes?.telefono ? (
            <a href={linkWhatsapp(familia.solicitudes.telefono)} target="_blank" rel="noreferrer">{familia.solicitudes.telefono}</a>
          ) : (
            '—'
          )}
        </dd>
        <dt>{t.familias.col_email}</dt>
        <dd>{familia.solicitudes?.email || '—'}</dd>
        <dt>{t.familias.col_localidad}</dt>
        <dd>{familia.solicitudes?.localidad || '—'}</dd>
        <dt>{t.familias.col_fecha_alta}</dt>
        <dd>{new Date(familia.created_at).toLocaleDateString()}</dd>
      </dl>

      <h2>{t.familias.pacientes}</h2>
      {familia.pacientes?.length ? (
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.familias.col_nombre}</th>
              <th>{t.familias.fecha_nacimiento}</th>
              <th>{t.familias.nivel_complejidad}</th>
              <th>{t.familias.domicilio}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {familia.pacientes.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td>{p.fecha_nacimiento || '—'}</td>
                <td>{p.nivel_complejidad || '—'}</td>
                <td>{p.domicilio || '—'}</td>
                <td>
                  <Button variant="secondary" onClick={() => setPacienteSeleccionado(p)}>
                    {t.prestaciones.titulo}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="estado-vacio">{t.familias.sin_pacientes}</p>
      )}

      <h2>{t.familias.guardias_activas}</h2>
      <p className="estado-vacio">{t.familias.modulo_no_disponible}</p>

      <h2>{t.familias.historial_reportes}</h2>
      <p className="estado-vacio">{t.familias.modulo_no_disponible}</p>

      <h2>{t.familias.alertas_activas}</h2>
      <p className="estado-vacio">{t.familias.modulo_no_disponible}</p>

      {pacienteSeleccionado && (
        <PrestacionesPaciente paciente={pacienteSeleccionado} onClose={() => setPacienteSeleccionado(null)} />
      )}
    </div>
  );
}
