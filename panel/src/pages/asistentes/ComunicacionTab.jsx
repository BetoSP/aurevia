import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { EstadoLista } from '../../components/layout/EstadoLista';

export function ComunicacionTab({ asistente }) {
  const { t } = useLocale();
  const { usuario } = useAuth();
  const [mensajes, setMensajes] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const recargar = useCallback(async () => {
    setEstado('cargando');
    setError(null);
    const { data, error: errorConsulta } = await supabase
      .from('mensajes_asistente')
      .select('id, mensaje, created_at, usuario_id, usuarios(nombre)')
      .eq('asistente_id', asistente.id)
      .order('created_at', { ascending: true });

    if (errorConsulta) {
      setError(errorConsulta.message);
      setEstado('error');
      return;
    }
    setMensajes(data ?? []);
    setEstado('listo');
  }, [asistente.id]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    setError(null);
    const { error: errorInsert } = await supabase.from('mensajes_asistente').insert({
      prestadora_id: usuario.prestadora_id,
      asistente_id: asistente.id,
      usuario_id: usuario.id,
      mensaje: texto.trim(),
    });
    setEnviando(false);
    if (errorInsert) {
      setError(t.comun.error_generico);
      return;
    }
    setTexto('');
    recargar();
  }

  return (
    <div>
      <h2>{t.asistentes.comunicacion.titulo}</h2>
      <p className="panel-explicacion">{t.asistentes.comunicacion.explicacion}</p>

      {error && <Alert variant="error">{error}</Alert>}

      <EstadoLista
        estado={estado}
        error={error}
        vacio={estado === 'listo' && mensajes.length === 0}
        recargar={recargar}
        mensajeVacio={t.asistentes.comunicacion.sin_mensajes}
      >
        <div className="panel-chat-hilo">
          {mensajes.map((m) => (
            <div key={m.id} className={`panel-chat-burbuja ${m.usuario_id === usuario.id ? 'panel-chat-burbuja-propia' : ''}`}>
              <div className="panel-chat-burbuja-autor">{m.usuarios?.nombre || '—'}</div>
              <div className="panel-chat-burbuja-texto">{m.mensaje}</div>
              <div className="panel-chat-burbuja-hora">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </EstadoLista>

      <div className="panel-chat-envio">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t.asistentes.comunicacion.placeholder}
          rows={2}
        />
        <Button onClick={enviar} disabled={enviando || !texto.trim()}>
          {enviando ? t.comun.guardando : t.asistentes.comunicacion.enviar}
        </Button>
      </div>
    </div>
  );
}
