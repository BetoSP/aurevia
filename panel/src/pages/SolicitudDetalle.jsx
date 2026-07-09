import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { esAdminOSuperior } from '../lib/roles';
import { linkWhatsapp } from '../lib/telefono';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Alert } from '../components/ui/Alert';

const ESTADOS = ['nueva', 'en_gestion', 'asignada', 'cancelada', 'completada'];
const API_URL = import.meta.env.VITE_API_URL;

export function SolicitudDetalle({ solicitud, onClose, onActualizada }) {
  const { t } = useLocale();
  const { usuario } = useAuth();
  const [nuevoEstado, setNuevoEstado] = useState(solicitud.estado || 'nueva');
  const [nota, setNota] = useState(solicitud.nota_interna || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [errorConversion, setErrorConversion] = useState(null);

  async function handleConvertirEnFamilia() {
    const confirmado = window.confirm(t.solicitudes.confirmar_convertir_familia);
    if (!confirmado) return;

    setConvirtiendo(true);
    setErrorConversion(null);

    try {
      const { data } = await supabase.auth.getSession();
      const respuesta = await fetch(`${API_URL}/api/panel/cuentas/familia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token}`,
        },
        body: JSON.stringify({ solicitudId: solicitud.id }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || t.comun.error_generico);
      }
      onActualizada();
    } catch (err) {
      setErrorConversion(err.message);
    } finally {
      setConvirtiendo(false);
    }
  }

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
            <a href={linkWhatsapp(solicitud.telefono)} target="_blank" rel="noreferrer">{solicitud.telefono}</a> ({t.solicitudes.llamar})
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

        {esAdminOSuperior(usuario?.rol) && (
          <div className="panel-resultado-calculo">
            {solicitud.familia_id ? (
              <p>{t.solicitudes.ya_convertida_familia}</p>
            ) : (
              <>
                <p>{t.solicitudes.convertir_en_familia_explicacion}</p>
                {errorConversion && <Alert variant="error">{errorConversion}</Alert>}
                <Button variant="secondary" onClick={handleConvertirEnFamilia} disabled={convirtiendo}>
                  {convirtiendo ? t.comun.guardando : t.solicitudes.convertir_en_familia}
                </Button>
              </>
            )}
          </div>
        )}

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
