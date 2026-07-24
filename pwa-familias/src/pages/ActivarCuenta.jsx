import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleContext';

const API_URL = import.meta.env.VITE_API_URL;

export default function ActivarCuenta() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [activada, setActivada] = useState(false);

  async function alEnviar(evento) {
    evento.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t.auth.activar_password_corta);
      return;
    }
    if (password !== confirmacion) {
      setError(t.auth.activar_no_coincide);
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/activar-cuenta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error);
      }
      setActivada(true);
    } catch (err) {
      setError(
        err.message === 'token_vencido' || err.message === 'token_ya_usado' || err.message === 'token_invalido'
          ? t.auth.activar_token_invalido
          : t.auth.activar_error,
      );
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <div className="login-pantalla">
        <div className="login-card">
          <h1>{t.auth.activar_titulo}</h1>
          <div className="alert alert-error">{t.auth.activar_token_invalido}</div>
        </div>
      </div>
    );
  }

  if (activada) {
    return (
      <div className="login-pantalla">
        <div className="login-card">
          <h1>{t.auth.activar_titulo}</h1>
          <div className="alert alert-info">{t.auth.activar_exito}</div>
          <Link to="/login" className="btn btn-primary btn-full">{t.auth.ingresar}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-pantalla">
      <div className="login-card">
        <h1>{t.auth.activar_titulo}</h1>
        <p className="login-subtitulo">{t.auth.activar_subtitulo}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={alEnviar}>
          <div className="form-field">
            <label htmlFor="password">{t.auth.activar_password_nueva}</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="confirmacion">{t.auth.activar_password_confirmar}</label>
            <input
              id="confirmacion"
              type="password"
              autoComplete="new-password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={enviando}>
            {enviando ? t.auth.activar_enviando : t.auth.activar_confirmar}
          </button>
        </form>
      </div>
    </div>
  );
}
