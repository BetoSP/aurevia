import { describe, expect, it } from 'vitest';
import { calcularScoreRiesgo } from '../scoreRiesgo';
import { resolverEscalasVigentes } from '../escalasLegales';

const PESOS_FIXTURE = [
  { tipo: 'indicador_riesgo_dependencia', categoria: 'exclusividad_facturacion', valor: 20, vigencia_desde: '2026-01-01', vigencia_hasta: null },
  { tipo: 'indicador_riesgo_dependencia', categoria: 'antiguedad_vinculo', valor: 10, vigencia_desde: '2026-01-01', vigencia_hasta: null },
  { tipo: 'indicador_riesgo_dependencia', categoria: 'horas_semanales_promedio', valor: 20, vigencia_desde: '2026-01-01', vigencia_hasta: null },
  { tipo: 'indicador_riesgo_dependencia', categoria: 'herramientas_provistas', valor: 10, vigencia_desde: '2026-01-01', vigencia_hasta: null },
  { tipo: 'indicador_riesgo_dependencia', categoria: 'horario_fijo_impuesto', valor: 15, vigencia_desde: '2026-01-01', vigencia_hasta: null },
  { tipo: 'indicador_riesgo_dependencia', categoria: 'exclusividad_zona', valor: 10, vigencia_desde: '2026-01-01', vigencia_hasta: null },
  { tipo: 'indicador_riesgo_dependencia', categoria: 'supervision_directa', valor: 15, vigencia_desde: '2026-01-01', vigencia_hasta: null },
];

const escalas = resolverEscalasVigentes(PESOS_FIXTURE, '2026-07-08');

describe('calcularScoreRiesgo', () => {
  it('sin ningún indicio de subordinación el score es 0', () => {
    const { score } = calcularScoreRiesgo({}, escalas);
    expect(score).toBe(0);
  });

  it('con todos los indicadores al máximo el score es 100', () => {
    const todos = Object.fromEntries(['exclusividad_facturacion', 'antiguedad_vinculo', 'horas_semanales_promedio', 'herramientas_provistas', 'horario_fijo_impuesto', 'exclusividad_zona', 'supervision_directa'].map((k) => [k, 1]));
    const { score } = calcularScoreRiesgo(todos, escalas);
    expect(score).toBe(100);
  });

  it('pondera parcialmente cuando solo algunos indicadores están presentes', () => {
    const { score } = calcularScoreRiesgo({ exclusividad_facturacion: 1, horario_fijo_impuesto: 1 }, escalas);
    expect(score).toBe(35);
  });

  it('avisa si falta el peso vigente de un indicador', () => {
    const pesosIncompletos = resolverEscalasVigentes(PESOS_FIXTURE.slice(0, 3), '2026-07-08');
    const { advertencias } = calcularScoreRiesgo({}, pesosIncompletos);
    expect(advertencias.length).toBe(4);
  });
});
