import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

// Importación de assets locales
import fondoInicio from '../assets/fondo-inicio.jpg'; // O .png según la extensión real
import armeniaImg from '../assets/armenia1.jpg';
import bogotaImg from '../assets/bogota.jpg';
import bucaramangaImg from '../assets/bucaramanga.jpg';
import './Login.css';

const imagenesCarrusel = [
  { img: bogotaImg, titulo: 'Bogotá', descripcion: 'La capital cultural y de negocios' },
  { img: armeniaImg, titulo: 'Armenia', descripcion: 'El corazón del Paisaje Cultural Cafetero' },
  { img: bucaramangaImg, titulo: 'Bucaramanga', descripcion: 'La ciudad bonita de Colombia' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(false);
  const [indexCarrusel, setIndexCarrusel] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

  // Recuerda el correo en este dispositivo si el usuario marcó "Recuérdame".
  useEffect(() => {
    const emailRecordado = localStorage.getItem('requintu_email_recordado');
    if (emailRecordado) setEmail(emailRecordado);
  }, []);

  // Cambio automático del carrusel cada 4 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setIndexCarrusel((prevIndex) => (prevIndex + 1) % imagenesCarrusel.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSiguiente = () => {
    setIndexCarrusel((prevIndex) => (prevIndex + 1) % imagenesCarrusel.length);
  };

  const handleAnterior = () => {
    setIndexCarrusel((prevIndex) =>
      prevIndex === 0 ? imagenesCarrusel.length - 1 : prevIndex - 1
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, recordar }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Credenciales incorrectas');
        return;
      }

      if (recordar) {
        localStorage.setItem('requintu_email_recordado', email);
      } else {
        localStorage.removeItem('requintu_email_recordado');
      }

      login(data.token);
      navigate('/mapa');
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      setError('No se pudo conectar con el servidor');
    } finally {
      setEnviando(false);
    }
  };

  const slideActual = imagenesCarrusel[indexCarrusel];

  return (
    <div className="login-pagina">
      {/* Columna Izquierda: Carrusel con imágenes locales */}
      <div
        className="login-carrusel"
        style={{
          backgroundImage: `url(${slideActual.img})`,
          transition: 'background-image 0.5s ease-in-out',
        }}
      >
        {/* Contenido descriptivo del slide */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '36px', margin: '0 0 10px 0', fontWeight: 'bold' }}>
            {slideActual.titulo}
          </h1>
          <p style={{ fontSize: '18px', margin: 0 }}>{slideActual.descripcion}</p>
        </div>

        {/* Flechas de navegación manual */}
        <button
          onClick={handleAnterior}
          style={{
            position: 'absolute',
            left: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: '#ccff00',
            fontSize: '32px',
            cursor: 'pointer',
            zIndex: 3,
            fontWeight: 'bold',
          }}
        >
          &#10094;
        </button>

        <button
          onClick={handleSiguiente}
          style={{
            position: 'absolute',
            right: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: '#ccff00',
            fontSize: '32px',
            cursor: 'pointer',
            zIndex: 3,
            fontWeight: 'bold',
          }}
        >
          &#10095;
        </button>

        {/* Capa de sombra para mejorar la legibilidad del texto */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            zIndex: 1,
          }}
        />
      </div>

      {/* Columna Derecha: Fondo 'fondo-inicio' y Formulario */}
      <div
        className="login-formulario"
        style={{ backgroundImage: `url(${fondoInicio})` }}
      >
        <div
          style={{
            backgroundColor: 'rgba(18, 40, 61, 0.92)',
            border: '1px solid rgba(255,255,255,0.15)',
            padding: '35px 30px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
            width: '100%',
            maxWidth: '360px',
          }}
        >
          <h2
            style={{
              textAlign: 'center',
              color: '#ccff00',
              marginTop: 0,
              marginBottom: '25px',
              fontSize: '20px',
            }}
          >
            REQUINTU - Iniciar sesión
          </h2>

          {error && (
            <p style={{
              color: '#ffb4b4', background: 'rgba(255,180,180,0.12)',
              padding: '10px', borderRadius: '6px', fontSize: '14px', marginBottom: '15px',
            }}>{error}</p>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#a9c9bb' }}>
                Correo:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxSizing: 'border-box',
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  color: '#12283d',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#a9c9bb' }}>
                Contraseña:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxSizing: 'border-box',
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  color: '#12283d',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#a9c9bb', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={recordar}
                onChange={(e) => setRecordar(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#ccff00', cursor: 'pointer' }}
              />
              Recuérdame en este dispositivo
            </label>

            <button
              type="submit"
              disabled={enviando}
              style={{
                backgroundColor: '#ccff00',
                color: '#12283d',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '10px',
                opacity: enviando ? 0.6 : 1,
                transition: 'transform 0.12s ease, opacity 0.15s ease',
              }}
            >
              {enviando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px' }}>
            <Link to="/olvide-password" style={{ color: '#a9c9bb', textDecoration: 'none' }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </p>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#a9c9bb' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" style={{ color: '#ccff00', fontWeight: 'bold', textDecoration: 'none' }}>
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}