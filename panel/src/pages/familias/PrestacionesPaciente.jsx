import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Alert } from '../../components/ui/Alert';

function calcularPrecioFinal(precioLista, tipoDescuento, valorDescuento) {
  const base = Number(precioLista) || 0;
  const valor = Number(valorDescuento) || 0;
  if (tipoDescuento === 'porcentaje') return Math.max(0, base - (base * valor) / 100);
  if (tipoDescuento === 'monto_fijo') return Math.max(0, base - valor);
  return base;
}

export function PrestacionesPaciente({ paciente, onClose }) {
  const { t } = useLocale();
  const { usuario } = useAuth();
  const [listaPrecios, setListaPrecios] = useState([]);
  const [prestaciones, setPrestaciones] = useState([]);
  const [paquetes, setPaquetes] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);

  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [precioListaId, setPrecioListaId] = useState('');
  const [dias, setDias] = useState('');
  const [horario, setHorario] = useState('');
  const [cantidadGuardias, setCantidadGuardias] = useState('');
  const [feriados, setFeriados] = useState(false);
  const [viajes, setViajes] = useState(false);
  const [hospitalizacion, setHospitalizacion] = useState(false);
  const [tipoDescuento, setTipoDescuento] = useState('');
  const [valorDescuento, setValorDescuento] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);

  const [seleccionadasParaPaquete, setSeleccionadasParaPaquete] = useState([]);
  const [mostrandoPaquete, setMostrandoPaquete] = useState(false);
  const [nombrePaquete, setNombrePaquete] = useState('');
  const [precioPaquete, setPrecioPaquete] = useState('');
  const [guardandoPaquete, setGuardandoPaquete] = useState(false);
  const [errorPaquete, setErrorPaquete] = useState(null);
  const [marcandoRevisado, setMarcandoRevisado] = useState(null);
  const [errorRevision, setErrorRevision] = useState(null);

  const [motivoCierre, setMotivoCierre] = useState('');
  const [motivoDetalleCierre, setMotivoDetalleCierre] = useState('');
  const [cerrandoServicio, setCerrandoServicio] = useState(false);
  const [errorCierre, setErrorCierre] = useState(null);
  const [servicioCerrado, setServicioCerrado] = useState(false);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);

    const [listaResp, prestacionesResp, paquetesResp, cierresResp] = await Promise.all([
      supabase.from('lista_precios').select('*').eq('activo', true).order('tipo_servicio'),
      supabase.from('prestaciones').select('*').eq('paciente_id', paciente.id).order('created_at', { ascending: false }),
      supabase
        .from('paquetes_prestaciones')
        .select('*, paquete_prestacion_items(prestacion_id)')
        .eq('paciente_id', paciente.id)
        .order('created_at', { ascending: false }),
      supabase.from('cierres_servicio_paciente').select('id').eq('paciente_id', paciente.id).limit(1),
    ]);

    if (listaResp.error || prestacionesResp.error || paquetesResp.error || cierresResp.error) {
      setError((listaResp.error || prestacionesResp.error || paquetesResp.error || cierresResp.error).message);
      setEstado('error');
      return;
    }

    setListaPrecios(listaResp.data ?? []);
    setPrestaciones(prestacionesResp.data ?? []);
    setPaquetes(paquetesResp.data ?? []);
    setServicioCerrado((cierresResp.data ?? []).length > 0);
    setEstado('listo');
  }, [paciente.id]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const precioSeleccionado = useMemo(
    () => listaPrecios.find((p) => String(p.id) === String(precioListaId)),
    [listaPrecios, precioListaId]
  );

  const precioFinalCalculado = useMemo(
    () => calcularPrecioFinal(precioSeleccionado?.precio, tipoDescuento, valorDescuento),
    [precioSeleccionado, tipoDescuento, valorDescuento]
  );

  function limpiarForm() {
    setPrecioListaId('');
    setDias('');
    setHorario('');
    setCantidadGuardias('');
    setFeriados(false);
    setViajes(false);
    setHospitalizacion(false);
    setTipoDescuento('');
    setValorDescuento('');
    setNota('');
    setErrorForm(null);
  }

  async function handleGuardarPrestacion() {
    if (!precioSeleccionado) {
      setErrorForm(t.prestaciones.seleccionar_precio_lista);
      return;
    }

    setGuardando(true);
    setErrorForm(null);

    const { error: errorInsert } = await supabase.from('prestaciones').insert({
      prestadora_id: usuario.prestadora_id,
      paciente_id: paciente.id,
      tipo_servicio: `${precioSeleccionado.tipo_servicio} — ${precioSeleccionado.modalidad}`,
      configuracion: {
        dias,
        horario,
        cantidad_guardias: cantidadGuardias,
        feriados,
        viajes,
        hospitalizacion,
      },
      precio_lista_id: precioSeleccionado.id,
      precio_lista_snapshot: precioSeleccionado.precio,
      tipo_descuento: tipoDescuento || null,
      valor_descuento: tipoDescuento ? Number(valorDescuento) : null,
      precio_final: precioFinalCalculado,
      nota,
      estado: 'vigente',
    });

    if (errorInsert) {
      setErrorForm(t.comun.error_generico);
      setGuardando(false);
      return;
    }

    setGuardando(false);
    setMostrandoForm(false);
    limpiarForm();
    recargar();
  }

  async function handleMarcarRevisado(prestacionId) {
    setMarcandoRevisado(prestacionId);
    setErrorRevision(null);
    const { error: errorUpdate } = await supabase.from('prestaciones').update({ requiere_revision: false }).eq('id', prestacionId);
    setMarcandoRevisado(null);
    if (errorUpdate) {
      setErrorRevision(t.comun.error_generico);
      return;
    }
    recargar();
  }

  async function handleCerrarServicio() {
    if (!window.confirm(t.prestaciones.confirmar_cierre_servicio)) return;

    setCerrandoServicio(true);
    setErrorCierre(null);

    const { data: cierreInsertado, error: errorInsert } = await supabase
      .from('cierres_servicio_paciente')
      .insert({
        prestadora_id: usuario.prestadora_id,
        paciente_id: paciente.id,
        motivo: motivoCierre,
        motivo_detalle: motivoCierre === 'otro' ? motivoDetalleCierre : null,
        cerrado_por: usuario.id,
      })
      .select()
      .single();
    if (errorInsert) {
      setCerrandoServicio(false);
      setErrorCierre(errorInsert.message);
      return;
    }

    // El pre-fetch de Asistentes/zonas involucrados corre recién acá, después del insert
    // de cierres_servicio_paciente: la policy RLS "coordinador_cierra_servicio_*" que le da
    // visibilidad a un Coordinador fuera de zona depende de que ese registro ya exista (ver
    // schema_cierre_servicio_zona_fix.sql). Si este fetch corriera antes del insert (como
    // en una versión anterior), un Coordinador fuera de zona no ve ninguna fila por RLS y la
    // notificación cruzada nunca se dispara — bug encontrado probando el flujo real
    // (docs/PENDIENTES.md #32). Todavía tiene que ir antes de la cascada de abajo, porque
    // filtra por estado='activa'/'programada'.
    const [seriesActivasResp, guardiasProgramadasResp] = await Promise.all([
      supabase
        .from('series_guardias')
        .select('asistente_id, asistentes(zonas)')
        .eq('paciente_id', paciente.id)
        .eq('estado', 'activa'),
      supabase
        .from('guardias')
        .select('asistente_id, asistentes(zonas)')
        .eq('paciente_id', paciente.id)
        .eq('estado', 'programada'),
    ]);

    const asistentesInvolucrados = new Map();
    for (const fila of [...(seriesActivasResp.data ?? []), ...(guardiasProgramadasResp.data ?? [])]) {
      if (fila.asistente_id) asistentesInvolucrados.set(fila.asistente_id, fila.asistentes?.zonas ?? []);
    }

    const ahora = new Date().toISOString();
    const resultados = await Promise.all([
      supabase.from('prestaciones').update({ estado: 'de_baja' }).eq('paciente_id', paciente.id).eq('estado', 'vigente'),
      supabase.from('paquetes_prestaciones').update({ estado: 'de_baja' }).eq('paciente_id', paciente.id).eq('estado', 'vigente'),
      supabase
        .from('series_guardias')
        .update({ estado: 'cancelada', cancelacion_origen: 'prestadora', cancelado_at: ahora })
        .eq('paciente_id', paciente.id)
        .eq('estado', 'activa'),
      supabase
        .from('guardias')
        .update({ estado: 'cancelada', cancelacion_origen: 'prestadora', cancelacion_alcance: 'total' })
        .eq('paciente_id', paciente.id)
        .eq('estado', 'programada'),
    ]);

    const errorCascada = resultados.find((r) => r.error)?.error;
    setCerrandoServicio(false);
    if (errorCascada) {
      setErrorCierre(errorCascada.message);
      return;
    }

    if (usuario.rol === 'coordinador') {
      const zonasCoordinador = usuario.zonas ?? [];
      const asistentesFueraDeZona = [...asistentesInvolucrados.entries()].filter(
        ([, zonasAsistente]) => !zonasCoordinador.some((z) => (zonasAsistente ?? []).includes(z))
      );
      if (asistentesFueraDeZona.length > 0) {
        await supabase.from('notificaciones_cierre_servicio').insert(
          asistentesFueraDeZona.map(([asistenteId]) => ({
            prestadora_id: usuario.prestadora_id,
            cierre_id: cierreInsertado.id,
            paciente_id: paciente.id,
            asistente_id: asistenteId,
            cerrado_por: usuario.id,
            motivo: motivoCierre,
            motivo_detalle: motivoCierre === 'otro' ? motivoDetalleCierre : null,
          }))
        );
      }
    }

    setMotivoCierre('');
    setMotivoDetalleCierre('');
    recargar();
  }

  function toggleSeleccionParaPaquete(id) {
    setSeleccionadasParaPaquete((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleGuardarPaquete() {
    if (seleccionadasParaPaquete.length < 2 || !precioPaquete) {
      setErrorPaquete(t.prestaciones.paquete_datos_incompletos);
      return;
    }

    setGuardandoPaquete(true);
    setErrorPaquete(null);

    const { data: paqueteCreado, error: errorPaquete_ } = await supabase
      .from('paquetes_prestaciones')
      .insert({
        prestadora_id: usuario.prestadora_id,
        paciente_id: paciente.id,
        nombre: nombrePaquete,
        precio_paquete: Number(precioPaquete),
        estado: 'vigente',
      })
      .select()
      .single();

    if (errorPaquete_) {
      setErrorPaquete(t.comun.error_generico);
      setGuardandoPaquete(false);
      return;
    }

    const items = seleccionadasParaPaquete.map((prestacionId) => ({
      prestadora_id: usuario.prestadora_id,
      paquete_id: paqueteCreado.id,
      prestacion_id: prestacionId,
    }));

    const { error: errorItems } = await supabase.from('paquete_prestacion_items').insert(items);

    if (errorItems) {
      setErrorPaquete(t.comun.error_generico);
      setGuardandoPaquete(false);
      return;
    }

    setGuardandoPaquete(false);
    setMostrandoPaquete(false);
    setSeleccionadasParaPaquete([]);
    setNombrePaquete('');
    setPrecioPaquete('');
    recargar();
  }

  return (
    <div className="panel-modal-fondo" onClick={onClose}>
      <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t.prestaciones.titulo} — {paciente.nombre}</h2>

        {estado === 'cargando' && <p className="estado-cargando">{t.comun.cargando}</p>}
        {estado === 'error' && <Alert variant="error">{error || t.comun.error_generico}</Alert>}

        {estado === 'listo' && (
          <>
            {paquetes.length > 0 && (
              <>
                <h3>{t.prestaciones.paquetes_titulo}</h3>
                <ul className="panel-lista-simple">
                  {paquetes.map((pq) => (
                    <li key={pq.id}>
                      {pq.nombre || t.prestaciones.paquete_sin_nombre} — {pq.precio_paquete} ({pq.paquete_prestacion_items.length} {t.prestaciones.prestaciones_incluidas})
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3>{t.prestaciones.vigentes_titulo}</h3>
            {errorRevision && <Alert variant="error">{errorRevision}</Alert>}
            {prestaciones.length === 0 ? (
              <p className="estado-vacio">{t.prestaciones.sin_prestaciones}</p>
            ) : (
              <table className="panel-tabla">
                <thead>
                  <tr>
                    <th></th>
                    <th>{t.prestaciones.col_tipo_servicio}</th>
                    <th>{t.prestaciones.col_precio_final}</th>
                    <th>{t.prestaciones.col_estado}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {prestaciones.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={seleccionadasParaPaquete.includes(p.id)}
                          onChange={() => toggleSeleccionParaPaquete(p.id)}
                        />
                      </td>
                      <td>{p.tipo_servicio}</td>
                      <td>{p.precio_final}</td>
                      <td>
                        {p.requiere_revision ? (
                          <span className="badge badge-rechazado">{t.prestaciones.a_revisar}</span>
                        ) : (
                          <span className="badge badge-aprobado">{t.prestaciones.al_dia}</span>
                        )}
                      </td>
                      <td>
                        {p.requiere_revision && (
                          <Button variant="secondary" onClick={() => handleMarcarRevisado(p.id)} disabled={marcandoRevisado === p.id}>
                            {t.prestaciones.marcar_revisado}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="panel-modal-acciones">
              {seleccionadasParaPaquete.length >= 2 && !mostrandoPaquete && (
                <Button variant="secondary" onClick={() => setMostrandoPaquete(true)}>
                  {t.prestaciones.armar_paquete}
                </Button>
              )}
              {!mostrandoForm && (
                <Button onClick={() => setMostrandoForm(true)}>{t.prestaciones.nueva_prestacion}</Button>
              )}
            </div>

            {mostrandoPaquete && (
              <div className="panel-resultado-calculo">
                <h3>{t.prestaciones.armar_paquete}</h3>
                {errorPaquete && <Alert variant="error">{errorPaquete}</Alert>}
                <FormField
                  label={t.prestaciones.nombre_paquete}
                  name="nombre_paquete"
                  value={nombrePaquete}
                  onChange={(e) => setNombrePaquete(e.target.value)}
                />
                <FormField
                  label={t.prestaciones.precio_paquete}
                  name="precio_paquete"
                  type="number"
                  step="0.01"
                  value={precioPaquete}
                  onChange={(e) => setPrecioPaquete(e.target.value)}
                  required
                />
                <div className="panel-modal-acciones">
                  <Button variant="secondary" onClick={() => setMostrandoPaquete(false)} disabled={guardandoPaquete}>
                    {t.comun.cancelar}
                  </Button>
                  <Button onClick={handleGuardarPaquete} disabled={guardandoPaquete}>
                    {guardandoPaquete ? t.comun.guardando : t.comun.guardar}
                  </Button>
                </div>
              </div>
            )}

            {mostrandoForm && (
              <div className="panel-resultado-calculo">
                <h3>{t.prestaciones.nueva_prestacion}</h3>
                {errorForm && <Alert variant="error">{errorForm}</Alert>}

                <FormField
                  label={t.prestaciones.col_tipo_servicio}
                  name="precio_lista_id"
                  type="select"
                  value={precioListaId}
                  onChange={(e) => setPrecioListaId(e.target.value)}
                  required
                >
                  <option value="">—</option>
                  {listaPrecios.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tipo_servicio} — {p.modalidad} ({p.precio})
                    </option>
                  ))}
                </FormField>

                <FormField label={t.prestaciones.dias} name="dias" value={dias} onChange={(e) => setDias(e.target.value)} />
                <FormField label={t.prestaciones.horario} name="horario" value={horario} onChange={(e) => setHorario(e.target.value)} />
                <FormField
                  label={t.prestaciones.cantidad_guardias}
                  name="cantidad_guardias"
                  type="number"
                  value={cantidadGuardias}
                  onChange={(e) => setCantidadGuardias(e.target.value)}
                />
                <FormField label={t.prestaciones.feriados} name="feriados" type="checkbox" checked={feriados} onChange={(e) => setFeriados(e.target.checked)} />
                <FormField label={t.prestaciones.viajes} name="viajes" type="checkbox" checked={viajes} onChange={(e) => setViajes(e.target.checked)} />
                <FormField label={t.prestaciones.hospitalizacion} name="hospitalizacion" type="checkbox" checked={hospitalizacion} onChange={(e) => setHospitalizacion(e.target.checked)} />

                <FormField
                  label={t.prestaciones.tipo_descuento}
                  name="tipo_descuento"
                  type="select"
                  value={tipoDescuento}
                  onChange={(e) => setTipoDescuento(e.target.value)}
                >
                  <option value="">{t.prestaciones.sin_descuento}</option>
                  <option value="porcentaje">{t.prestaciones.descuento_porcentaje}</option>
                  <option value="monto_fijo">{t.prestaciones.descuento_monto_fijo}</option>
                </FormField>

                {tipoDescuento && (
                  <FormField
                    label={t.prestaciones.valor_descuento}
                    name="valor_descuento"
                    type="number"
                    step="0.01"
                    value={valorDescuento}
                    onChange={(e) => setValorDescuento(e.target.value)}
                  />
                )}

                <FormField label={t.comun.nota_interna} name="nota" type="textarea" value={nota} onChange={(e) => setNota(e.target.value)} />

                {precioSeleccionado && (
                  <p className="panel-explicacion">
                    {t.prestaciones.precio_final_calculado}: <strong>{precioFinalCalculado}</strong>
                  </p>
                )}

                <div className="panel-modal-acciones">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMostrandoForm(false);
                      limpiarForm();
                    }}
                    disabled={guardando}
                  >
                    {t.comun.cancelar}
                  </Button>
                  <Button onClick={handleGuardarPrestacion} disabled={guardando}>
                    {guardando ? t.comun.guardando : t.comun.guardar}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {estado === 'listo' && ['admin_prestadora', 'coordinador'].includes(usuario.rol) && (
          <div className="panel-resultado-calculo">
            <h3>{t.prestaciones.cierre_servicio_titulo}</h3>
            {servicioCerrado ? (
              <Alert variant="info">{t.prestaciones.servicio_ya_cerrado}</Alert>
            ) : (
              <>
                <p className="panel-explicacion">{t.prestaciones.cierre_servicio_explicacion}</p>
                {errorCierre && <Alert variant="error">{errorCierre}</Alert>}
                <FormField
                  label={t.prestaciones.cierre_servicio_motivo}
                  name="motivo_cierre"
                  type="select"
                  value={motivoCierre}
                  onChange={(e) => setMotivoCierre(e.target.value)}
                >
                  <option value="">{t.guardias.nueva_guardia.elegir}</option>
                  <option value="fin_demanda">{t.prestaciones.cierre_servicio_motivo_fin_demanda}</option>
                  <option value="fallecimiento">{t.prestaciones.cierre_servicio_motivo_fallecimiento}</option>
                  <option value="otro">{t.prestaciones.cierre_servicio_motivo_otro}</option>
                </FormField>
                {motivoCierre === 'otro' && (
                  <FormField
                    label={t.prestaciones.cierre_servicio_motivo_detalle}
                    name="motivo_detalle_cierre"
                    type="textarea"
                    value={motivoDetalleCierre}
                    onChange={(e) => setMotivoDetalleCierre(e.target.value)}
                  />
                )}
                <Button
                  variant="secondary"
                  onClick={handleCerrarServicio}
                  disabled={cerrandoServicio || !motivoCierre || (motivoCierre === 'otro' && !motivoDetalleCierre)}
                >
                  {cerrandoServicio ? t.prestaciones.cerrando_servicio : t.prestaciones.cierre_servicio_titulo}
                </Button>
              </>
            )}
          </div>
        )}

        <div className="panel-modal-acciones">
          <Button variant="secondary" onClick={onClose}>
            {t.comun.cerrar}
          </Button>
        </div>
      </div>
    </div>
  );
}
