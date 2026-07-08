import { useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { useEscalasLegales } from '../../hooks/useEscalasLegales';
import { resolverEscalasVigentes } from '../../lib/escalasLegales';
import { calcularScoreRiesgo, INDICADORES_RIESGO } from '../../lib/scoreRiesgo';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Alert } from '../../components/ui/Alert';

export function ScoreRiesgoTab({ asistente, onActualizado }) {
  const { t } = useLocale();
  const { filas: escalasCrudas, estado } = useEscalasLegales();
  const [indicadores, setIndicadores] = useState(asistente.indicadores_riesgo || {});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const escalasResueltas = estado === 'listo' ? resolverEscalasVigentes(escalasCrudas, new Date().toISOString().slice(0, 10)) : null;
  const { score, advertencias } = escalasResueltas ? calcularScoreRiesgo(indicadores, escalasResueltas) : { score: 0, advertencias: [] };

  async function guardar() {
    setGuardando(true);
    setError(null);
    const { error: errorUpdate } = await supabase.from('asistentes').update({
      indicadores_riesgo: indicadores, score_riesgo_reclasificacion: score,
    }).eq('id', asistente.id);
    setGuardando(false);
    if (errorUpdate) {
      setError(t.comun.error_generico);
      return;
    }
    onActualizado();
  }

  return (
    <div>
      <h2>{t.asistentes.score.titulo}</h2>
      <Alert variant="info">{t.asistentes.score.explicacion}</Alert>
      {error && <Alert variant="error">{error}</Alert>}
      {advertencias.map((a, i) => <Alert key={i} variant="error">{a}</Alert>)}

      {INDICADORES_RIESGO.map((indicador) => (
        <FormField
          key={indicador}
          label={t.asistentes.score.indicadores[indicador]}
          name={indicador}
          type="checkbox"
          checked={Boolean(indicadores[indicador])}
          onChange={(e) => setIndicadores((prev) => ({ ...prev, [indicador]: e.target.checked ? 1 : 0 }))}
        />
      ))}

      <p className="score-riesgo-valor">{t.asistentes.score.resultado}: <strong>{score}</strong> / 100</p>

      {asistente.tipo_vinculo === 'monotributo' && (
        <p className="score-riesgo-nota">
          {score >= 60 ? t.asistentes.score.riesgo_alto : score >= 30 ? t.asistentes.score.riesgo_medio : t.asistentes.score.riesgo_bajo}
        </p>
      )}

      <Button onClick={guardar} disabled={guardando || estado !== 'listo'}>
        {guardando ? t.comun.guardando : t.comun.guardar}
      </Button>
    </div>
  );
}
