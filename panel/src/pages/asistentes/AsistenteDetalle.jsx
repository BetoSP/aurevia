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
const TABS_COORDINADOR = ['perfil', 'verificacion', 'certificado'];

export function AsistenteDetalle() {
  const { t } = useLocale();
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [asistente, setAsistente] = useState(null);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('perfil');

  const recargar = useCallback(async () => {
    setEstado('cargando');
    const { data, error: errorConsulta } = await supabase.from('asistentes').select('*').eq('id', id).single();
    if (errorConsulta) {
      setError(errorConsulta.message);
      setEstado('error');
      return;
    }
    setAsistente(data);
    setEstado('listo');
  }, [id]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  if (estado === 'cargando') return <p className="estado-cargando">{t.comun.cargando}</p>;
  if (estado === 'error') return <p className="estado-vacio">{error || t.comun.error_generico}</p>;

  const esAdmin = esAdminOSuperior(usuario?.rol);

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
