import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

import imgArmenia from '../assets/armenia1.jpg';
import imgBogota from '../assets/bogota.jpg';
import imgBucaramanga from '../assets/bucaramanga.jpg';

const imagenes = [
  { url: imgArmenia, titulo: 'Armenia', subtitulo: 'Ciudad Milagro' },
  { url: imgBogota, titulo: 'Bogotá', subtitulo: 'Capital Cultural' },
  { url: imgBucaramanga, titulo: 'Bucaramanga', subtitulo: 'La Ciudad Bonita' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Cambiar imagen cada 4 segundos usando useEffect correctamente
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % imagenes.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await apiFetch('/login', { metodo: 'POST', body: { email, password } });
      login(data.token);
      navigate('/locales');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={estilos.contenedor}>
      {/* Carrusel Izquierda */}
      <div style={estilos.carrusel}>
        <img
          src={imagenes[index].url}
          alt={imagenes[index].titulo}
          style={estilos.imagen}
        />
        <div style={estilos.overlay}>
          <h2 style={{ margin: 0, fontSize: '2rem' }}>{imagenes[index].titulo}</h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>{imagenes[index].subtitulo}</p>
        </div>
      </div>

      {/* Formulario Derecha */}
      <div style={estilos.formularioSeccion}>
        <div style={estilos.card}>
          <h2 style={{ textAlign: 'center', color: '#2e7d32', marginBottom: '20px' }}>
            Requintu - Iniciar sesión
          </h2>

          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Correo:</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={estilos.input}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Contraseña:</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={estilos.input}
              />
            </div>

            <button type="submit" style={estilos.boton}>
              Ingresar
            </button>
          </form>

          <p style={{ marginTop: '20px', textAlign: 'center' }}>
            ¿No tienes cuenta? <Link to="/register" style={{ color: '#2e7d32', fontWeight: 'bold' }}>Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const estilos = {
  contenedor: {
    display: 'flex',
    width: '100vw',
    height: 'calc(100vh - 70px)',
    overflow: 'hidden',
  },
  carrusel: {
    flex: '1.2',
    position: 'relative',
    height: '100%',
    backgroundColor: '#000',
  },
  imagen: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'all 0.5s ease-in-out',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '40px 20px',
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.85))',
    color: '#fff',
    textAlign: 'center',
  },
  formularioSeccion: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f4f4',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    padding: '30px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
  },
  boton: {
    padding: '12px',
    backgroundColor: '#2e7d32',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    marginTop: '10px',
  },
};