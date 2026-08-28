import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminRoute({ children }) {
  const { isAuthenticated, usuario, cargandoSesion } = useAuth();

  if (cargandoSesion) {
    return <p style={{ textAlign: 'center', padding: '40px' }}>Restaurando sesión...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (usuario?.rol !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;