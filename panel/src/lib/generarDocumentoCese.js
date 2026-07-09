import { jsPDF } from 'jspdf';

// Función 7 de docs/PRD_02B_Gestion_Personal.md — generador de documentación.
// Cada función arma un jsPDF a partir de datos ya calculados (nunca inventa montos ni
// texto legal nuevo — regla 10 de CLAUDE.md), y devuelve el documento sin descargarlo.
// La descarga la dispara el caller vía descargarPDF().

const MARGEN = 20;
const ANCHO_UTIL = 170;

const DISCLAIMER_LEGAL =
  'Documento generado automáticamente por el sistema prestadora-original a partir de los datos cargados. ' +
  'Debe ser revisado por un abogado laboralista antes de su entrega o uso formal — no reemplaza ' +
  'el asesoramiento legal profesional.';

function nuevoDocumento() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'normal');
  return doc;
}

function encabezado(doc, titulo) {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('prestadora-original SALUD', MARGEN, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(titulo, MARGEN, 28);
  doc.setDrawColor(180);
  doc.line(MARGEN, 32, MARGEN + ANCHO_UTIL, 32);
  return 42;
}

function parrafo(doc, texto, y, opciones = {}) {
  doc.setFontSize(opciones.tamano || 10);
  doc.setFont('helvetica', opciones.negrita ? 'bold' : 'normal');
  const lineas = doc.splitTextToSize(texto, ANCHO_UTIL);
  doc.text(lineas, MARGEN, y);
  return y + lineas.length * 5 + (opciones.espacioExtra ?? 4);
}

function piePagina(doc) {
  const alturaPagina = doc.internal.pageSize.getHeight();
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120);
  const lineas = doc.splitTextToSize(DISCLAIMER_LEGAL, ANCHO_UTIL);
  doc.text(lineas, MARGEN, alturaPagina - 20);
  doc.setTextColor(0);
}

function formatoFecha(fecha) {
  return fecha ? new Date(fecha).toLocaleDateString('es-AR') : '—';
}

