import { useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { esAdminOSuperior } from '../../lib/roles';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Alert } from '../../components/ui/Alert';
import { generarCertificadoTrabajo, generarCertificadoRemuneracionesServicios, descargarPDF } from '../../lib/generarDocumentoCese';

export function PerfilTab({ asistente, onActualizado }) {
  const { t } = useLocale();
  const { usuario } = useAuth();
  const esAdmin = esAdminOSuperior(usuario?.rol);
  const [form, setForm] = useState({
    especialidades: (asistente.especialidades || []).join(', '),
    zonas: (asistente.zonas || []).join(', '),
    estado: asistente.estado,
    tipo_vinculo: asistente.tipo_vinculo,
    categoria_cct: asistente.categoria_cct || '',
    valor_hora: asistente.valor_hora || '',
    sueldo_basico: asistente.sueldo_basico || '',
    horas_semanales: asistente.horas_semanales || '',
    vencimiento_monotributo: asistente.vencimiento_monotributo || '',
    vencimiento_art: asistente.vencimiento_art || '',
    vencimiento_seguro: asistente.vencimiento_seguro || '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [guardado, setGuardado] = useState(false);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setGuardado(false);
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    const payload = {
      especialidades: form.especialidades.split(',').map((s) => s.trim()).filter(Boolean),
      zonas: form.zonas.split(',').map((s) => s.trim()).filter(Boolean),
      estado: form.estado,
      ...(esAdmin && {
        tipo_vinculo: form.tipo_vinculo,
        categoria_cct: form.categoria_cct || null,
        valor_hora: form.valor_hora || null,
        sueldo_basico: form.sueldo_basico || null,
        horas_semanales: form.horas_semanales || null,
        vencimiento_monotributo: form.vencimiento_monotributo || null,
        vencimiento_art: form.vencimiento_art || null,
        vencimiento_seguro: form.vencimiento_seguro || null,
      }),
    };
    const { error: errorUpdate } = await supabase.from('asistentes').update(payload).eq('id', asistente.id);
    setGuardando(false);
    if (errorUpdate) {
      setError(t.comun.error_generico);
      return;
    }
    setGuardado(true);
    onActualizado();
  }

  function descargarCertificadoTrabajo() {
    descargarPDF(generarCertificadoTrabajo({ asistente }), `certificado-trabajo-${asistente.nombre}.pdf`);
  }

  function descargarCertificadoRemuneraciones() {
    descargarPDF(generarCertificadoRemuneracionesServicios({ asistente }), `certificado-remuneraciones-${asistente.nombre}.pdf`);
  }

  return (
    <div>
      {error && <Alert variant="error">{error}</Alert>}
      {guardado && <Alert variant="info">{t.comun.guardar} ✓</Alert>}

      <dl className="panel-detalle-lista">
        <dt>{t.asistentes.dni}</dt>
        <dd>{asistente.dni || '—'}</dd>
        <dt>{t.asistentes.telefono}</dt>
        <dd>{asistente.telefono || '—'}</dd>
        <dt>{t.asistentes.email}</dt>
        <dd>{asistente.email || '—'}</dd>
        <dt>{t.asistentes.fecha_alta}</dt>
        <dd>{new Date(asistente.fecha_alta).toLocaleDateString()}</dd>
      </dl>

      <FormField label={t.asistentes.col_especialidades} name="especialidades" value={form.especialidades} onChange={(e) => set('especialidades', e.target.value)} />
      <FormField label={t.asistentes.col_zonas} name="zonas" value={form.zonas} onChange={(e) => set('zonas', e.target.value)} />

      {asistente.estado === 'cesado' ? (
        <>
          <FormField label={t.asistentes.col_estado} name="estado" type="select" value="cesado" disabled>
            <option value="cesado">{t.asistentes.estado_cesado}</option>
          </FormField>
          <Alert variant="info">{t.asistentes.cese.ya_cesado}</Alert>
        </>
      ) : (
        <FormField label={t.asistentes.col_estado} name="estado" type="select" value={form.estado} onChange={(e) => set('estado', e.target.value)}>
          <option value="activo">{t.asistentes.estado_activo}</option>
          <option value="inactivo">{t.asistentes.estado_inactivo}</option>
        </FormField>
      )}

      {esAdmin && (
        <>
          <h2>{t.asistentes.tabs.perfil_vinculo}</h2>
          <FormField label={t.asistentes.col_vinculo} name="tipo_vinculo" type="select" value={form.tipo_vinculo} onChange={(e) => set('tipo_vinculo', e.target.value)}>
            <option value="monotributo">{t.asistentes.vinculo_monotributo}</option>
            <option value="dependencia">{t.asistentes.vinculo_dependencia}</option>
          </FormField>

          {form.tipo_vinculo === 'dependencia' ? (
            <>
              <FormField label={t.asistentes.categoria_cct} name="categoria_cct" value={form.categoria_cct} onChange={(e) => set('categoria_cct', e.target.value)} />
              <FormField label={t.asistentes.sueldo_basico} name="sueldo_basico" type="number" value={form.sueldo_basico} onChange={(e) => set('sueldo_basico', e.target.value)} />
            </>
          ) : (
            <FormField label={t.asistentes.valor_hora} name="valor_hora" type="number" value={form.valor_hora} onChange={(e) => set('valor_hora', e.target.value)} />
          )}
          <FormField label={t.asistentes.horas_semanales} name="horas_semanales" type="number" value={form.horas_semanales} onChange={(e) => set('horas_semanales', e.target.value)} />

          <FormField label={t.asistentes.vencimiento_monotributo} name="vencimiento_monotributo" type="date" value={form.vencimiento_monotributo} onChange={(e) => set('vencimiento_monotributo', e.target.value)} />
          <FormField label={t.asistentes.vencimiento_art} name="vencimiento_art" type="date" value={form.vencimiento_art} onChange={(e) => set('vencimiento_art', e.target.value)} />
          <FormField label={t.asistentes.vencimiento_seguro} name="vencimiento_seguro" type="date" value={form.vencimiento_seguro} onChange={(e) => set('vencimiento_seguro', e.target.value)} />
        </>
      )}

      <Button onClick={guardar} disabled={guardando}>{guardando ? t.comun.guardando : t.comun.guardar}</Button>

      {esAdmin && (
        <>
          <h2>{t.asistentes.documentos.titulo}</h2>
          <Button variant="secondary" onClick={descargarCertificadoTrabajo}>
            {t.asistentes.documentos.certificado_trabajo}
          </Button>
          <Button variant="secondary" onClick={descargarCertificadoRemuneraciones}>
            {t.asistentes.documentos.certificado_remuneraciones}
          </Button>
        </>
      )}
    </div>
  );
}
