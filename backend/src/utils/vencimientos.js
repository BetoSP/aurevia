import { supabase } from '../db/connection.js';
import { enviarEmailCoordinador } from './email.js';

const DIAS_ANTICIPACION = 30;

const CAMPOS_VENCIMIENTO = [
  { columna: 'vencimiento_monotributo', evento: 'vencimiento_monotributo', etiqueta: 'Monotributo' },
  { columna: 'vencimiento_art', evento: 'vencimiento_art', etiqueta: 'ART' },
  { columna: 'vencimiento_seguro', evento: 'vencimiento_seguro', etiqueta: 'Seguro' },
];

// Revisa vencimientos de Asistentes activos dentro de los próximos 30 días (o ya vencidos) y
// avisa por email según docs/PRD_02B_Gestion_Personal.md función 9. Se ejecuta una vez por
// día (ver server.js) — no hay deduplicación de avisos ya enviados: mientras el vencimiento
// siga dentro de la ventana, se vuelve a avisar en cada corrida, a propósito, para no
// depender de una tabla de "ya avisado" que el PRD no pide.
export async function revisarVencimientos() {
  const limite = new Date();
  limite.setDate(limite.getDate() + DIAS_ANTICIPACION);
  const limiteISO = limite.toISOString().slice(0, 10);

  for (const { columna, evento, etiqueta } of CAMPOS_VENCIMIENTO) {
    const { data: asistentes, error } = await supabase
      .from('asistentes')
      .select(`nombre, ${columna}`)
      .eq('estado', 'activo')
      .not(columna, 'is', null)
      .lte(columna, limiteISO);

    if (error) {
      console.error(`Error consultando vencimientos (${columna}):`, error.message);
      continue;
    }
    if (!asistentes?.length) continue;

    const lista = asistentes
      .map((a) => `${a.nombre}: vence ${a[columna]}`)
      .join('\n');

    try {
      await enviarEmailCoordinador({
        evento,
        asunto: `Vencimientos próximos de ${etiqueta} — ${asistentes.length} Asistente(s)`,
        texto: `Los siguientes Asistentes tienen ${etiqueta} vencido o por vencer dentro de ${DIAS_ANTICIPACION} días:\n\n${lista}`,
      });
    } catch (err) {
      console.error(`Error enviando email de vencimiento (${columna}):`, err.message);
    }
  }
}
