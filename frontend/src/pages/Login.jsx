import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Importación de assets locales
import fondoInicio from '../assets/fondo-inicio.jpg'; // O .png según la extensión real
import armeniaImg from '../assets/armenia1.jpg';
import bogotaImg from '../assets/bogota.jpg';
import bucaramangaImg from '../assets/bucaramanga.jpg';

const imagenesCarrusel = [
  { img: bogotaImg, titulo: 'Bogotá', descripcion: 'La capital cultural y de negocios' },
  { img: armeniaImg, titulo: 'Armenia', descripcion: 'El corazón del Paisaje Cultural Cafetero' },
  { img: bucaramangaImg, titulo: 'Bucaramanga', descripcion: 'La ciudad bonita de Colombia' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [indexCarrusel, setIndexCarrusel] = useState(0);

  const navigate = useNavigate();
  const { login } = useAuth();

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
    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
       alert(data.error || 'Credenciales incorrectas');
        return;
      }

      login(data.token); // token real emitido por tu backend
      navigate('/mapa');
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      alert('No se pudo conectar con el servidor');
    }
  };

  const slideActual = imagenesCarrusel[indexCarrusel];

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: 'calc(100vh - 70px)' }}>
      {/* Columna Izquierda: Carrusel con imágenes locales */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          backgroundImage: `url(${slideActual.img})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'background-image 0.5s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '40px',
          color: '#fff',
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
            color: '#38bdf8',
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
            color: '#38bdf8',
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
        style={{
          flex: 1,
          backgroundImage: `url(${fondoInicio})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            padding: '35px 30px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: '360px',
          }}
        >
          <h2
            style={{
              textAlign: 'center',
              color: '#0284c7',
              marginTop: 0,
              marginBottom: '25px',
              fontSize: '20px',
            }}
          >
            REQUINTU - Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#333' }}>
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
                  border: '1px solid #ccc',
                  boxSizing: 'border-box',
                  backgroundColor: '#e8f0fe',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#333' }}>
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
                  border: '1px solid #ccc',
                  boxSizing: 'border-box',
                  backgroundColor: '#e8f0fe',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                backgroundColor: '#38bdf8',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '10px',
              }}
            >
              Ingresar
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#555' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" style={{ color: '#0284c7', fontWeight: 'bold', textDecoration: 'none' }}>
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}