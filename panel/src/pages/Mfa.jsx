import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { FormField } from '../components/ui/FormField';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

// Ítem H del pendiente #30 — enrolamiento (primera vez) o verificación (sesiones
// siguientes) del segundo factor TOTP. Se llega acá solo si el toggle
// configuracion_plataforma.mfa_admin_obligatorio está en ON y el rol es
// superadmin/admin_plataforma (ver AuthContext.evaluarMfa) — cualquier otro caso, esta
// página redirige de vuelta.
export function Mfa() {
  const { t } = useLocale();
  const { session, usuario, mfaEstado, refrescarMfa, logout } = useAuth();
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState(null);
  const [factorId, setFactorId] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mfaEstado !== 'requiere_enrolamiento') return;
    let activo = true;
    async function iniciarEnrolamiento() {
      const { data, error: errorEnroll } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (!activo) return;
      if (errorEnroll) {
        setError(errorEnroll.message);
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
    }
    iniciarEnrolamiento();
    return () => {
      activo = false;
    };
  }, [mfaEstado]);

  useEffect(() => {
    if (mfaEstado !== 'requiere_challenge') return;
    let activo = true;
    async function ubicarFactor() {
      const { data } = await supabase.auth.mfa.listFactors();
      const factor = data?.totp?.find((f) => f.status === 'verified');
      if (!activo || !factor) return;
      setFactorId(factor.id);
    }
    ubicarFactor();
    return () => {
      activo = false;
    };
  }, [mfaEstado]);

  if (mfaEstado === 'ok' || mfaEstado === 'na') {
    return <Navigate to="/" replace />;
  }

  if (!session || !usuario) {
    return <Navigate to="/login" replace />;
  }

  async function handleVerificar(evento) {
    evento.preventDefault();
    if (!factorId) return;
    setEnviando(true);
    setError(null);

    const { data: challenge, error: errorChallenge } = await supabase.auth.mfa.challenge({ factorId });
    if (errorChallenge) {
      setError(errorChallenge.message);
      setEnviando(false);
      return;
    }

    const { error: errorVerify } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: codigo,
    });

    if (errorVerify) {
      setError(t.auth.mfa_codigo_invalido);
      setEnviando(false);
      return;
    }

    await refrescarMfa();
    setEnviando(false);
    navigate('/', { replace: true });
  }

  async function handleCancelar() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="login-pantalla">
      <form className="login-card" onSubmit={handleVerificar}>
        <h1>{mfaEstado === 'requiere_enrolamiento' ? t.auth.mfa_titulo_enrolar : t.auth.mfa_titulo_verificar}</h1>
        <p className="login-subtitulo">
          {mfaEstado === 'requiere_enrolamiento' ? t.auth.mfa_explicacion_enrolar : t.auth.mfa_explicacion_verificar}
        </p>

        {error && <Alert variant="error">{error}</Alert>}

        {mfaEstado === 'requiere_enrolamiento' && qrCode && (
          <div className="mfa-qr" dangerouslySetInnerHTML={{ __html: qrCode }} />
        )}

        <FormField
          label={t.auth.mfa_codigo}
          name="codigo"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />

        <Button type="submit" disabled={enviando || !factorId}>
          {enviando ? t.auth.mfa_verificando : t.auth.mfa_verificar}
        </Button>
        <Button type="button" variant="secondary" onClick={handleCancelar}>
          {t.auth.mfa_cancelar}
        </Button>
      </form>
    </div>
  );
}
