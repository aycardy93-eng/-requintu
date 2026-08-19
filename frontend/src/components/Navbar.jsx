import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 30px',
        backgroundColor: '#1b5e3a',
        color: 'white',
        fontFamily: 'sans-serif',
      }}
    >
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'white' }}>
        <span style={{ fontSize: '20px' }}>📍</span>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '18px' }}>Requintu</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Turismo en Colombia</div>
        </div>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link to="/locales" style={{ color: 'white', textDecoration: 'none' }}>
          Locales
        </Link>
<Link to="/publicaciones" style={{ color: 'white', textDecoration: 'none' }}>
          Publicaciones
        </Link>

        {isAuthenticated && (
          <Link to="/crear-local" style={{ color: 'white', textDecoration: 'none' }}>
            Crear local
          </Link>
        )}
        {isAuthenticated && (
          <Link to="/perfil" style={{ color: 'white', textDecoration: 'none' }}>
            Mi perfil
          </Link>
        )}
        
        

        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: 'white',
              color: '#1b5e3a',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Cerrar sesión
          </button>
        ) : (
          <Link
            to="/login"
            style={{
              padding: '8px 16px',
              backgroundColor: 'white',
              color: '#1b5e3a',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 'bold',
            }}
          >
            Entrar / Registrarse
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