function formatoMonto(monto) {
  return monto === null || monto === undefined
    ? 'A definir (cálculo manual)'
    : `$${Number(monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

// --- Liquidación final -------------------------------------------------------

export function generarLiquidacionFinal({ asistente, cese, causalLabel }) {
  const doc = nuevoDocumento();
  let y = encabezado(doc, 'Liquidación final');

  y = parrafo(doc, `Asistente: ${asistente.nombre}`, y, { negrita: true });
  y = parrafo(doc, `DNI: ${asistente.dni ?? '—'}`, y);
  y = parrafo(doc, `Fecha de alta: ${formatoFecha(asistente.fecha_alta)}`, y);
  y = parrafo(doc, `Fecha de cese: ${formatoFecha(cese.fecha_cese)}`, y);
  y = parrafo(doc, `Causal: ${causalLabel}`, y, { espacioExtra: 8 });

  y = parrafo(doc, 'Detalle del cálculo', y, { negrita: true, tamano: 11 });
  const detalle = cese.detalle_calculo || {};
  Object.entries(detalle).forEach(([clave, valor]) => {
    if (valor === null || valor === undefined) return;
    const etiqueta = clave.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
    y = parrafo(doc, `${etiqueta}: ${valor}`, y, { espacioExtra: 2 });
  });

  y += 6;
  y = parrafo(doc, `Monto total: ${formatoMonto(cese.monto_total)}`, y, { negrita: true, tamano: 12, espacioExtra: 10 });

  if (!cese.revisado_por_abogado) {
    doc.setTextColor(180, 40, 40);
    y = parrafo(doc, 'ADVERTENCIA: este cese todavía no fue marcado como revisado por un abogado laboralista.', y, { negrita: true });
    doc.setTextColor(0);
  }

  piePagina(doc);
  return doc;
}

// --- Telegrama de notificación de cese ---------------------------------------

export function generarTelegramaCese({ asistente, cese, causalLabel }) {
  const doc = nuevoDocumento();
  let y = encabezado(doc, 'Telegrama de notificación de cese');

  y = parrafo(doc, `Fecha: ${formatoFecha(new Date())}`, y);
  y = parrafo(doc, `Destinatario: ${asistente.nombre} (DNI ${asistente.dni ?? '—'})`, y, { espacioExtra: 8 });

  const texto = `Por la presente se notifica la extinción del contrato de trabajo con fecha ` +
    `${formatoFecha(cese.fecha_cese)}, con la causal "${causalLabel}". ` +
    `[Completar aquí el texto formal correspondiente a la causal, con la asistencia de un ` +
    `abogado laboralista — este documento es un borrador estructurado, no un texto legal final.]`;
  y = parrafo(doc, texto, y, { espacioExtra: 10 });

  piePagina(doc);
  return doc;
}

// --- Notificación de fin de período de prueba ---------------------------------

export function generarNotificacionFinPeriodoPrueba({ asistente, cese }) {
  const doc = nuevoDocumento();
  let y = encabezado(doc, 'Notificación de fin de período de prueba');

  y = parrafo(doc, `Asistente: ${asistente.nombre} (DNI ${asistente.dni ?? '—'})`, y);
  y = parrafo(doc, `Fecha de alta: ${formatoFecha(asistente.fecha_alta)}`, y);
  y = parrafo(doc, `Fecha de cese: ${formatoFecha(cese.fecha_cese)}`, y, { espacioExtra: 8 });

  const texto = 'Se notifica la finalización del vínculo dentro del período de prueba vigente, ' +
    'sin generar derecho a indemnización, conforme a la normativa aplicable.';
  y = parrafo(doc, texto, y, { espacioExtra: 10 });

  piePagina(doc);
  return doc;
}

// --- Certificado de trabajo (general, no ligado a un cese) -------------------

export function generarCertificadoTrabajo({ asistente }) {
  const doc = nuevoDocumento();
  let y = encabezado(doc, 'Certificado de trabajo');

  y = parrafo(doc, `Se certifica que ${asistente.nombre} (DNI ${asistente.dni ?? '—'}) ` +
    `se encuentra/estuvo vinculado/a con prestadora-original Salud como Asistente Integral, ` +
    `bajo la modalidad de ${asistente.tipo_vinculo === 'dependencia' ? 'relación de dependencia' : 'monotributo'}, ` +
    `desde el ${formatoFecha(asistente.fecha_alta)}` +
    `${asistente.fecha_baja ? ` hasta el ${formatoFecha(asistente.fecha_baja)}` : ''}.`, y, { espacioExtra: 10 });

  piePagina(doc);
  return doc;
}

// --- Certificado de remuneraciones y servicios --------------------------------

export function generarCertificadoRemuneracionesServicios({ asistente }) {
  const doc = nuevoDocumento();
  let y = encabezado(doc, 'Certificado de remuneraciones y servicios');

  y = parrafo(doc, `Asistente: ${asistente.nombre} (DNI ${asistente.dni ?? '—'})`, y);
  y = parrafo(doc, `Modalidad de vínculo: ${asistente.tipo_vinculo === 'dependencia' ? 'Relación de dependencia' : 'Monotributo'}`, y);
  if (asistente.tipo_vinculo === 'dependencia') {
    y = parrafo(doc, `Categoría CCT: ${asistente.categoria_cct ?? '—'}`, y);
    y = parrafo(doc, `Sueldo básico: ${formatoMonto(asistente.sueldo_basico)}`, y);
  } else {
    y = parrafo(doc, `Valor hora: ${formatoMonto(asistente.valor_hora)}`, y);
    y = parrafo(doc, `Horas semanales: ${asistente.horas_semanales ?? '—'}`, y);
  }
  y = parrafo(doc, `Período: ${formatoFecha(asistente.fecha_alta)} — ${asistente.fecha_baja ? formatoFecha(asistente.fecha_baja) : 'actualidad'}`, y, { espacioExtra: 10 });

  piePagina(doc);
  return doc;
}

// --- Constancia de ausencia justificada ---------------------------------------

export function generarConstanciaAusencia({ asistente, ausencia, tipoLabel }) {
  const doc = nuevoDocumento();
  let y = encabezado(doc, 'Constancia de ausencia justificada');

  y = parrafo(doc, `Asistente: ${asistente.nombre} (DNI ${asistente.dni ?? '—'})`, y);
  y = parrafo(doc, `Tipo de ausencia: ${tipoLabel}`, y);
  y = parrafo(doc, `Desde: ${formatoFecha(ausencia.fecha_inicio)}`, y);
  y = parrafo(doc, `Hasta: ${ausencia.fecha_fin ? formatoFecha(ausencia.fecha_fin) : 'en curso'}`, y);
  if (ausencia.dias_computados !== null && ausencia.dias_computados !== undefined) {
    y = parrafo(doc, `Días computados: ${ausencia.dias_computados}`, y);
  }
  if (ausencia.observaciones) {
    y = parrafo(doc, `Observaciones: ${ausencia.observaciones}`, y, { espacioExtra: 8 });
  }

  piePagina(doc);
  return doc;
}

// --- Descarga compartida -------------------------------------------------------

export function descargarPDF(doc, nombreArchivo) {
  doc.save(nombreArchivo);
}
