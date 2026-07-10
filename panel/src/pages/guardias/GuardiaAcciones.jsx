import { useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { supabase } from '../../lib/supabaseClient';
import { obtenerUbicacion } from '../../lib/ubicacion';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Alert } from '../../components/ui/Alert';

export function GuardiaAcciones({ guardia, onClose, onActualizada }) {
  const { t } = useLocale();
  const [medioTransporte, setMedioTransporte] = useState('');
  const [cancelacionOrigen, setCancelacionOrigen] = useState('');
  const [cancelacionAlcance, setCancelacionAlcance] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);

  async function actualizar(cambios) {
    setError(null);
    setProcesando(true);
    const { error: errorUpdate } = await supabase.from('guardias').update(cambios).eq('id', guardia.id);
    setProcesando(false);
    if (errorUpdate) {
      setError(errorUpdate.message);
      return;
    }
    onActualizada();
    onClose();
  }

  async function handleRegistrarSalida() {
    const { lat, lng } = await obtenerUbicacion();
    actualizar({ salida_checkin_at: new Date().toISOString(), salida_lat: lat, salida_lng: lng, medio_transporte: medioTransporte });
  }

  async function handleRegistrarLlegada() {
    const { lat, lng } = await obtenerUbicacion();
    actualizar({ checkin_at: new Date().toISOString(), checkin_lat: lat, checkin_lng: lng, estado: 'activa' });
  }

  async function handleRegistrarCheckout() {
    const { lat, lng } = await obtenerUbicacion();
    actualizar({ checkout_at: new Date().toISOString(), checkout_lat: lat, checkout_lng: lng, estado: 'completada' });
  }

  function handleCancelar() {
    if (!window.confirm(t.guardias.detalle.confirmar_cancelar)) return;
    actualizar({ estado: 'cancelada', cancelacion_origen: cancelacionOrigen, cancelacion_alcance: cancelacionAlcance });
  }

  function handleMarcarAusente() {
    if (!window.confirm(t.guardias.detalle.confirmar_ausente)) return;
    actualizar({ estado: 'ausente' });
  }

  const puedeRegistrarSalida = guardia.estado === 'programada' && !guardia.salida_checkin_at;
  const puedeRegistrarLlegada = guardia.estado === 'programada' && !guardia.checkin_at;
  const muestraCheckout = guardia.estado === 'activa' && !guardia.checkout_at;
  const puedeCancelar = guardia.estado === 'programada' || guardia.estado === 'activa';
  const puedeMarcarAusente = guardia.estado === 'programada';

  return (
    <div className="panel-modal-fondo" onClick={onClose}>
      <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t.guardias.detalle.titulo}</h2>

        {error && <Alert variant="error">{error}</Alert>}

        <dl className="panel-detalle-lista">
          <dt>{t.guardias.detalle.fecha}</dt>
          <dd>{guardia.fecha}</dd>
          <dt>{t.guardias.detalle.horario}</dt>
          <dd>{guardia.hora_inicio} – {guardia.hora_fin}</dd>
          <dt>{t.guardias.detalle.asistente}</dt>
          <dd>{guardia.asistente_nombre}</dd>
          <dt>{t.guardias.detalle.paciente}</dt>
          <dd>{guardia.paciente_nombre}</dd>
          <dt>{t.guardias.detalle.modalidad}</dt>
          <dd>{guardia.modalidad}</dd>
          <dt>{t.guardias.detalle.estado}</dt>
          <dd>{t.guardias[`estado_${guardia.estado}`]}</dd>
        </dl>

        {puedeRegistrarSalida && (
          <div className="panel-resultado-calculo">
            <h3>{t.guardias.detalle.checkpoint_salida}</h3>
            <FormField
              label={t.guardias.detalle.medio_transporte}
              name="medio_transporte"
              placeholder={t.guardias.detalle.medio_transporte_placeholder}
              value={medioTransporte}
              onChange={(e) => setMedioTransporte(e.target.value)}
            />
            <Button variant="secondary" onClick={handleRegistrarSalida} disabled={procesando}>
              {t.guardias.detalle.registrar_salida}
            </Button>
          </div>
        )}

        {puedeRegistrarLlegada && (
          <div className="panel-resultado-calculo">
            <h3>{t.guardias.detalle.checkin_llegada}</h3>
            <Button variant="secondary" onClick={handleRegistrarLlegada} disabled={procesando}>
              {t.guardias.detalle.registrar_llegada}
            </Button>
          </div>
        )}

        {muestraCheckout && (
          <div className="panel-resultado-calculo">
            <h3>{t.guardias.detalle.checkout}</h3>
            {guardia.checkout_bloqueado ? (
              <Alert variant="error">{t.guardias.detalle.checkout_bloqueado_explicacion}</Alert>
            ) : (
              <Button variant="secondary" onClick={handleRegistrarCheckout} disabled={procesando}>
                {t.guardias.detalle.registrar_checkout}
              </Button>
            )}
          </div>
        )}

        {puedeCancelar && (
          <div className="panel-resultado-calculo">
            <h3>{t.guardias.detalle.cancelar_guardia}</h3>
            <FormField
              label={t.guardias.detalle.cancelacion_origen}
              name="cancelacion_origen"
              type="select"
              value={cancelacionOrigen}
              onChange={(e) => setCancelacionOrigen(e.target.value)}
            >
              <option value="">{t.guardias.nueva_guardia.elegir}</option>
              <option value="familia">{t.guardias.detalle.cancelacion_origen_familia}</option>
              <option value="prestadora">{t.guardias.detalle.cancelacion_origen_prestadora}</option>
            </FormField>
            <FormField
              label={t.guardias.detalle.cancelacion_alcance}
              name="cancelacion_alcance"
              type="select"
              value={cancelacionAlcance}
              onChange={(e) => setCancelacionAlcance(e.target.value)}
            >
              <option value="">{t.guardias.nueva_guardia.elegir}</option>
              <option value="parcial">{t.guardias.detalle.cancelacion_alcance_parcial}</option>
              <option value="total">{t.guardias.detalle.cancelacion_alcance_total}</option>
            </FormField>
            <Button
              variant="secondary"
              onClick={handleCancelar}
              disabled={procesando || !cancelacionOrigen || !cancelacionAlcance}
            >
              {t.guardias.detalle.cancelar_guardia}
            </Button>
          </div>
        )}

        {puedeMarcarAusente && (
          <div className="panel-resultado-calculo">
            <Button variant="secondary" onClick={handleMarcarAusente} disabled={procesando}>
              {t.guardias.detalle.marcar_ausente}
            </Button>
          </div>
        )}

        <div className="panel-modal-acciones">
          <Button variant="secondary" onClick={onClose} disabled={procesando}>
            {t.comun.cerrar}
          </Button>
        </div>
      </div>
    </div>
  );
}
