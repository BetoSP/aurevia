import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { useEmpresa } from '../context/EmpresaContext';
import { FormField } from '../components/ui/FormField';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export function Login() {
  const { t } = useLocale();
  const { login, session, usuario } = useAuth();
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  // AuthContext actualiza session/usuario de forma asíncrona (listener
  // onAuthStateChange), no en el mismo tick en que login() resuelve — navegar
  // a "/" inmediatamente después de login() usaba el estado viejo (todavía sin
  // sesión) y ProtectedRoute rebotaba de vuelta acá. Se redirige recién cuando
  // el estado de auth ya está resuelto de verdad.
  useEffect(() => {
    if (session && usuario) {
      navigate('/', { replace: true });
    }
  }, [session, usuario, navigate]);

  async function handleSubmit(evento) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    const { error: errorLogin } = await login(email, password);

    if (errorLogin) {
      setError(t.auth.error_credenciales);
      setEnviando(false);
    }
  }

  return (
    <div className="login-pantalla">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>{t.auth.titulo}</h1>
        <p className="login-subtitulo">{empresa?.nombre ?? ''}</p>

        {error && <Alert variant="error">{error}</Alert>}

        <FormField
          label={t.auth.email}
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label={t.auth.password}
          name="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" disabled={enviando}>
          {enviando ? t.auth.ingresando : t.auth.ingresar}
        </Button>
      </form>
    </div>
  );
}
