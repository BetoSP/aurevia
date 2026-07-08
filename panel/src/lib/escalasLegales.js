// Resuelve, para una fecha del hecho dada, qué fila de `escalas_legales` está vigente
// por cada (tipo, categoria). Regla crítica de CLAUDE.md/PRD_02B: siempre por
// vigencia_desde <= fechaHecho <= vigencia_hasta (o vigencia_hasta NULL), nunca por la
// fecha actual del sistema.
export function resolverEscalasVigentes(filasEscalasLegales, fechaHecho) {
  const fecha = new Date(fechaHecho);
  const resueltas = new Map();

  for (const fila of filasEscalasLegales) {
    const desde = new Date(fila.vigencia_desde);
    const hasta = fila.vigencia_hasta ? new Date(fila.vigencia_hasta) : null;
    const vigente = desde <= fecha && (!hasta || hasta >= fecha);
    if (!vigente) continue;

    const clave = `${fila.tipo}::${fila.categoria ?? ''}`;
    const actual = resueltas.get(clave);
    if (!actual || new Date(actual.vigencia_desde) < desde) {
      resueltas.set(clave, fila);
    }
  }

  return resueltas;
}

export function obtenerValorEscala(escalasResueltas, tipo, categoria = '') {
  const fila = escalasResueltas.get(`${tipo}::${categoria}`);
  return fila ? Number(fila.valor) : null;
}
