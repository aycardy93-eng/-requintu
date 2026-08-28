import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { API_URL } from '../config';

export const AuthContext = createContext();

function decodificarToken(token) {
  try {
    const payload = token?.split('.')[1];
    if (!payload) return null;

    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');

    const bytes = Uint8Array.from(atob(base64), (caracter) => caracter.charCodeAt(0));
    const usuario = JSON.parse(new TextDecoder().decode(bytes));

    if (usuario.exp && usuario.exp * 1000 <= Date.now()) {
      return null;
    }

    return usuario;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const usuario = useMemo(() => decodificarToken(token), [token]);

  // Renueva el access token con la cookie httpOnly. Se usa tanto al montar
  // como para mantener la sesión viva mientras el usuario navega.
  const refrescarToken = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.token) {
        setToken(data.token);
        return data.token;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Al montar, restaura la sesión con la cookie httpOnly (el access token
  // vive solo en memoria: nunca se guarda en localStorage ni cookies legibles).
  useEffect(() => {
    let cancelado = false;

    refrescarToken()
      .then((nuevoToken) => {
        if (cancelado) return;
        if (!nuevoToken) setCargandoSesion(false);
      })
      .finally(() => {
        if (!cancelado) setCargandoSesion(false);
      });

    return () => {
      cancelado = true;
    };
  }, [refrescarToken]);

  // Renueva el token 5 minutos antes de que expire, evitando el error
  // "Token inválido o expirado" en sesiones largas sin recargar la página.
  useEffect(() => {
    if (!usuario?.exp) return;

    const milisHastaRenovar = Math.max(0, usuario.exp * 1000 - Date.now() - 5 * 60 * 1000);
    if (milisHastaRenovar <= 0) {
      refrescarToken();
      return;
    }

    const temporizador = setTimeout(refrescarToken, milisHastaRenovar);
    return () => clearTimeout(temporizador);
  }, [usuario?.exp, refrescarToken]);

  const login = (nuevoToken) => setToken(nuevoToken);

  const logout = async () => {
    setToken(null);
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    }).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{ token, usuario, cargandoSesion, login, logout, isAuthenticated: !!usuario }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
