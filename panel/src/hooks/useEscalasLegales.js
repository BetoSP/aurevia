import { useSupabaseTable } from './useSupabaseTable';

// Trae todas las filas de escalas_legales (tabla chica, versionada) — la resolución por
// fecha del hecho se hace después con resolverEscalasVigentes, nunca acá.
export function useEscalasLegales() {
  return useSupabaseTable('escalas_legales', { orderBy: 'created_at' });
}
