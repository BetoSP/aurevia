import { useEffect, useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { useEscalasLegales } from '../../hooks/useEscalasLegales';
import { resolverEscalasVigentes } from '../../lib/escalasLegales';
import { calcularCese } from '../../lib/calcularCese';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Alert } from '../../components/ui/Alert';
import { EstadoLista } from '../../components/layout/EstadoLista';
import {
  generarLiquidacionFinal, generarTelegramaCese, generarNotificacionFinPeriodoPrueba, descargarPDF,
} from '../../lib/generarDocumentoCese';

const CAUSALES_CON_TELEGRAMA = new Set(['despido_con_justa_causa', 'despido_sin_causa', 'abandono_de_trabajo']);

const CAUSALES = [
  'renuncia', 'mutuo_acuerdo', 'despido_con_justa_causa', 'despido_sin_causa',
  'abandono_de_trabajo', 'muerte_del_trabajador', 'muerte_del_empleador',
  'muerte_persona_cuidada', 'periodo_de_prueba', 'incapacidad_absoluta',
  'jubilacion', 'despido_por_embarazo_o_matrimonio', 'fin_contrato_comercial',
];

export function VinculoCeseTab({ asistente, onActualizado }) {
  const { t } = useLocale();
  const { usuario } = useAuth();
  const { empresa } = useEmpresa();
  const { filas: escalasCrudas, estado: estadoEscalas } = useEscalasLegales();
  const [ceses, setCeses] = useState([]);
  const [estadoCeses, setEstadoCeses] = useState('cargando');
  const [errorCeses, setErrorCeses] = useState(null);
  const [fechaCese, setFechaCese] = useState(new Date().toISOString().slice(0, 10));
  const [causal, setCausal] = useState('despido_sin_causa');
  const [resultado, setResultado] = useState(null);
  const [revisadoAbogado, setRevisadoAbogado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  function cargarCeses() {
    setEstadoCeses('cargando');
    setErrorCeses(null);
    supabase.from('ceses').select('*').eq('asistente_id', asistente.id).order('created_at', { ascending: false })
      .then(({ data, error: errorConsulta }) => {
        if (errorConsulta) {
          setErrorCeses(errorConsulta.message);
          setEstadoCeses('error');
          return;
        }
        setCeses(data ?? []);
        setEstadoCeses('listo');
      });
  }

  useEffect(() => {
    cargarCeses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asistente.id]);

  function calcular() {
    const escalasResueltas = resolverEscalasVigentes(escalasCrudas, fechaCese);
    const r = calcularCese({ asistente, fechaCese, causal, escalasLegales: escalasResueltas });
    setResultado(r);
    setRevisadoAbogado(false);
  }

  async function confirmarCese() {
    if (resultado.requiereRevisionAbogado && !revisadoAbogado) return;
    const confirmado = window.confirm(t.asistentes.cese.confirmar);
    if (!confirmado) return;

    setGuardando(true);
    setError(null);

    const { error: errorCese } = await supabase.from('ceses').insert({
      prestadora_id: usuario.prestadora_id,
      asistente_id: asistente.id,
      fecha_cese: fechaCese,
      causal,
      detalle_calculo: resultado.detalleCalculo,
      monto_total: resultado.montoTotal,
      revisado_por_abogado: revisadoAbogado,
    });

    if (!errorCese) {
      await supabase.from('asistentes').update({
        estado: 'cesado', fecha_baja: fechaCese, causal_baja: causal,
      }).eq('id', asistente.id);
    }

    setGuardando(false);
    if (errorCese) {
      setError(t.comun.error_generico);
      return;
    }
    setResultado(null);
    onActualizado();
  }

  function descargarLiquidacion(cese) {
    const doc = generarLiquidacionFinal({ asistente, cese, causalLabel: t.asistentes.causales[cese.causal], nombreEmpresa: empresa?.nombre ?? '' });
    descargarPDF(doc, `liquidacion-${asistente.nombre}-${cese.fecha_cese}.pdf`);
  }

  function descargarTelegramaONotificacion(cese) {
    if (cese.causal === 'periodo_de_prueba') {
      const doc = generarNotificacionFinPeriodoPrueba({ asistente, cese, nombreEmpresa: empresa?.nombre ?? '' });
      descargarPDF(doc, `notificacion-fin-periodo-prueba-${asistente.nombre}-${cese.fecha_cese}.pdf`);
      return;
    }
    const doc = generarTelegramaCese({ asistente, cese, causalLabel: t.asistentes.causales[cese.causal], nombreEmpresa: empresa?.nombre ?? '' });
    descargarPDF(doc, `telegrama-cese-${asistente.nombre}-${cese.fecha_cese}.pdf`);
  }

  return (
    <div>
      <h2>{t.asistentes.tabs.historial_ceses}</h2>
      <EstadoLista estado={estadoCeses} error={errorCeses} vacio={estadoCeses === 'listo' && ceses.length === 0} recargar={cargarCeses}>
        <table className="panel-tabla">
          <thead>
            <tr>
              <th>{t.asistentes.cese.fecha}</th>
              <th>{t.asistentes.cese.causal}</th>
              <th>{t.asistentes.cese.monto}</th>
              <th>{t.asistentes.cese.revisado_abogado}</th>
              <th>{t.asistentes.cese.documentos}</th>
            </tr>
          </thead>
          <tbody>
            {ceses.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.fecha_cese).toLocaleDateString()}</td>
                <td>{t.asistentes.causales[c.causal]}</td>
                <td>{c.monto_total !== null ? `$${Number(c.monto_total).toLocaleString('es-AR')}` : '—'}</td>
                <td>{c.revisado_por_abogado ? '✓' : <span className="badge badge-en_revision">{t.comun.no}</span>}</td>
                <td>
                  <Button variant="secondary" onClick={() => descargarLiquidacion(c)}>{t.asistentes.cese.descargar_liquidacion}</Button>
                  {(CAUSALES_CON_TELEGRAMA.has(c.causal) || c.causal === 'periodo_de_prueba') && (
                    <Button variant="secondary" onClick={() => descargarTelegramaONotificacion(c)}>
                      {c.causal === 'periodo_de_prueba' ? t.asistentes.cese.descargar_notificacion_prueba : t.asistentes.cese.descargar_telegrama}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EstadoLista>

      {asistente.estado === 'cesado' ? (
        <Alert variant="info">{t.asistentes.cese.ya_cesado}</Alert>
      ) : (
        <>
          <h2>{t.asistentes.tabs.registrar_cese}</h2>
          {error && <Alert variant="error">{error}</Alert>}

          <FormField label={t.asistentes.cese.fecha} name="fecha_cese" type="date" value={fechaCese} onChange={(e) => { setFechaCese(e.target.value); setResultado(null); }} />
          <FormField label={t.asistentes.cese.causal} name="causal" type="select" value={causal} onChange={(e) => { setCausal(e.target.value); setResultado(null); }}>
            {CAUSALES.map((c) => (
              <option key={c} value={c}>{t.asistentes.causales[c]}</option>
            ))}
          </FormField>

          <Button variant="secondary" onClick={calcular} disabled={estadoEscalas !== 'listo'}>
            {t.asistentes.cese.calcular}
          </Button>

          {resultado && (
            <div className="panel-resultado-calculo">
              <p><strong>{t.asistentes.cese.monto}:</strong> {resultado.montoTotal !== null ? `$${resultado.montoTotal.toLocaleString('es-AR')}` : t.asistentes.cese.requiere_calculo_manual}</p>

              <details>
                <summary>{t.asistentes.cese.ver_detalle_calculo}</summary>
                <pre className="panel-detalle-calculo-json">{JSON.stringify(resultado.detalleCalculo, null, 2)}</pre>
              </details>

              {resultado.advertencias.map((a, i) => (
                <Alert key={i} variant="info">{a}</Alert>
              ))}

              {resultado.requiereRevisionAbogado && (
                <FormField
                  label={t.asistentes.cese.revisado_abogado}
                  name="revisado_abogado"
                  type="checkbox"
                  checked={revisadoAbogado}
                  onChange={(e) => setRevisadoAbogado(e.target.checked)}
                />
              )}
              {resultado.requiereRevisionAbogado && !revisadoAbogado && (
                <Alert variant="error">{t.asistentes.cese.advertencia_requiere_abogado}</Alert>
              )}

              <Button
                onClick={confirmarCese}
                disabled={guardando || (resultado.requiereRevisionAbogado && !revisadoAbogado)}
              >
                {guardando ? t.comun.guardando : t.asistentes.cese.confirmar_boton}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
