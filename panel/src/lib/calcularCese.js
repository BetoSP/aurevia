import { obtenerValorEscala } from './escalasLegales';

// Causales que nunca calculan un monto automático — quedan siempre para el abogado.
// Ver docs/PRD_02B_Gestion_Personal.md sección "Fuera de alcance".
const CAUSALES_SIN_CALCULO_AUTOMATICO = new Set([
  'incapacidad_absoluta', 'jubilacion', 'fin_contrato_comercial', 'muerte_persona_cuidada',
]);

// Causales que nunca pagan indemnización pero sí requieren revisión legal antes de cerrarse.
const CAUSALES_JUSTA_CAUSA = new Set(['despido_con_justa_causa', 'abandono_de_trabajo']);

// Fracción mayor al umbral vigente computa como año completo (regla LCT art. 245) —
// el umbral (histórico: 3 meses/90 días) se lee de escalas_legales, nunca hardcodeado (regla 10).
function aniosCompletos(fechaAlta, fechaHecho, escalasResueltas) {
  const alta = new Date(fechaAlta);
  const hecho = new Date(fechaHecho);
  let anios = hecho.getFullYear() - alta.getFullYear();
  const cumpleEsteAnio = new Date(alta);
  cumpleEsteAnio.setFullYear(alta.getFullYear() + anios);
  if (cumpleEsteAnio > hecho) anios -= 1;

  const umbralDias = obtenerValorEscala(escalasResueltas, 'fraccion_computable_antiguedad', 'general');
  if (umbralDias !== null) {
    const proximoAniversario = new Date(alta);
    proximoAniversario.setFullYear(alta.getFullYear() + anios + 1);
    const diasHastaProximo = (proximoAniversario - hecho) / (1000 * 60 * 60 * 24);
    const diasDelAnio = (proximoAniversario - cumpleEsteAnio) / (1000 * 60 * 60 * 24);
    if (diasDelAnio - diasHastaProximo > umbralDias) anios += 1;
  }

  return Math.max(anios, 0);
}

function mesesDeAntiguedad(fechaAlta, fechaHecho) {
  const alta = new Date(fechaAlta);
  const hecho = new Date(fechaHecho);
  return (hecho.getFullYear() - alta.getFullYear()) * 12 + (hecho.getMonth() - alta.getMonth());
}

function mejorRemuneracion(asistente) {
  if (asistente.tipo_vinculo === 'dependencia' && asistente.sueldo_basico) {
    return Number(asistente.sueldo_basico);
  }
  if (asistente.valor_hora && asistente.horas_semanales) {
    return Number(asistente.valor_hora) * Number(asistente.horas_semanales) * 4.33;
  }
  return 0;
}

function diasHastaFinDeMes(fechaHecho) {
  const hecho = new Date(fechaHecho);
  const finDeMes = new Date(hecho.getFullYear(), hecho.getMonth() + 1, 0);
  return Math.max(0, (finDeMes - hecho) / (1000 * 60 * 60 * 24));
}

function calcularPreaviso(asistente, fechaCese, escalasResueltas, advertencias) {
  const meses = mesesDeAntiguedad(asistente.fecha_alta, fechaCese);
  const categoria = meses < 12 ? 'menos_1_anio' : 'mas_1_anio';
  const dias = obtenerValorEscala(escalasResueltas, 'preaviso_dias', categoria);
  if (dias === null) {
    advertencias.push('Falta escala vigente para preaviso_dias — no se pudo calcular el sustitutivo de preaviso.');
    return { dias: null, monto: null };
  }
  const monto = (mejorRemuneracion(asistente) / 30) * dias;
  return { dias, monto };
}

