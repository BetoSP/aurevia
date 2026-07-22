import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLocale } from '../i18n/LocaleContext';

export default function AsistenteAsignado() {
  const { id } = useParams();
  const { t } = useLocale();
  const [datos, setDatos] = useState(null);
  const [rolCirculo, setRolCirculo] = useState(null);
  const [error, setError] = useState('');
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    let activo = true;
    api
      .asistenteDelPaciente(id)
      .then((data) => {
        if (activo) setDatos(data);
      })
      .catch(() => {
        if (activo) setError(t.comun.error_generico);
      });
    api
      .perfil()
      .then(({ perfil }) => {
        if (activo) setRolCirculo(perfil.rolCirculo);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [id]);

  async function enviarCalificacion() {
    if (estrellas < 1) return;
    setEnviando(true);
    setError('');
    try {
      await api.calificar(datos.guardiaId, { estrellas, comentario: comentario || null });
      setEnviado(true);
    } catch {
      setError(t.comun.error_generico);
    } finally {
      setEnviando(false);
    }
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (datos === null) return <div className="estado-cargando">{t.comun.cargando}</div>;
  if (!datos.asistente) return <div className="estado-vacio">{t.comun.vacio}</div>;

  const { asistente, certificado, evaluaciones, guardiaId } = datos;

  return (
    <div>
      <Link to={`/pacientes/${id}`} className="btn btn-secondary" style={{ marginBottom: '1rem', fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
        <span aria-hidden="true">←</span> {t.comun.volver}
      </Link>
      <h1>{asistente.nombre}</h1>
      {asistente.foto_url && <img src={asistente.foto_url} alt={asistente.nombre} style={{ width: '100%', maxWidth: 200, borderRadius: '12px', marginBottom: '1rem' }} />}
      <p className="guardia-card-detalle">
        {t.asistente.especialidades}: {(asistente.especialidades || []).join(', ') || '—'}
      </p>
      <p className="guardia-card-detalle">
        {certificado ? t.asistente.certificado_vigente : t.asistente.certificado_vencido}
      </p>

      <Link to={`/pacientes/${id}/escanear-asistente`} className="btn btn-primary btn-full" style={{ marginTop: '1rem' }}>
        {t.asistente.escanear_boton}
      </Link>

      <h2 style={{ marginTop: '1.5rem' }}>{t.asistente.evaluaciones_titulo}</h2>
      {evaluaciones.length === 0 ? (
        <div className="estado-vacio">{t.asistente.sin_evaluaciones}</div>
      ) : (
        evaluaciones.map((e) => (
          <div key={e.id} className="guardia-card">
            <div className="guardia-card-paciente">{'★'.repeat(e.estrellas)}{'☆'.repeat(5 - e.estrellas)}</div>
            {e.comentario && <div className="guardia-card-detalle">{e.comentario}</div>}
          </div>
        ))
      )}

      {guardiaId && !enviado && rolCirculo === 'solo_lectura' && (
        <div style={{ marginTop: '1.5rem' }} className="alert">
          {t.asistente.calificar_solo_lectura}
        </div>
      )}
      {guardiaId && !enviado && rolCirculo !== 'solo_lectura' && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2>{t.asistente.calificar_titulo}</h2>
          <div className="estrellas">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={n <= estrellas ? 'activa' : ''} onClick={() => setEstrellas(n)}>
                ★
              </button>
            ))}
          </div>
          <div className="form-field">
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder={t.asistente.comentario_placeholder}
            />
          </div>
          <button className="btn btn-primary btn-full" disabled={enviando || estrellas < 1} onClick={enviarCalificacion}>
            {enviando ? t.asistente.enviando_calificacion : t.asistente.enviar_calificacion}
          </button>
        </div>
      )}
      {enviado && <div className="alert alert-info">{t.asistente.calificacion_enviada}</div>}
    </div>
  );
}
