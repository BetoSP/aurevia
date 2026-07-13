import { supabase } from '../db/connection.js';

// Detección automática de ausencia (pendiente #20 de docs/PENDIENTES.md, diseñado con el
// Desarrollador el 2026-07-12): reemplaza al botón manual "marcar ausente" de
// GuardiaAcciones.jsx como mecanismo principal — el botón queda como excepción/override
// para casos que este proceso no haya detectado solo. Corre cada pocos minutos (ver
// server.js) porque, a diferencia de revisarVencimientos (una vez por día alcanza), acá el
// margen de tolerancia se mide en minutos.
//
// Usa el service role (bypassa RLS) porque procesa guardias de todas las prestadoras según
// su propia configuración — no hay un usuario de panel logueado en este proceso.
export async function revisarAusenciasAutomaticas() {
  const { data: configuraciones, error: errorConfig } = await supabase
    .from('configuracion_ausencia_automatica')
    .select('prestadora_id, minutos_tolerancia_checkin')
    .eq('activo', true);

  if (errorConfig) {
    console.error('Error consultando configuracion_ausencia_automatica:', errorConfig.message);
    return;
  }
  if (!configuraciones?.length) return;

  const ahora = new Date();

  for (const { prestadora_id: prestadoraId, minutos_tolerancia_checkin: minutosTolerancia } of configuraciones) {
    const { data: guardias, error: errorGuardias } = await supabase
      .from('guardias')
      .select('id, paciente_id, fecha, hora_inicio')
      .eq('prestadora_id', prestadoraId)
      .eq('estado', 'programada')
      .is('checkin_at', null);

    if (errorGuardias) {
      console.error(`Error consultando guardias vencidas (prestadora ${prestadoraId}):`, errorGuardias.message);
      continue;
    }

    for (const guardia of guardias ?? []) {
      const inicioEsperado = new Date(`${guardia.fecha}T${guardia.hora_inicio}`);
      const limiteAusencia = new Date(inicioEsperado.getTime() + minutosTolerancia * 60_000);
      if (ahora < limiteAusencia) continue;

      await marcarAusenteYCrearIncidente({ guardia, prestadoraId });
    }
  }
}

// Misma lógica que handleMarcarAusente en panel/src/pages/guardias/GuardiaAcciones.jsx:
// busca si había un Asistente de la prestadora cubriendo justo
// antes, el mismo día, para este Paciente. Si no hay ninguna, es "Ausente sin relevo
// previo" (glosario de CLAUDE.md) y guardia_saliente_id queda NULL.
async function marcarAusenteYCrearIncidente({ guardia, prestadoraId }) {
  const { error: errorUpdate } = await supabase
    .from('guardias')
    .update({ estado: 'ausente' })
    .eq('id', guardia.id);
  if (errorUpdate) {
    console.error(`Error marcando ausente automático (guardia ${guardia.id}):`, errorUpdate.message);
    return;
  }

  const { data: candidatas, error: errorCandidatas } = await supabase
    .from('guardias')
    .select('id, hora_fin')
    .eq('paciente_id', guardia.paciente_id)
    .eq('fecha', guardia.fecha)
    .neq('estado', 'cancelada')
    .neq('id', guardia.id)
    .lte('hora_fin', guardia.hora_inicio)
    .order('hora_fin', { ascending: false })
    .limit(1);
  if (errorCandidatas) {
    console.error(`Error buscando guardia saliente (guardia ${guardia.id}):`, errorCandidatas.message);
  }

  const { error: errorIncidente } = await supabase.from('incidentes_relevo').insert({
    prestadora_id: prestadoraId,
    guardia_saliente_id: candidatas?.[0]?.id ?? null,
    guardia_entrante_id: guardia.id,
    nivel_actual: 1,
  });
  if (errorIncidente) {
    console.error(`Error creando incidente de relevo automático (guardia ${guardia.id}):`, errorIncidente.message);
  }
}
