import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLocale } from '../i18n/LocaleContext';

const CAMPOS_TEXTO = ['estado_animo', 'incidentes', 'observaciones'];

const CLAVES_SIGNOS_VITALES = ['presion', 'temperatura', 'saturacion', 'glucemia'];

export default function ReporteDetalle() {
  const { id, reporteId } = useParams();
  const { t } = useLocale();
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    api
      .reportesDelPaciente(id)
      .then(({ reportes }) => {
        if (!activo) return;
        const encontrado = reportes.find((r) => r.id === reporteId);
        setReporte(encontrado || false);
      })
      .catch(() => {
        if (activo) setError(t.comun.error_generico);
      });
    return () => {
      activo = false;
    };
  }, [id, reporteId]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (reporte === null) return <div className="estado-cargando">{t.comun.cargando}</div>;
  if (reporte === false) return <div className="estado-vacio">{t.comun.vacio}</div>;

  return (
    <div>
      <Link to={`/pacientes/${id}/reportes`} className="btn btn-secondary" style={{ marginBottom: '1rem', fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
        ← {t.comun.volver}
      </Link>
      <h1>{t.reporte_detalle.titulo}</h1>
      <p className="guardia-card-detalle">
        {reporte.guardias?.fecha} · {t.reporte_detalle.asistente}: {reporte.guardias?.asistentes?.nombre}
      </p>

      <div className="reporte-preview-campo">
        <label>{t.reporte_detalle.campo_alimentacion}</label>
        <div>{reporte.alimentacion?.descripcion || t.reporte_detalle.sin_datos}</div>
      </div>

      <div className="reporte-preview-campo">
        <label>{t.reporte_detalle.campo_medicacion}</label>
        {Array.isArray(reporte.medicacion) && reporte.medicacion.length > 0 ? (
          reporte.medicacion.map((m, i) => (
            <div key={i}>
              {[m.nombre, m.hora, m.via].filter(Boolean).join(' · ')}
            </div>
          ))
        ) : (
          <div>{t.reporte_detalle.sin_datos}</div>
        )}
      </div>

      <div className="reporte-preview-campo">
        <label>{t.reporte_detalle.campo_signos_vitales}</label>
        {reporte.signos_vitales && CLAVES_SIGNOS_VITALES.some((clave) => reporte.signos_vitales[clave]) ? (
          CLAVES_SIGNOS_VITALES.filter((clave) => reporte.signos_vitales[clave]).map((clave) => (
            <div key={clave}>
              {t.reporte_detalle[`signo_${clave}`]}: {reporte.signos_vitales[clave]}
            </div>
          ))
        ) : (
          <div>{t.reporte_detalle.sin_datos}</div>
        )}
      </div>

      {CAMPOS_TEXTO.map((campo) => (
        <div key={campo} className="reporte-preview-campo">
          <label>{t.reporte_detalle[`campo_${campo}`]}</label>
          <div>{reporte[campo] || t.reporte_detalle.sin_datos}</div>
        </div>
      ))}

      {reporte.foto_url && (
        <div className="reporte-preview-campo">
          <img src={reporte.foto_url} alt="" style={{ width: '100%', borderRadius: '12px' }} />
        </div>
      )}
    </div>
  );
}