function calcularIndemnizacionAntiguedad(asistente, fechaCese, escalasResueltas, advertencias) {
  const anios = aniosCompletos(asistente.fecha_alta, fechaCese, escalasResueltas);
  const mesesPorAnio = obtenerValorEscala(escalasResueltas, 'indemnizacion_antiguedad', 'meses_por_anio');
  const tope = obtenerValorEscala(escalasResueltas, 'tope_indemnizatorio', 'general');
  const pisoMeses = obtenerValorEscala(escalasResueltas, 'piso_minimo_indemnizacion', 'meses');

  if (mesesPorAnio === null) {
    advertencias.push('Falta escala vigente para indemnizacion_antiguedad — no se pudo calcular.');
    return { anios, monto: null, topeAplicado: false };
  }

  const base = mejorRemuneracion(asistente);
  let monto = base * mesesPorAnio * Math.max(anios, 1);

  // El piso mínimo protege montos muy bajos, pero nunca debe hacer que el resultado
  // supere el tope indemnizatorio — el tope siempre es el techo final.
  if (pisoMeses !== null) {
    const piso = base * pisoMeses;
    if (monto < piso) monto = piso;
  }

  let topeAplicado = false;
  if (tope !== null && monto > tope) {
    monto = tope;
    topeAplicado = true;
  }

  return { anios, monto, topeAplicado };
}

function calcularDespidoSinCausa(asistente, fechaCese, escalasResueltas, advertencias) {
  const { anios, monto: montoAntiguedad, topeAplicado } = calcularIndemnizacionAntiguedad(
    asistente, fechaCese, escalasResueltas, advertencias,
  );
  const { dias: diasPreaviso, monto: montoPreaviso } = calcularPreaviso(
    asistente, fechaCese, escalasResueltas, advertencias,
  );
  const diasIntegracion = diasHastaFinDeMes(fechaCese);
  const montoIntegracion = (mejorRemuneracion(asistente) / 30) * diasIntegracion;

  const umbralDias = obtenerValorEscala(escalasResueltas, 'fraccion_computable_antiguedad', 'general');
  const umbralMeses = umbralDias !== null ? umbralDias / 30 : 3;
  if (anios < 1 || mesesDeAntiguedad(asistente.fecha_alta, fechaCese) < umbralMeses) {
    advertencias.push(`Antigüedad menor a ${umbralMeses} meses, verificar período de prueba.`);
  }

  const componentesValidos = montoAntiguedad !== null && montoPreaviso !== null;
  const montoTotal = componentesValidos
    ? Number((montoAntiguedad + montoPreaviso + montoIntegracion).toFixed(2))
    : null;

  return {
    montoTotal,
    detalleCalculo: {
      aniosAntiguedad: anios,
      indemnizacionAntiguedad: montoAntiguedad,
      topeIndemnizatorioAplicado: topeAplicado,
      diasPreaviso,
      sustitutivoPreaviso: montoPreaviso,
      diasIntegracionMesDespido: Number(diasIntegracion.toFixed(1)),
      integracionMesDespido: Number(montoIntegracion.toFixed(2)),
    },
  };
}

