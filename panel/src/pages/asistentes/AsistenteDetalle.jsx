import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocale } from '../../i18n/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { esAdminOSuperior } from '../../lib/roles';
import { supabase } from '../../lib/supabaseClient';
import { PerfilTab } from './PerfilTab';
import { VerificacionTab } from './VerificacionTab';
import { CertificadoTab } from './CertificadoTab';
import { VinculoCeseTab } from './VinculoCeseTab';
import { SimuladorVinculoTab } from './SimuladorVinculoTab';
import { ScoreRiesgoTab } from './ScoreRiesgoTab';
import { AusenciasCoberturaTab } from './AusenciasCoberturaTab';

const TABS = ['perfil', 'verificacion', 'certificado', 'vinculo_cese', 'simulador', 'score_riesgo', 'ausencias'];
// Ausencias y Cobertura es operativo (tipo/fechas/sustituto), no datos laborales sensibles —
// Coordinador ya tiene RLS de zona sobre "ausencias"/"guardias_cobertura" (schema_etapa2i.sql),
// así que el tab estaba vetado en el frontend sin motivo, dejando una función habilitada en
// el backend pero inalcanzable desde la UI.
const TABS_COORDINADOR = ['perfil', 'verificacion', 'certificado', 'ausencias'];

export function AsistenteDetalle() {
  const { t } = useLocale();
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [asistente, setAsistente] = useState(null);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('perfil');

  const esAdmin = esAdminOSuperior(usuario?.rol);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    // Coordinador consulta la vista restringida (sin sueldo/causal de cese/vínculo laboral) —
    // ver schema_etapa2i.sql. RLS es row-level, no column-level, así que la restricción de
    // columnas se resuelve acá, no solo ocultando tabs/campos en el frontend.
    const tabla = esAdmin ? 'asistentes' : 'asistentes_coordinador';
    const { data, error: errorConsulta } = await supabase.from(tabla).select('*').eq('id', id).single();
    if (errorConsulta) {
      setError(errorConsulta.code === 'PGRST116' ? null : errorConsulta.message);
      setEstado(errorConsulta.code === 'PGRST116' ? 'no_encontrado' : 'error');
      return;
    }
    setAsistente(data);
    setEstado('listo');
  }, [id, esAdmin]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  if (estado === 'cargando') return <p className="estado-cargando">{t.comun.cargando}</p>;
  if (estado === 'no_encontrado') return <p className="estado-vacio">{t.comun.no_encontrado}</p>;
  if (estado === 'error') return <p className="estado-vacio">{error || t.comun.error_generico}</p>;

  return (
    <div>
      <button className="link-volver" onClick={() => navigate('/asistentes')}>← {t.asistentes.volver_al_plantel}</button>
      <h1>{asistente.nombre}</h1>

      <div className="panel-tabs">
        {(esAdmin ? TABS : TABS_COORDINADOR).map((tabId) => (
          <button
            key={tabId}
            className={`panel-tab ${tab === tabId ? 'panel-tab-activo' : ''}`}
            onClick={() => setTab(tabId)}
          >
            {t.asistentes.tabs[tabId]}
          </button>
        ))}
      </div>

      <div className="panel-tab-contenido">
        {tab === 'perfil' && <PerfilTab asistente={asistente} onActualizado={recargar} />}
        {tab === 'verificacion' && <VerificacionTab asistente={asistente} />}
        {tab === 'certificado' && <CertificadoTab asistente={asistente} />}
        {tab === 'vinculo_cese' && esAdmin && <VinculoCeseTab asistente={asistente} onActualizado={recargar} />}
        {tab === 'simulador' && esAdmin && <SimuladorVinculoTab asistente={asistente} />}
        {tab === 'score_riesgo' && esAdmin && <ScoreRiesgoTab asistente={asistente} onActualizado={recargar} />}
        {tab === 'ausencias' && esAdmin && <AusenciasCoberturaTab asistente={asistente} />}
      </div>
    </div>
  );
}
