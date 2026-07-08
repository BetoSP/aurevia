import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Alert } from '../components/ui/Alert';

const ESTADOS = ['pendiente', 'en_revision', 'aprobado', 'rechazado'];
const API_URL = import.meta.env.VITE_API_URL;

export function PostulacionDetalle({ postulacion, onClose, onActualizada }) {
  const { t } = useLocale();
  const [nuevoEstado, setNuevoEstado] = useState(postulacion.estado);
  const [nota, setNota] = useState(postulacion.nota_interna || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  async function handleGuardar() {
    if (nuevoEstado !== postulacion.estado) {
      const confirmado = window.confirm(t.postulaciones.confirmar_cambio_estado);
      if (!confirmado) return;
    }

    setGuardando(true);
    setError(null);

    const { error: errorUpdate } = await supabase
      .from('postulaciones')
      .update({ estado: nuevoEstado, nota_interna: nota })
      .eq('id', postulacion.id);

    if (errorUpdate) {
      setError(t.comun.error_generico);
      setGuardando(false);
      return;
    }

    if (nuevoEstado !== postulacion.estado && nuevoEstado !== 'pendiente') {
      try {
        const { data } = await supabase.auth.getSession();
        await fetch(`${API_URL}/api/panel/notificar/postulante`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session?.access_token}`,
          },
          body: JSON.stringify({
            email: postulacion.email,
            nombre: postulacion.nombre,
            nuevoEstado,
          }),
        });
      } catch {
        // el cambio de estado ya se guardó; el email es best-effort
      }
    }

    setGuardando(false);
    onActualizada();
  }

  return (
    <div className="panel-modal-fondo" onClick={onClose}>
      <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{postulacion.nombre}</h2>

        {error && <Alert variant="error">{error}</Alert>}

        <dl className="panel-detalle-lista">
          <dt>{t.postulaciones.telefono}</dt>
          <dd>{postulacion.telefono}</dd>
          <dt>{t.postulaciones.email}</dt>
          <dd>{postulacion.email}</dd>
          <dt>{t.postulaciones.col_especialidades}</dt>
          <dd>{postulacion.especialidades}</dd>
          <dt>{t.postulaciones.col_zonas}</dt>
          <dd>{postulacion.zonas}</dd>
          <dt>{t.postulaciones.disponibilidad}</dt>
          <dd>{postulacion.disponibilidad}</dd>
          <dt>{t.postulaciones.anios_experiencia}</dt>
          <dd>{postulacion.anios_experiencia || '—'}</dd>
          <dt>{t.postulaciones.col_situacion_fiscal}</dt>
          <dd>{postulacion.situacion_fiscal}</dd>
          <dt>{t.postulaciones.como_conocio}</dt>
          <dd>{postulacion.como_conocio || '—'}</dd>
          <dt>{t.postulaciones.mensaje}</dt>
          <dd>{postulacion.mensaje || '—'}</dd>
        </dl>

        <FormField label={t.postulaciones.col_estado} name="estado" type="select" value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)}>
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {t.postulaciones[`estado_${estado}`]}
            </option>
          ))}
        </FormField>

        <FormField
          label={t.comun.nota_interna}
          name="nota"
          type="textarea"
          placeholder={t.comun.nota_interna_placeholder}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />

        <div className="panel-modal-acciones">
          <Button variant="secondary" onClick={onClose} disabled={guardando}>
            {t.comun.cancelar}
          </Button>
          <Button onClick={handleGuardar} disabled={guardando}>
            {guardando ? t.comun.guardando : t.comun.guardar}
          </Button>
        </div>
      </div>
    </div>
  );
}
