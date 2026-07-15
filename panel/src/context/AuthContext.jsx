import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

const ROLES_CON_MFA = ['superadmin', 'admin_plataforma'];

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  // Ítem H del pendiente #30: 'na' (no aplica o el toggle está apagado), 'requiere_enrolamiento'
  // (primera vez, sin factor TOTP verificado), 'requiere_challenge' (factor verificado pero
  // esta sesión sigue en aal1), 'ok' (aal2 alcanzado). null mientras se evalúa.
  const [mfaEstado, setMfaEstado] = useState(null);

  async function evaluarMfa(usuarioActual) {
    if (!usuarioActual || !ROLES_CON_MFA.includes(usuarioActual.rol)) {
      setMfaEstado('na');
      return;
    }

    const { data: config } = await supabase.from('configuracion_plataforma').select('mfa_admin_obligatorio').single();
    if (!config?.mfa_admin_obligatorio) {
      setMfaEstado('na');
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal2') {
      setMfaEstado('ok');
      return;
    }

    const { data: factores } = await supabase.auth.mfa.listFactors();
    const factorVerificado = factores?.totp?.find((f) => f.status === 'verified');
    setMfaEstado(factorVerificado ? 'requiere_challenge' : 'requiere_enrolamiento');
  }

  useEffect(() => {
    let activo = true;

    async function cargarSesion() {
      const { data } = await supabase.auth.getSession();
      if (!activo) return;
      setSession(data.session);
      if (data.session) {
        await cargarUsuario(data.session.user.id);
      } else {
        setMfaEstado('na');
        setCargando(false);
      }
    }

    async function cargarUsuario(userId) {
      const { data } = await supabase
        .from('usuarios')
        .select('id, rol, nombre, zonas, prestadora_id')
        .eq('id', userId)
        .single();
      if (!activo) return;
      setUsuario(data ?? null);
      await evaluarMfa(data ?? null);
      if (!activo) return;
      setCargando(false);
    }

    cargarSesion();

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSession(nuevaSesion);
      if (nuevaSesion) {
        cargarUsuario(nuevaSesion.user.id);
      } else {
        setUsuario(null);
        setMfaEstado('na');
        setCargando(false);
      }
    });

    return () => {
      activo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function refrescarMfa() {
    await evaluarMfa(usuario);
  }

  return (
    <AuthContext.Provider value={{ session, usuario, cargando, mfaEstado, login, logout, refrescarMfa }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
