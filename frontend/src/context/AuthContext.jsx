import { createContext, useContext, useState, useEffect, useMemo } from 'react';
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

  // Al montar, restaura la sesión con la cookie httpOnly (el access token
  // vive solo en memoria: nunca se guarda en localStorage ni cookies legibles).
  useEffect(() => {
    let cancelado = false;

    fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelado && data?.token) {
          setToken(data.token);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setCargandoSesion(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

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
