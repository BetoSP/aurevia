import Anthropic from '@anthropic-ai/sdk';

// IA Nivel 2 (Alertas por patrones) — prompt exacto de docs/AI_PROMPTS.md:47-71, no
// reformular acá sin actualizar ese archivo primero (el contrato JSON está acoplado a las
// columnas de `alertas`, ver DATA_MODEL.md). Mismo patrón de cliente perezoso que
// reporteIA.js/importacionIA.js.

const MODELO = 'claude-sonnet-5';

const SYSTEM_PROMPT = `Eres un sistema de monitoreo clínico para pacientes con cuidado domiciliario.
Analizarás los últimos N reportes diarios de un paciente y detectarás patrones preocupantes.

Datos del paciente: [patologías conocidas, medicación habitual]
Reportes: [array JSON de los últimos 7 reportes]

Evalúa:
1. Tendencia en alimentación (baja de apetito sostenida)
2. Tendencia en signos vitales (presión creciente, saturación baja)
3. Cambios en estado de ánimo (deterioro sostenido)
4. Medicación no administrada (comparar con prescripción habitual)
5. Incidentes repetidos

Responde SOLO con JSON:
{
  "nivel": "verde"|"amarilla"|"roja",
  "descripcion": string (max 150 chars, en español, para mostrar a la familia),
  "detalle_coordinador": string (más técnico, para el coordinador),
  "campos_preocupantes": [string]
}
Si todo está bien: nivel "verde", descripcion "Sin novedades destacadas esta semana."`;

let cliente = null;
function obtenerCliente() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!cliente) cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cliente;
}

// Nunca loguea los reportes ni el JSON de salida (regla 7 CLAUDE.md — dato de salud del
// paciente). Sin ANTHROPIC_API_KEY configurada, devuelve null — mejor no generar alerta que
// generar una sin base real (a diferencia de reporteIA.js, acá no hay un "modo sin IA"
// razonable: no hay reglas fijas capaces de reemplazar el análisis de patrones).
export async function analizarAlertaIA({ patologias, medicacionHabitual }, reportes) {
  const anthropic = obtenerCliente();
  if (!anthropic) return null;

  const mensaje = JSON.stringify({
    paciente: { patologias: patologias || null, medicacion_habitual: medicacionHabitual || null },
    reportes,
  });

  const respuesta = await anthropic.messages.create({
    model: MODELO,
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: mensaje }],
  });

  const texto = respuesta.content?.[0]?.type === 'text' ? respuesta.content[0].text : '';

  try {
    const parseado = JSON.parse(texto);
    if (!['verde', 'amarilla', 'roja'].includes(parseado.nivel)) return null;
    return {
      nivel: parseado.nivel,
      descripcion: parseado.descripcion || null,
      detalle_coordinador: parseado.detalle_coordinador || null,
      campos_preocupantes: Array.isArray(parseado.campos_preocupantes) ? parseado.campos_preocupantes : [],
    };
  } catch {
    return null;
  }
}
