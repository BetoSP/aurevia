import { supabase } from '../db/connection.js';
import { analizarAlertaIA } from './alertasIA.js';
import { notificarCoordinador } from './whatsapp.js';
import { enviarPushFamilia } from './push.js';

const REPORTES_A_ANALIZAR = 7;

// IA Nivel 2 (Alertas por patrones, docs/AI_PROMPTS.md:41-79). Dos disparadores:
// (a) análisis nocturno de todo Paciente con reportes nuevos desde su último análisis,
// (b) análisis inmediato si un reporte recién confirmado contiene una palabra clave crítica
// (configuracion_alertas_ia, nunca hardcodeada — llamado directamente desde
// appAsistentes.js en vez de por este cron, así que analizarPaciente queda exportado).
export async function revisarAlertasIA() {
  const { data: pacientes, error } = await supabase
    .from('pacientes')
    .select('id, prestadora_id, ultimo_analisis_ia_at');

  if (error) {
    console.error('Error consultando pacientes para IA Nivel 2:', error.message);
    return;
  }

  for (const paciente of pacientes ?? []) {
    let query = supabase
      .from('reportes')
      .select('id, created_at, guardias!inner(paciente_id)')
      .eq('guardias.paciente_id', paciente.id)
      .limit(1);
    if (paciente.ultimo_analisis_ia_at) {
      query = query.gt('created_at', paciente.ultimo_analisis_ia_at);
    }
    const { data: hayNuevos } = await query;
    if (!hayNuevos?.length) continue;

    await analizarPaciente(paciente.id, paciente.prestadora_id);
  }
}

// Analiza los últimos N reportes de un Paciente y persiste una alerta si corresponde. Se
// reutiliza tanto desde el cron nocturno como desde el disparo inmediato por palabra clave.
export async function analizarPaciente(pacienteId, prestadoraId) {
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('patologias, medicacion_habitual, familia_id')
    .eq('id', pacienteId)
    .maybeSingle();
  if (!paciente) return;

  const { data: reportes, error: errorReportes } = await supabase
    .from('reportes')
    .select('id, texto_libre, alimentacion, medicacion, signos_vitales, estado_animo, incidentes, observaciones, created_at, guardias!inner(paciente_id)')
    .eq('guardias.paciente_id', pacienteId)
    .order('created_at', { ascending: false })
    .limit(REPORTES_A_ANALIZAR);

  if (errorReportes || !reportes?.length) return;

  let resultado;
  try {
    resultado = await analizarAlertaIA(
      { patologias: paciente.patologias, medicacionHabitual: paciente.medicacion_habitual },
      reportes.map((r) => ({
        id: r.id,
        texto_libre: r.texto_libre,
        alimentacion: r.alimentacion,
        medicacion: r.medicacion,
        signos_vitales: r.signos_vitales,
        estado_animo: r.estado_animo,
        incidentes: r.incidentes,
        observaciones: r.observaciones,
        fecha: r.created_at,
      })),
    );
  } catch (err) {
    console.error(`Error analizando IA Nivel 2 para paciente ${pacienteId}:`, err.message);
    return;
  }

  await supabase.from('pacientes').update({ ultimo_analisis_ia_at: new Date().toISOString() }).eq('id', pacienteId);

  if (!resultado || resultado.nivel === 'verde') return;

  const { data: alerta, error: errorAlerta } = await supabase
    .from('alertas')
    .insert({
      prestadora_id: prestadoraId,
      paciente_id: pacienteId,
      nivel: resultado.nivel,
      descripcion: resultado.descripcion,
      detalle_coordinador: resultado.detalle_coordinador,
      campos_preocupantes: resultado.campos_preocupantes,
      reportes_relacionados: reportes.map((r) => r.id),
    })
    .select('id')
    .single();
  if (errorAlerta) {
    console.error(`Error insertando alerta IA Nivel 2 para paciente ${pacienteId}:`, errorAlerta.message);
    return;
  }

  // ROJA → Coordinador + Familia (push inmediato); AMARILLA → solo Coordinador.
  // docs/AI_PROMPTS.md:78-79.
  await notificarCoordinador({
    evento: 'alerta_ia_nivel2',
    prestadoraId,
    asunto: resultado.nivel === 'roja' ? 'Alerta ROJA de IA — Paciente' : 'Alerta AMARILLA de IA — Paciente',
    texto: resultado.detalle_coordinador || resultado.descripcion || 'Ver detalle en el Panel.',
  });

  if (resultado.nivel === 'roja' && paciente.familia_id) {
    enviarPushFamilia(paciente.familia_id, {
      titulo: 'Alerta sobre tu Paciente',
      cuerpo: resultado.descripcion || 'Hay una novedad importante — revisá la app.',
      url: `/pacientes/${pacienteId}/alertas`,
    }).catch((err) => console.error('Error enviando push de alerta roja a Familia:', err.message));
  }

  return alerta;
}
