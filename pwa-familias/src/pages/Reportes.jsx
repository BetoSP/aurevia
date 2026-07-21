import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLocale } from '../i18n/LocaleContext';

export default function Reportes() {
  const { id } = useParams();
  const { t } = useLocale();
  const [reportes, setReportes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    api
      .reportesDelPaciente(id)
      .then(({ reportes: data }) => {
        if (activo) setReportes(data);
      })
      .catch(() => {
        if (activo) setError(t.comun.error_generico);
      });
    return () => {
      activo = false;
    };
  }, [id]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (reportes === null) return <div className="estado-cargando">{t.comun.cargando}</div>;

  return (
    <div>
      <Link to={`/pacientes/${id}`} className="btn btn-secondary" style={{ marginBottom: '1rem', fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
        ← {t.comun.volver}
      </Link>
      <h1>{t.reportes.titulo}</h1>
      {reportes.length === 0 ? (
        <div className="estado-vacio">{t.reportes.sin_reportes}</div>
      ) : (
        reportes.map((r) => (
          <Link key={r.id} to={`/pacientes/${id}/reportes/${r.id}`} className="guardia-card" style={{ display: 'block', textDecoration: 'none' }}>
            <div className="guardia-card-paciente">{r.guardias?.fecha}</div>
            <div className="guardia-card-detalle">{r.guardias?.asistentes?.nombre}</div>
          </Link>
        ))
      )}
    </div>
  );
}
