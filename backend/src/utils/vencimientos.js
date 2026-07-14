import { supabase } from '../db/connection.js';
import { enviarEmailCoordinador } from './email.js';

const EVENTO_VENCIMIENTO_DOCUMENTO = 'vencimiento_documento_asistente';
const DIAS_ANTICIPACION_DEFAULT = 30;

// Revisa vencimientos de los documentos que cada prestadora eligió trackear (catálogo en
// tipos_documento_asistente, configurable por prestadora — ver docs/PENDIENTES.md #18 punto 1,
// backend/src/db/schema_documentos_asistente.sql) y avisa por email al Coordinador según
// docs/PRD_02B_Gestion_Personal.md función 9. Se ejecuta una vez por día (ver server.js).
// Recorre TODAS las prestadoras licenciatarias, no una fija (mismo patrón que
// revisarAusenciasAutomaticas/revisarNotificacionesCoordinador).
export async function revisarVencimientos() {
  const { data: prestadoras, error: errorPrestadoras } = await supabase
    .from('prestadoras')
    .select('id, dias_aviso_vencimiento_documentos')
    .eq('estado', 'certificada');

  if (errorPrestadoras) {
    console.error('Error consultando prestadoras activas:', errorPrestadoras.message);
    return;
  }

  for (const { id: prestadoraId, dias_aviso_vencimiento_documentos: diasAviso } of prestadoras ?? []) {
    const anticipacion = diasAviso ?? DIAS_ANTICIPACION_DEFAULT;
    const limite = new Date();
    limite.setDate(limite.getDate() + anticipacion);
    const limiteISO = limite.toISOString().slice(0, 10);

    const { data: tipos, error: errorTipos } = await supabase
      .from('tipos_documento_asistente')
      .select('id, nombre')
      .eq('prestadora_id', prestadoraId)
      .eq('requiere_vencimiento', true)
      .eq('activo', true);

    if (errorTipos) {
      console.error(`Error consultando catálogo de documentos de ${prestadoraId}:`, errorTipos.message);
      continue;
    }

    for (const { id: tipoDocumentoId, nombre: etiqueta } of tipos ?? []) {
      const { data: documentos, error } = await supabase
        .from('documentos_asistente')
        .select('fecha_vencimiento, asistentes(nombre, estado)')
        .eq('prestadora_id', prestadoraId)
        .eq('tipo_documento_id', tipoDocumentoId)
        .not('fecha_vencimiento', 'is', null)
        .lte('fecha_vencimiento', limiteISO);

      if (error) {
        console.error(`Error consultando vencimientos (${etiqueta}) de ${prestadoraId}:`, error.message);
        continue;
      }

      const activos = (documentos ?? []).filter((d) => d.asistentes?.estado === 'activo');
      if (!activos.length) continue;

      const lista = activos
        .map((d) => `${d.asistentes.nombre}: vence ${d.fecha_vencimiento}`)
        .join('\n');

      try {
        await enviarEmailCoordinador({
          evento: EVENTO_VENCIMIENTO_DOCUMENTO,
          prestadoraId,
          asunto: `Vencimientos próximos de ${etiqueta} — ${activos.length} Asistente(s)`,
          texto: `Los siguientes Asistentes tienen ${etiqueta} vencido o por vencer dentro de ${anticipacion} días:\n\n${lista}`,
        });
      } catch (err) {
        console.error(`Error enviando email de vencimiento (${etiqueta}) de ${prestadoraId}:`, err.message);
      }
    }
  }
}
