import { useEffect, useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Alert } from '../../components/ui/Alert';

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_GENERACION_SIN_VIGENCIA_HASTA = 90;

export function NuevaGuardiaModal({ onClose, onCreada }) {
  const { t } = useLocale();
  const [esSerie, setEsSerie] = useState(false);
  const [asistentes, setAsistentes] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [asistenteId, setAsistenteId] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [modalidad, setModalidad] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [fecha, setFecha] = useState('');
  const [diasSemana, setDiasSemana] = useState([]);
  const [vigenteDesde, setVigenteDesde] = useState('');
  const [vigenteHasta, setVigenteHasta] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargarListas() {
      const [{ data: asistentesData }, { data: pacientesData }] = await Promise.all([
        supabase.from('asistentes').select('id, nombre').eq('estado', 'activo').order('nombre'),
        supabase.from('pacientes').select('id, nombre').is('deleted_at', null).order('nombre'),
      ]);
      setAsistentes(asistentesData ?? []);
      setPacientes(pacientesData ?? []);
    }
    cargarListas();
  }, []);

  function toggleDia(dia) {
    setDiasSemana((prev) => (prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]));
  }

  function generarFechasSerie(desde, hasta, dias) {
    const diaIndices = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
    const indicesElegidos = dias.map((d) => diaIndices[d]);
    const fechaInicio = new Date(`${desde}T00:00:00`);
    const fechaFin = hasta
      ? new Date(`${hasta}T00:00:00`)
      : new Date(fechaInicio.getTime() + DIAS_GENERACION_SIN_VIGENCIA_HASTA * 24 * 60 * 60 * 1000);
    const fechas = [];
    for (let f = fechaInicio; f <= fechaFin; f = new Date(f.getTime() + 24 * 60 * 60 * 1000)) {
      if (indicesElegidos.includes(f.getDay())) {
        fechas.push(f.toISOString().slice(0, 10));
      }
    }
    return fechas;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (esSerie && diasSemana.length === 0) {
      setError(t.guardias.nueva_guardia.error_dias_semana);
      return;
    }

    setGuardando(true);

    if (!esSerie) {
      const { error: errorInsert } = await supabase.from('guardias').insert({
        asistente_id: asistenteId,
        paciente_id: pacienteId,
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        modalidad,
      });
      setGuardando(false);
      if (errorInsert) {
        setError(errorInsert.message);
        return;
      }
      onCreada();
      return;
    }

    const { data: serie, error: errorSerie } = await supabase
      .from('series_guardias')
      .insert({
        asistente_id: asistenteId,
        paciente_id: pacienteId,
        dias_semana: diasSemana,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        modalidad,
        vigente_desde: vigenteDesde,
        vigente_hasta: vigenteHasta || null,
      })
      .select()
      .single();

    if (errorSerie) {
      setGuardando(false);
      setError(errorSerie.message);
      return;
    }

    const fechas = generarFechasSerie(vigenteDesde, vigenteHasta, diasSemana);
    const filasGuardias = fechas.map((f) => ({
      serie_id: serie.id,
      asistente_id: asistenteId,
      paciente_id: pacienteId,
      fecha: f,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      modalidad,
    }));

    const { error: errorGuardias } = await supabase.from('guardias').insert(filasGuardias);
    setGuardando(false);

    if (errorGuardias) {
      setError(errorGuardias.message);
      return;
    }

    onCreada();
  }

  return (
    <div className="panel-modal-fondo" onClick={onClose}>
      <div className="panel-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t.guardias.nueva_guardia.titulo}</h2>

        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <FormField
            label={t.guardias.nueva_guardia.es_serie}
            name="es_serie"
            type="checkbox"
            checked={esSerie}
            onChange={(e) => setEsSerie(e.target.checked)}
          />

          <FormField
            label={t.guardias.nueva_guardia.asistente}
            name="asistente_id"
            type="select"
            required
            value={asistenteId}
            onChange={(e) => setAsistenteId(e.target.value)}
          >
            <option value="">{t.guardias.nueva_guardia.elegir}</option>
            {asistentes.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </FormField>

          <FormField
            label={t.guardias.nueva_guardia.paciente}
            name="paciente_id"
            type="select"
            required
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
          >
            <option value="">{t.guardias.nueva_guardia.elegir}</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </FormField>

          <FormField
            label={t.guardias.nueva_guardia.modalidad}
            name="modalidad"
            required
            placeholder={t.guardias.nueva_guardia.modalidad_placeholder}
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value)}
          />

          <FormField
            label={t.guardias.nueva_guardia.hora_inicio}
            name="hora_inicio"
            type="time"
            required
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
          />

          <FormField
            label={t.guardias.nueva_guardia.hora_fin}
            name="hora_fin"
            type="time"
            required
            value={horaFin}
            onChange={(e) => setHoraFin(e.target.value)}
          />

          {!esSerie && (
            <FormField
              label={t.guardias.nueva_guardia.fecha}
              name="fecha"
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          )}

          {esSerie && (
            <>
              <div className="form-field">
                <label>{t.guardias.nueva_guardia.dias_semana}</label>
                <div className="panel-filtros">
                  {DIAS_SEMANA.map((dia) => (
                    <label key={dia} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <input type="checkbox" checked={diasSemana.includes(dia)} onChange={() => toggleDia(dia)} />
                      {t.guardias.nueva_guardia.dias[dia]}
                    </label>
                  ))}
                </div>
              </div>

              <FormField
                label={t.guardias.nueva_guardia.vigente_desde}
                name="vigente_desde"
                type="date"
                required
                value={vigenteDesde}
                onChange={(e) => setVigenteDesde(e.target.value)}
              />

              <FormField
                label={t.guardias.nueva_guardia.vigente_hasta}
                name="vigente_hasta"
                type="date"
                value={vigenteHasta}
                onChange={(e) => setVigenteHasta(e.target.value)}
              />
              <p className="panel-explicacion">{t.guardias.nueva_guardia.vigente_hasta_ayuda}</p>
            </>
          )}

          <div className="panel-modal-acciones">
            <Button variant="secondary" type="button" onClick={onClose} disabled={guardando}>
              {t.comun.cancelar}
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? t.guardias.nueva_guardia.creando : t.guardias.nueva_guardia.crear}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
