import { obtenerValorEscala } from './escalasLegales';

// Los 7 indicadores de docs/PRD_02B_Gestion_Personal.md sección "Score de riesgo de
// reclasificación". Cada uno se carga a mano por Admin/Coordinador como un valor 0-1
// (0 = sin indicio, 1 = indicio pleno); los pesos (que suman 100) vienen de
// escalas_legales (tipo = 'indicador_riesgo_dependencia'), nunca hardcodeados.
export const INDICADORES_RIESGO = [
  'exclusividad_facturacion',
  'antiguedad_vinculo',
  'horas_semanales_promedio',
  'herramientas_provistas',
  'horario_fijo_impuesto',
  'exclusividad_zona',
  'supervision_directa',
];

// Función pura: score = suma ponderada de indicadores (0-1) por su peso (0-100).
// `escalasLegales` ya viene resuelto para la fecha del cálculo (ver escalasLegales.js).
export function calcularScoreRiesgo(indicadores, escalasLegales) {
  let score = 0;
  let pesoTotal = 0;
  const advertencias = [];

  for (const indicador of INDICADORES_RIESGO) {
    const peso = obtenerValorEscala(escalasLegales, 'indicador_riesgo_dependencia', indicador);
    if (peso === null) {
      advertencias.push(`Falta el peso vigente para el indicador "${indicador}".`);
      continue;
    }
    const valor = Number(indicadores?.[indicador] ?? 0);
    score += valor * peso;
    pesoTotal += peso;
  }

  const scoreFinal = pesoTotal > 0 ? Math.round(score) : 0;
  return { score: Math.min(100, Math.max(0, scoreFinal)), pesoTotal, advertencias };
}
