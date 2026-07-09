import { describe, expect, it } from 'vitest';
import { calcularCese } from '../calcularCese';
import { resolverEscalasVigentes } from '../escalasLegales';

// Fixture congelada — no depende de la base real, ver checklist de PRD_02B.
const ESCALAS_FIXTURE = [
  { tipo: 'preaviso_dias', categoria: 'menos_1_anio', valor: 10, vigencia_desde: '2026-01-01', vigencia_hasta: null },
  { tipo: 'preaviso_dias', categoria: 'mas_1_anio', valor: 30, vigencia_desde: '2026-01-01', vigencia_hasta: null },
  { tipo: 'periodo_prueba_dias', categoria: 'general', valor: 90, vigencia_desde: '2026-01-01', vigencia_hasta: null },
  { tipo: 'indemnizacion_antiguedad', categoria: 'meses_por_anio', valor: 1, vigencia_desde: '2026-01-01', vigencia_hasta: null },
  { tipo: 'tope_indemnizatorio', categoria: 'general', valor: 3000000, vigencia_desde: '2026-01-01', vigencia_hasta: null },
  { tipo: 'piso_minimo_indemnizacion', categoria: 'meses', valor: 2, vigencia_desde: '2026-01-01', vigencia_hasta: null },
  { tipo: 'multiplicador_agravado', categoria: 'embarazo_matrimonio', valor: 13, vigencia_desde: '2026-01-01', vigencia_hasta: null },
  { tipo: 'fraccion_computable_antiguedad', categoria: 'general', valor: 90, vigencia_desde: '2026-01-01', vigencia_hasta: null },
];

function escalas(fechaHecho = '2026-07-08') {
  return resolverEscalasVigentes(ESCALAS_FIXTURE, fechaHecho);
}

const asistenteDependenciaBase = {
  tipo_vinculo: 'dependencia',
  fecha_alta: '2023-01-10',
  sueldo_basico: 500000,
};

