import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLocale } from '../i18n/LocaleContext';

export default function Alertas() {
  const { id } = useParams();
  const { t } = useLocale();
  const [alertas, setAlertas] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    api
      .alertasDelPaciente(id)
      .then(({ alertas: data }) => {
        if (activo) setAlertas(data);
      })
      .catch(() => {
        if (activo) setError(t.comun.error_generico);
      });
    return () => {
      activo = false;
    };
  }, [id]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (alertas === null) return <div className="estado-cargando">{t.comun.cargando}</div>;
  if (alertas.length === 0) return <div className="estado-vacio">{t.alertas.sin_alertas}</div>;

  return (
    <div>
      <Link to={`/pacientes/${id}`} className="btn btn-secondary" style={{ marginBottom: '1rem', fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
        ← {t.comun.volver}
      </Link>
      <h1>{t.alertas.titulo}</h1>
      {alertas.map((a) => (
        <div key={a.id} className={`alert alerta-${a.nivel}`}>
          <div>
            <span className={`badge badge-${a.nivel}`}>{t.alertas[`nivel_${a.nivel}`] || a.nivel}</span>{' '}
            <span className="badge">{a.resuelta_at ? t.alertas.resuelta : t.alertas.activa}</span>
          </div>
          <p style={{ margin: '0.5rem 0' }}>{a.descripcion}</p>
          {a.reportes_relacionados?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {a.reportes_relacionados.map((reporteId) => (
                <Link key={reporteId} to={`/pacientes/${id}/reportes/${reporteId}`} style={{ fontSize: '0.85rem' }}>
                  {t.alertas.ver_reportes_relacionados}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
