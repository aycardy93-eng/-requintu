import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.jpeg';

export default function Navbar() {
  const { isAuthenticated, usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuAbierto(false);
    navigate('/login');
  };

  const nombreUsuario = usuario?.nombre || usuario?.email || 'Usuario';

  const navLinkStyle = {
    color: '#ccff00',
    textDecoration: 'none',
    fontWeight: 'bold',
    padding: '8px 0',
    display: 'block',
  };

  return (
    <nav style={{
      backgroundColor: '#38bdf8',
      color: '#ccff00',
      fontFamily: 'sans-serif',
      position: 'relative',
      zIndex: 100,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
      }}>
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          color: '#ccff00',
        }}>
          <img src={logoImg} alt="Logo" style={{
            width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover',
          }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase' }}>REQUINTU</div>
            <div style={{ fontSize: '10px', opacity: 0.85 }}>Turismo en Colombia</div>
          </div>
        </Link>

        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label="Menu"
          style={{
            background: 'none',
            border: 'none',
            color: '#ccff00',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px 8px',
            lineHeight: 1,
            display: 'none',
          }}
          className="menu-hamburger"
        >
          {menuAbierto ? '✕' : '☰'}
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginLeft: 'auto',
        }}
          className="nav-links-desktop"
        >
          <Link to="/locales" style={navLinkStyle}>Locales</Link>
          <Link to="/publicaciones" style={navLinkStyle}>Publicaciones</Link>
          {isAuthenticated && <Link to="/mapa" style={navLinkStyle}>Mapa</Link>}
          {isAuthenticated ? (
            <>
              <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>
                Hola, {nombreUsuario}
              </span>
              <button onClick={handleLogout} style={{
                backgroundColor: '#ccff00', color: '#0284c7', border: 'none',
                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
              }}>Cerrar sesion</button>
            </>
          ) : (
            <Link to="/login" style={{
              backgroundColor: '#ccff00', color: '#0284c7', padding: '8px 16px',
              borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold',
            }}>Iniciar / Registrarse</Link>
          )}
        </div>
      </div>

      {menuAbierto && (
        <div style={{
          padding: '10px 20px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          borderTop: '1px solid rgba(255,255,255,0.2)',
        }} className="nav-menu-mobile">
          <Link to="/locales" onClick={() => setMenuAbierto(false)} style={navLinkStyle}>Locales</Link>
          <Link to="/publicaciones" onClick={() => setMenuAbierto(false)} style={navLinkStyle}>Publicaciones</Link>
          {isAuthenticated && (
            <Link to="/mapa" onClick={() => setMenuAbierto(false)} style={navLinkStyle}>Mapa</Link>
          )}
          {isAuthenticated ? (
            <>
              <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px', padding: '8px 0' }}>
                Hola, {nombreUsuario}
              </span>
              <button onClick={handleLogout} style={{
                backgroundColor: '#ccff00', color: '#0284c7', border: 'none',
                padding: '10px 16px', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', marginTop: '4px', width: '100%',
              }}>Cerrar sesion</button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMenuAbierto(false)} style={{
              backgroundColor: '#ccff00', color: '#0284c7', padding: '10px 16px',
              borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold',
              textAlign: 'center', marginTop: '4px', display: 'block',
            }}>Iniciar / Registrarse</Link>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .menu-hamburger { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