describe('calcularCese', () => {
  it('renuncia no genera monto a pagar por el empleador', () => {
    const r = calcularCese({
      asistente: asistenteDependenciaBase, fechaCese: '2026-07-08', causal: 'renuncia', escalasLegales: escalas(),
    });
    expect(r.montoTotal).toBe(0);
    expect(r.requiereRevisionAbogado).toBe(false);
  });

  it('mutuo_acuerdo no calcula un monto fijo', () => {
    const r = calcularCese({
      asistente: asistenteDependenciaBase, fechaCese: '2026-07-08', causal: 'mutuo_acuerdo', escalasLegales: escalas(),
    });
    expect(r.montoTotal).toBeNull();
    expect(r.requiereRevisionAbogado).toBe(false);
  });

  it('despido_con_justa_causa no paga indemnización pero exige revisión de abogado', () => {
    const r = calcularCese({
      asistente: asistenteDependenciaBase, fechaCese: '2026-07-08', causal: 'despido_con_justa_causa', escalasLegales: escalas(),
    });
    expect(r.montoTotal).toBe(0);
    expect(r.requiereRevisionAbogado).toBe(true);
  });

  it('despido_sin_causa calcula antigüedad + preaviso + integración', () => {
    const r = calcularCese({
      asistente: asistenteDependenciaBase, fechaCese: '2026-07-08', causal: 'despido_sin_causa', escalasLegales: escalas(),
    });
    expect(r.montoTotal).toBeGreaterThan(0);
    // fecha_alta 2023-01-10 -> fechaCese 2026-07-08: 3 años + ~179 días de fracción,
    // que por LCT art. 245 (fracción mayor a 3 meses) redondea a 4 años computables.
    expect(r.detalleCalculo.aniosAntiguedad).toBe(4);
    expect(r.detalleCalculo.diasPreaviso).toBe(30);
    expect(r.requiereRevisionAbogado).toBe(false);
  });

  it('despido_sin_causa aplica el tope indemnizatorio cuando corresponde', () => {
    const asistenteSueldoAlto = { ...asistenteDependenciaBase, sueldo_basico: 5000000, fecha_alta: '2015-01-10' };
    const r = calcularCese({
      asistente: asistenteSueldoAlto, fechaCese: '2026-07-08', causal: 'despido_sin_causa', escalasLegales: escalas(),
    });
    expect(r.detalleCalculo.topeIndemnizatorioAplicado).toBe(true);
    expect(r.detalleCalculo.indemnizacionAntiguedad).toBe(3000000);
  });

  it('despido_por_embarazo_o_matrimonio agrega el agravamiento sobre la base de despido sin causa', () => {
    const sinCausa = calcularCese({
      asistente: asistenteDependenciaBase, fechaCese: '2026-07-08', causal: 'despido_sin_causa', escalasLegales: escalas(),
    });
    const agravado = calcularCese({
      asistente: asistenteDependenciaBase, fechaCese: '2026-07-08', causal: 'despido_por_embarazo_o_matrimonio', escalasLegales: escalas(),
    });
    expect(agravado.montoTotal).toBeGreaterThan(sinCausa.montoTotal);
    expect(agravado.detalleCalculo.mesesAgravado).toBe(13);
  });

  it('periodo_de_prueba sin indemnización si está dentro del período vigente', () => {
    const asistenteNuevo = { ...asistenteDependenciaBase, fecha_alta: '2026-06-01' };
    const r = calcularCese({
      asistente: asistenteNuevo, fechaCese: '2026-07-08', causal: 'periodo_de_prueba', escalasLegales: escalas(),
    });
    expect(r.montoTotal).toBe(0);
    expect(r.requiereRevisionAbogado).toBe(false);
  });

  it.each(['incapacidad_absoluta', 'jubilacion', 'fin_contrato_comercial', 'muerte_persona_cuidada'])(
    'la causal %s nunca calcula un monto automático',
    (causal) => {
      const r = calcularCese({
        asistente: asistenteDependenciaBase, fechaCese: '2026-07-08', causal, escalasLegales: escalas(),
      });
      expect(r.montoTotal).toBeNull();
      expect(r.requiereRevisionAbogado).toBe(true);
    },
  );

  it('muerte_del_trabajador calcula indemnización reducida y exige revisión de abogado', () => {
    const r = calcularCese({
      asistente: asistenteDependenciaBase, fechaCese: '2026-07-08', causal: 'muerte_del_trabajador', escalasLegales: escalas(),
    });
    expect(r.montoTotal).toBeGreaterThan(0);
    expect(r.requiereRevisionAbogado).toBe(true);
  });

  it('muerte_del_empleador advierte si el vínculo no es de dependencia', () => {
    const asistenteMonotributo = { ...asistenteDependenciaBase, tipo_vinculo: 'monotributo', valor_hora: 3000, horas_semanales: 40 };
    const r = calcularCese({
      asistente: asistenteMonotributo, fechaCese: '2026-07-08', causal: 'muerte_del_empleador', escalasLegales: escalas(),
    });
    expect(r.advertencias.some((a) => a.includes('solo aplica'))).toBe(true);
  });

  it('resolverEscalasVigentes respeta la fecha del hecho, no la fecha actual', () => {
    const historico = [
      { tipo: 'preaviso_dias', categoria: 'mas_1_anio', valor: 15, vigencia_desde: '2020-01-01', vigencia_hasta: '2025-12-31' },
      { tipo: 'preaviso_dias', categoria: 'mas_1_anio', valor: 30, vigencia_desde: '2026-01-01', vigencia_hasta: null },
    ];
    const enElPasado = resolverEscalasVigentes(historico, '2023-06-01');
    const asistenteConAntiguedad = { ...asistenteDependenciaBase, fecha_alta: '2020-01-10' };
    const r = calcularCese({
      asistente: asistenteConAntiguedad, fechaCese: '2023-06-01', causal: 'renuncia', escalasLegales: enElPasado,
    });
    expect(r.detalleCalculo.diasPreavisoAdeudadosPorAsistente).toBe(15);
  });
});
