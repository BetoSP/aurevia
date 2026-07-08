import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/ui/FormField';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export function Login() {
  const { t } = useLocale();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

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
        <p className="login-subtitulo">{t.auth.subtitulo}</p>

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
