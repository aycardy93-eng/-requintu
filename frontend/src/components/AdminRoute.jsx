import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

function AdminRoute({ children }) {
  const { isAuthenticated, usuario, cargandoSesion } = useAuth();
  const { t } = useTranslation();

  if (cargandoSesion) {
    return <p style={{ textAlign: 'center', padding: '40px' }}>{t('common.restaurandoSesion')}</p>;
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