// Función pura y testeable — ver checklist de docs/PRD_02B_Gestion_Personal.md.
// No hace consultas de red ni de DB: `escalasLegales` ya viene resuelto para `fechaCese`
// vía resolverEscalasVigentes (ver escalasLegales.js).
export function calcularCese({ asistente, fechaCese, causal, escalasLegales }) {
  const advertencias = [];

  if (CAUSALES_SIN_CALCULO_AUTOMATICO.has(causal)) {
    return {
      montoTotal: null,
      detalleCalculo: { motivo: 'Causal fuera de alcance del cálculo automático — ver docs/PRD_02B_Gestion_Personal.md.' },
      advertencias: ['Esta causal no calcula un monto automático. El cálculo se hace fuera del sistema.'],
      requiereRevisionAbogado: true,
    };
  }

  switch (causal) {
    case 'renuncia': {
      const { dias, monto } = calcularPreaviso(asistente, fechaCese, escalasLegales, advertencias);
      return {
        montoTotal: 0,
        detalleCalculo: { diasPreavisoAdeudadosPorAsistente: dias, valorReferenciaPreaviso: monto },
        advertencias,
        requiereRevisionAbogado: false,
      };
    }

    case 'mutuo_acuerdo':
      return {
        montoTotal: null,
        detalleCalculo: { motivo: 'Monto a definir por acuerdo entre las partes — el sistema solo registra.' },
        advertencias,
        requiereRevisionAbogado: false,
      };

    case 'periodo_de_prueba': {
      const diasPrueba = obtenerValorEscala(escalasLegales, 'periodo_prueba_dias', 'general');
      const diasTranscurridos = mesesDeAntiguedad(asistente.fecha_alta, fechaCese) * 30;
      const dentroDelPeriodo = diasPrueba !== null && diasTranscurridos <= diasPrueba;
      if (!dentroDelPeriodo) {
        advertencias.push('La antigüedad excede el período de prueba vigente — revisar si corresponde otra causal.');
      }
      return {
        montoTotal: dentroDelPeriodo ? 0 : null,
        detalleCalculo: { diasPeriodoPrueba: diasPrueba, diasTranscurridos },
        advertencias,
        requiereRevisionAbogado: !dentroDelPeriodo,
      };
    }

    case 'despido_sin_causa': {
      const { montoTotal, detalleCalculo } = calcularDespidoSinCausa(asistente, fechaCese, escalasLegales, advertencias);
      return { montoTotal, detalleCalculo, advertencias, requiereRevisionAbogado: false };
    }

    case 'despido_por_embarazo_o_matrimonio': {
      const base = calcularDespidoSinCausa(asistente, fechaCese, escalasLegales, advertencias);
      const mesesAgravado = obtenerValorEscala(escalasLegales, 'multiplicador_agravado', 'embarazo_matrimonio');
      if (mesesAgravado === null || base.montoTotal === null) {
        advertencias.push('Falta escala vigente para multiplicador_agravado — no se pudo calcular el agravamiento.');
        return { montoTotal: null, detalleCalculo: base.detalleCalculo, advertencias, requiereRevisionAbogado: true };
      }
      const montoAgravado = Number((mejorRemuneracion(asistente) * mesesAgravado).toFixed(2));
      return {
        montoTotal: Number((base.montoTotal + montoAgravado).toFixed(2)),
        detalleCalculo: { ...base.detalleCalculo, indemnizacionAgravada: montoAgravado, mesesAgravado },
        advertencias,
        requiereRevisionAbogado: false,
      };
    }

    case 'despido_con_justa_causa':
    case 'abandono_de_trabajo':
      return {
        montoTotal: 0,
        detalleCalculo: { motivo: CAUSALES_JUSTA_CAUSA.has(causal) ? 'Sin indemnización — requiere revisión de abogado obligatoria antes de cerrar el registro.' : null },
        advertencias: ['Este cese requiere revisado_por_abogado = true antes de poder cerrarse.'],
        requiereRevisionAbogado: true,
      };

    case 'muerte_del_trabajador':
    case 'muerte_del_empleador': {
      if (causal === 'muerte_del_empleador' && asistente.tipo_vinculo !== 'dependencia') {
        advertencias.push('Esta causal solo aplica cuando el empleador es la familia directamente (vínculo por dependencia), no a prestadora-original.');
      }
      const base = calcularIndemnizacionAntiguedad(asistente, fechaCese, escalasLegales, advertencias);
      const montoTotal = base.monto !== null ? Number((base.monto / 2).toFixed(2)) : null;
      return {
        montoTotal,
        detalleCalculo: { ...base, indemnizacionReducida: 'Mitad de la indemnización por antigüedad' },
        advertencias,
        requiereRevisionAbogado: true,
      };
    }

    default:
      return {
        montoTotal: null,
        detalleCalculo: {},
        advertencias: [`Causal "${causal}" no reconocida.`],
        requiereRevisionAbogado: true,
      };
  }
}
