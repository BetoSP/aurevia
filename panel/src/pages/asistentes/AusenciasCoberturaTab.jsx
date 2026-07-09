import { useEffect, useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Alert } from '../../components/ui/Alert';
import { EstadoLista } from '../../components/layout/EstadoLista';
import { generarConstanciaAusencia, descargarPDF } from '../../lib/generarDocumentoCese';

const TIPOS = ['enfermedad_inculpable', 'accidente_inculpable', 'otra_licencia', 'ausencia_no_justificada'];

export function AusenciasCoberturaTab({ asistente }) {
  const { t } = useLocale();
  const [ausencias, setAusencias] = useState([]);
  const [otrosAsistentes, setOtrosAsistentes] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [nueva, setNueva] = useState({ tipo: 'enfermedad_inculpable', fecha_inicio: '', fecha_fin: '', observaciones: '' });
  const [coberturaForm, setCoberturaForm] = useState({});

  async function recargar() {
    setEstado('cargando');
    const [{ data: dataAusencias, error: errorAusencias }, { data: dataAsistentes }] = await Promise.all([
      supabase.from('ausencias').select('*').eq('asistente_id', asistente.id).order('fecha_inicio', { ascending: false }),
      supabase.from('asistentes').select('id, nombre').eq('estado', 'activo').neq('id', asistente.id),
    ]);
    if (errorAusencias) {
      setError(errorAusencias.message);
      setEstado('error');
      return;
    }
    setAusencias(dataAusencias ?? []);
    setOtrosAsistentes(dataAsistentes ?? []);
    setEstado('listo');
  }

  useEffect(() => { recargar(); }, [asistente.id]);

  async function registrarAusencia() {
    if (!nueva.fecha_inicio) return;
    setGuardando(true);
    setError(null);
    const { error: errorInsert } = await supabase.from('ausencias').insert({
      asistente_id: asistente.id,
      tipo: nueva.tipo,
      fecha_inicio: nueva.fecha_inicio,
      fecha_fin: nueva.fecha_fin || null,
      observaciones: nueva.observaciones || null,
    });
    setGuardando(false);
    if (errorInsert) {
      setError(t.comun.error_generico);
      return;
    }
    setNueva({ tipo: 'enfermedad_inculpable', fecha_inicio: '', fecha_fin: '', observaciones: '' });
    recargar();
  }

  function descargarConstancia(ausencia) {
    const doc = generarConstanciaAusencia({
      asistente, ausencia, tipoLabel: t.asistentes.ausencias[`tipo_${ausencia.tipo}`],
    });
    descargarPDF(doc, `constancia-ausencia-${asistente.nombre}-${ausencia.fecha_inicio}.pdf`);
  }

  async function asignarCobertura(ausenciaId) {
    const sustitutoId = coberturaForm[ausenciaId]?.asistente_sustituto_id;
    if (!sustitutoId) return;
    setGuardando(true);
    await supabase.from('guardias_cobertura').insert({
      ausencia_id: ausenciaId,
      asistente_sustituto_id: sustitutoId,
      costo_adicional: coberturaForm[ausenciaId]?.costo_adicional || null,
    });
    setGuardando(false);
    setCoberturaForm((prev) => ({ ...prev, [ausenciaId]: {} }));
  }

  return (
    <div>
      <h2>{t.asistentes.ausencias.titulo}</h2>
      {error && <Alert variant="error">{error}</Alert>}

      <EstadoLista estado={estado} error={error} vacio={estado === 'listo' && ausencias.length === 0} recargar={recargar}>
        {ausencias.map((a) => (
          <div key={a.id} className="panel-card-ausencia">
            <p>
              <strong>{t.asistentes.ausencias[`tipo_${a.tipo}`]}</strong> — {new Date(a.fecha_inicio).toLocaleDateString()}
              {a.fecha_fin ? ` → ${new Date(a.fecha_fin).toLocaleDateString()}` : ` (${t.asistentes.ausencias.en_curso})`}
            </p>
            {a.observaciones && <p>{a.observaciones}</p>}

            <Button variant="secondary" onClick={() => descargarConstancia(a)}>
              {t.asistentes.ausencias.descargar_constancia}
            </Button>

            <FormField
              label={t.asistentes.ausencias.asignar_sustituto}
              name={`sustituto-${a.id}`}
              type="select"
              value={coberturaForm[a.id]?.asistente_sustituto_id || ''}
              onChange={(e) => setCoberturaForm((prev) => ({ ...prev, [a.id]: { ...prev[a.id], asistente_sustituto_id: e.target.value } }))}
            >
              <option value="">{t.comun.todos}</option>
              {otrosAsistentes.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </FormField>
            <FormField
              label={t.asistentes.ausencias.costo_adicional}
              name={`costo-${a.id}`}
              type="number"
              value={coberturaForm[a.id]?.costo_adicional || ''}
              onChange={(e) => setCoberturaForm((prev) => ({ ...prev, [a.id]: { ...prev[a.id], costo_adicional: e.target.value } }))}
            />
            <Button variant="secondary" onClick={() => asignarCobertura(a.id)} disabled={guardando}>
              {t.asistentes.ausencias.guardar_cobertura}
            </Button>
          </div>
        ))}
      </EstadoLista>

      <h2>{t.asistentes.ausencias.registrar_nueva}</h2>
      <FormField label={t.asistentes.ausencias.tipo} name="tipo" type="select" value={nueva.tipo} onChange={(e) => setNueva((f) => ({ ...f, tipo: e.target.value }))}>
        {TIPOS.map((tipo) => <option key={tipo} value={tipo}>{t.asistentes.ausencias[`tipo_${tipo}`]}</option>)}
      </FormField>
      <FormField label={t.asistentes.ausencias.fecha_inicio} name="fecha_inicio" type="date" value={nueva.fecha_inicio} onChange={(e) => setNueva((f) => ({ ...f, fecha_inicio: e.target.value }))} required />
      <FormField label={t.asistentes.ausencias.fecha_fin} name="fecha_fin" type="date" value={nueva.fecha_fin} onChange={(e) => setNueva((f) => ({ ...f, fecha_fin: e.target.value }))} />
      <FormField label={t.comun.nota_interna} name="observaciones" type="textarea" value={nueva.observaciones} onChange={(e) => setNueva((f) => ({ ...f, observaciones: e.target.value }))} />
      <Button onClick={registrarAusencia} disabled={guardando || !nueva.fecha_inicio}>
        {guardando ? t.comun.guardando : t.asistentes.ausencias.registrar_nueva}
      </Button>
    </div>
  );
}
