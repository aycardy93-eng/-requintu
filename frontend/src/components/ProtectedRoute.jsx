import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, cargandoSesion } = useAuth();

  if (cargandoSesion) {
    return <p style={{ textAlign: 'center', padding: '40px' }}>Restaurando sesión...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
