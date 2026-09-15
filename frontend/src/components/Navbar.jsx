import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.jpeg';
import banderaEs from '../assets/bandera-es.png';
import banderaUs from '../assets/bandera-us.png';

export default function Navbar() {
  const { isAuthenticated, usuario, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuAbierto(false);
    navigate('/login');
  };

  const cambiarIdioma = (idioma) => {
    try {
      localStorage.setItem('requintu_idioma', idioma);
    } catch { /* almacenamiento no disponible */ }
    i18n.changeLanguage(idioma);
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
      backgroundColor: '#12283d',
      color: '#ccff00',
      fontFamily: 'sans-serif',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
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
            <div style={{ fontSize: '10px', opacity: 0.85 }}>{t('nav.turismoColombia')}</div>
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
          <Link to="/locales" style={navLinkStyle}>{t('nav.locales')}</Link>
          <Link to="/publicaciones" style={navLinkStyle}>{t('nav.publicaciones')}</Link>
          {isAuthenticated && <Link to="/mapa" style={navLinkStyle}>{t('nav.mapa')}</Link>}
          {usuario?.rol === 'admin' && <Link to="/admin" style={navLinkStyle}>{t('nav.admin')}</Link>}
          <div style={{
            display: 'flex',
            gap: '2px',
            alignItems: 'center',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: '6px',
            padding: '2px',
          }}>
            <button
              onClick={() => cambiarIdioma('es')}
              aria-label={t('nav.cambiarIdioma')}
              aria-pressed={i18n.language === 'es'}
              title={t('nav.cambiarIdioma')}
              style={{
                background: i18n.language === 'es' ? 'rgba(204,255,0,0.18)' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <img src={banderaEs} alt="Español" style={{
                width: '24px',
                height: '16px',
                objectFit: 'cover',
                borderRadius: '2px',
                display: 'block',
              }} />
            </button>
            <button
              onClick={() => cambiarIdioma('en')}
              aria-label={t('nav.cambiarIdioma')}
              aria-pressed={i18n.language === 'en'}
              title={t('nav.cambiarIdioma')}
              style={{
                background: i18n.language === 'en' ? 'rgba(204,255,0,0.18)' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <img src={banderaUs} alt="English" style={{
                width: '24px',
                height: '16px',
                objectFit: 'cover',
                borderRadius: '2px',
                display: 'block',
              }} />
            </button>
          </div>
          {isAuthenticated ? (
            <>
              <span style={{ color: '#e2f3ff', fontWeight: 'bold', fontSize: '14px' }}>
                {t('nav.hola', { nombre: nombreUsuario })}
              </span>
              <button onClick={handleLogout} style={{
                backgroundColor: '#ccff00', color: '#12283d', border: 'none',
                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                transition: 'transform 0.12s ease, background-color 0.15s ease',
              }}>{t('nav.cerrarSesion')}</button>
            </>
          ) : (
            <Link to="/login" style={{
              backgroundColor: '#ccff00', color: '#12283d', padding: '8px 16px',
              borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold',
              transition: 'transform 0.12s ease, background-color 0.15s ease',
            }}>{t('nav.iniciarRegistrarse')}</Link>
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
          <Link to="/locales" onClick={() => setMenuAbierto(false)} style={navLinkStyle}>{t('nav.locales')}</Link>
          <Link to="/publicaciones" onClick={() => setMenuAbierto(false)} style={navLinkStyle}>{t('nav.publicaciones')}</Link>
          {isAuthenticated && (
            <Link to="/mapa" onClick={() => setMenuAbierto(false)} style={navLinkStyle}>{t('nav.mapa')}</Link>
          )}
          {usuario?.rol === 'admin' && (
            <Link to="/admin" onClick={() => setMenuAbierto(false)} style={navLinkStyle}>{t('nav.admin')}</Link>
          )}
          <div style={{
            display: 'flex',
            gap: '6px',
            marginTop: '4px',
          }}>
            <button
              onClick={() => cambiarIdioma('es')}
              aria-label={t('nav.cambiarIdioma')}
              aria-pressed={i18n.language === 'es'}
              title={t('nav.cambiarIdioma')}
              style={{
                background: i18n.language === 'es' ? 'rgba(204,255,0,0.18)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: '6px',
                cursor: 'pointer',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                flex: '1',
              }}
            >
              <img src={banderaEs} alt="Español" style={{
                width: '36px',
                height: '24px',
                objectFit: 'cover',
                borderRadius: '3px',
                display: 'block',
              }} />
            </button>
            <button
              onClick={() => cambiarIdioma('en')}
              aria-label={t('nav.cambiarIdioma')}
              aria-pressed={i18n.language === 'en'}
              title={t('nav.cambiarIdioma')}
              style={{
                background: i18n.language === 'en' ? 'rgba(204,255,0,0.18)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: '6px',
                cursor: 'pointer',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                flex: '1',
              }}
            >
              <img src={banderaUs} alt="English" style={{
                width: '36px',
                height: '24px',
                objectFit: 'cover',
                borderRadius: '3px',
                display: 'block',
              }} />
            </button>
          </div>
          {isAuthenticated ? (
            <>
              <span style={{ color: '#e2f3ff', fontWeight: 'bold', fontSize: '14px', padding: '8px 0' }}>
                {t('nav.hola', { nombre: nombreUsuario })}
              </span>
              <button onClick={handleLogout} style={{
                backgroundColor: '#ccff00', color: '#12283d', border: 'none',
                padding: '10px 16px', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', marginTop: '4px', width: '100%',
              }}>{t('nav.cerrarSesion')}</button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMenuAbierto(false)} style={{
              backgroundColor: '#ccff00', color: '#12283d', padding: '10px 16px',
              borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold',
              textAlign: 'center', marginTop: '4px', display: 'block',
            }}>{t('nav.iniciarRegistrarse')}</Link>
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
