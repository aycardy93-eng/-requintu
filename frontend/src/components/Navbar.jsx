import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.jpeg';

export default function Navbar() {
  const { isAuthenticated, usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const nombreUsuario = usuario?.nombre || usuario?.email || 'Usuario';

  return (
    <nav
      style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        padding: '15px 30px',
        backgroundColor: '#38bdf8',
        color: '#ccff00',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Brand / Logo (Izquierda) */}
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textDecoration: 'none',
          color: '#ccff00',
        }}
      >
        <img
          src={logoImg}
          alt="Logo Requintu"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#ccff00', textTransform: 'uppercase' }}>
            REQUINTU
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9, color: '#ccff00' }}>Turismo en Colombia</div>
        </div>
      </Link>

      {/* Todo el menú empujado a la Derecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: 'auto' }}>
        <Link to="/locales" style={{ color: '#ccff00', textDecoration: 'none', fontWeight: 'bold' }}>
          Locales
        </Link>
        <Link to="/publicaciones" style={{ color: '#ccff00', textDecoration: 'none', fontWeight: 'bold' }}>
          Publicaciones
        </Link>

        {isAuthenticated ? (
          <>
            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>
              Hola, {nombreUsuario}
            </span>

            <button
              onClick={handleLogout}
              style={{
                backgroundColor: '#ccff00',
                color: '#0284c7',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <Link
            to="/login"
            style={{
              backgroundColor: '#ccff00',
              color: '#0284c7',
              padding: '8px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 'bold',
            }}
          >
            Iniciar / Registrarse
          </Link>
        )}
      </div>
    </nav>
  );
}