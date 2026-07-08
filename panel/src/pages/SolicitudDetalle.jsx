import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Alert } from '../components/ui/Alert';

const ESTADOS = ['nueva', 'en_gestion', 'asignada', 'cancelada', 'completada'];

export function SolicitudDetalle({ solicitud, onClose, onActualizada }) {
  const { t } = useLocale();
  const [nuevoEstado, setNuevoEstado] = useState(solicitud.estado || 'nueva');
  const [nota, setNota] = useState(solicitud.nota_interna || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  async function handleGuardar() {
    if (nuevoEstado !== (solicitud.estado || 'nueva') && nuevoEstado === 'cancelada') {
      const confirmado = window.confirm(t.solicitudes.confirmar_cambio_estado);
      if (!confirmado) return;
    }

    setGuardando(true);
    setError(null);

    const { error: errorUpdate } = await supabase
      .from('solicitudes')
      .update({ estado: nuevoEstado, nota_interna: nota })
      .eq('id', solicitud.id);

    if (errorUpdate) {
      setError(t.comun.error_generico);
      setGuardando(false);
      return;
    }

    setGuardando(false);
    onActualizada();
  }

  return (
    <div className="panel-modal-fondo" onClick={onClose}>
      <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{solicitud.nombre}</h2>

        {error && <Alert variant="error">{error}</Alert>}

        <dl className="panel-detalle-lista">
          <dt>{t.solicitudes.col_telefono}</dt>
          <dd>
            <a href={`tel:${solicitud.telefono}`}>{solicitud.telefono}</a> ({t.solicitudes.llamar})
          </dd>
          <dt>{t.solicitudes.email}</dt>
          <dd>{solicitud.email}</dd>
          <dt>{t.solicitudes.nombre_paciente}</dt>
          <dd>{solicitud.nombre_paciente || '—'}</dd>
          <dt>{t.solicitudes.col_localidad}</dt>
          <dd>{solicitud.localidad}</dd>
          <dt>{t.solicitudes.col_tipo_servicio}</dt>
          <dd>{solicitud.tipo_servicio}</dd>
          <dt>{t.solicitudes.col_modalidad}</dt>
          <dd>{solicitud.modalidad}</dd>
          <dt>{t.solicitudes.dias_horario}</dt>
          <dd>{solicitud.dias_horario}</dd>
          <dt>{t.solicitudes.descripcion}</dt>
          <dd>{solicitud.descripcion || '—'}</dd>
        </dl>

        <FormField label={t.solicitudes.col_estado} name="estado" type="select" value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)}>
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {t.solicitudes[`estado_${estado}`]}
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
