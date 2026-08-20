import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

function Register() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('turista');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    try {
      await apiFetch('/register', { metodo: 'POST', body: { nombre, email, password, rol } });

      setMensaje('¡Cuenta creada con éxito! Redirigiendo al login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      setMensaje(error.message);
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h1>Requintu - Crear cuenta</h1>

      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: '15px' }}>
          <label>Nombre:</label><br />
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Correo:</label><br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Contraseña:</label><br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Tipo de cuenta:</label><br />
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="turista">Turista</option>
            <option value="comerciante">Comerciante</option>
          </select>
        </div>

        <button type="submit" disabled={cargando} style={{ padding: '10px 20px' }}>
          {cargando ? 'Creando cuenta...' : 'Registrarme'}
        </button>
      </form>

      {mensaje && <p style={{ marginTop: '20px' }}>{mensaje}</p>}

      <p style={{ marginTop: '20px' }}>
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  );
}

export default Register;