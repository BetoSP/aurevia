import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useLocale } from '../../i18n/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { useEmpresa } from '../../context/EmpresaContext';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { EstadoLista } from '../../components/layout/EstadoLista';

export function CertificadoTab({ asistente }) {
  const { t } = useLocale();
  const { usuario } = useAuth();
  const { empresa } = useEmpresa();
  const siteUrl = import.meta.env.VITE_SITE_URL || (empresa?.dominio ? `https://${empresa.dominio}` : '');
  const [certificado, setCertificado] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [emitiendo, setEmitiendo] = useState(false);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    const { data, error: errorConsulta } = await supabase
      .from('certificados')
      .select('*')
      .eq('asistente_id', asistente.id)
      .order('fecha_emision', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (errorConsulta) {
      setError(errorConsulta.message);
      setEstado('error');
      return;
    }
    setCertificado(data);
    if (data && siteUrl) {
      const url = `${siteUrl}/asistente/${asistente.qr_token}`;
      setQrDataUrl(await QRCode.toDataURL(url, { width: 280, margin: 1 }));
    }
    setEstado('listo');
  }, [asistente.id, asistente.qr_token, siteUrl]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function emitirCertificado() {
    setEmitiendo(true);
    setError(null);
    const { error: errorInsert } = await supabase.from('certificados').insert({
      prestadora_id: usuario.prestadora_id,
      asistente_id: asistente.id,
      fecha_emision: new Date().toISOString().slice(0, 10),
    });
    setEmitiendo(false);
    if (errorInsert) {
      setError(t.comun.error_generico);
      return;
    }
    recargar();
  }

  const etapasCompletas = asistente.estado === 'activo';

  return (
    <div>
      <h2>{t.asistentes.certificado.titulo}</h2>
      <p className="panel-explicacion">{t.asistentes.certificado.explicacion}</p>
      {error && <Alert variant="error">{error}</Alert>}

      <EstadoLista estado={estado} error={error} vacio={false} recargar={recargar}>
        {certificado ? (
          <div className="panel-card-verificacion">
            <p>
              <span className={`badge ${certificado.activo ? 'badge-aprobado' : 'badge-rechazado'}`}>
                {certificado.activo ? t.asistentes.certificado.estado_activo : t.asistentes.certificado.estado_inactivo}
              </span>
            </p>
            <p>{t.asistentes.certificado.fecha_emision}: {new Date(certificado.fecha_emision).toLocaleDateString()}</p>
            {certificado.fecha_vencimiento && (
              <p>{t.asistentes.certificado.fecha_vencimiento}: {new Date(certificado.fecha_vencimiento).toLocaleDateString()}</p>
            )}
            {qrDataUrl && (
              <>
                <img src={qrDataUrl} alt={t.asistentes.certificado.titulo} width={280} height={280} />
                <div>
                  <a href={qrDataUrl} download={`certificado-${asistente.id}.png`}>
                    <Button variant="secondary">{t.asistentes.certificado.descargar_qr}</Button>
                  </a>
                </div>
              </>
            )}
            <p className="panel-explicacion">{t.asistentes.certificado.nota_pagina_publica}</p>
          </div>
        ) : (
          <div>
            {!etapasCompletas && <Alert variant="info">{t.asistentes.certificado.requiere_activo}</Alert>}
            <Button onClick={emitirCertificado} disabled={emitiendo || !etapasCompletas}>
              {emitiendo ? t.comun.guardando : t.asistentes.certificado.emitir}
            </Button>
          </div>
        )}
      </EstadoLista>
    </div>
  );
}
