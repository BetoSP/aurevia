import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useLocale } from '../i18n/LocaleContext';

export default function MisPacientes() {
  const { t } = useLocale();
  const [pacientes, setPacientes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    api
      .misPacientes()
      .then(({ pacientes: data }) => {
        if (activo) setPacientes(data);
      })
      .catch(() => {
        if (activo) setError(t.comun.error_generico);
      });
    return () => {
      activo = false;
    };
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (pacientes === null) return <div className="estado-cargando">{t.comun.cargando}</div>;
  if (pacientes.length === 0) return <div className="estado-vacio">{t.pacientes.sin_pacientes}</div>;
  if (pacientes.length === 1) return <Navigate to={`/pacientes/${pacientes[0].id}`} replace />;

  return (
    <div>
      <h1>{t.pacientes.titulo}</h1>
      {pacientes.map((p) => (
        <Link key={p.id} to={`/pacientes/${p.id}`} className="guardia-card" style={{ display: 'block', textDecoration: 'none' }}>
          <div className="guardia-card-paciente">{p.nombre}</div>
          <div className="guardia-card-detalle">{p.domicilio || '—'}</div>
        </Link>
      ))}
    </div>
  );
}
