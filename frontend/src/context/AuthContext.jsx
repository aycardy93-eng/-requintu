import { createContext, useContext, useState, useEffect, useMemo } from 'react';

// Línea 3 de src/context/AuthContext.jsx:
export const AuthContext = createContext();

// Lee el payload de un JWT en formato Base64URL. La seguridad real siempre se valida en el backend.
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
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const usuario = useMemo(() => decodificarToken(token), [token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const login = (nuevoToken) => setToken(nuevoToken);
  const logout = () => setToken(null);

  return (
    <AuthContext.Provider value={{ token, usuario, login, logout, isAuthenticated: !!usuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
