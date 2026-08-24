import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import fondoRegisterImg from '../assets/registro-fondo.jpg';
import { API_URL } from '../config';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Viajero');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    const rol = role === 'Propietario' ? 'comerciante' : 'turista';

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: name, email, password, rol }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'No se pudo completar el registro');
        return;
      }

      alert(data.mensaje);
      navigate('/login');
    } catch (error) {
      console.error('Error al registrarse:', error);
      alert('No se pudo conectar con el servidor');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 70px)',
        width: '100%',
        backgroundImage: `url(${fondoRegisterImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '20px 0',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <h2
          style={{
            textAlign: 'center',
            color: '#0284c7',
            marginTop: 0,
            marginBottom: '25px',
            textTransform: 'uppercase',
          }}
        >
          REQUINTU - Crear cuenta
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#333' }}>
              Nombre:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#333' }}>
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
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#333' }}>
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
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#333' }}>
              Tipo de cuenta:
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
                backgroundColor: '#fff',
              }}
            >
              <option value="Viajero">Viajero</option>
              <option value="Propietario">Propietario de local</option>
            </select>
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: '#38bdf8',
              color: '#ffffff',
              border: 'none',
              padding: '12px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
              marginTop: '10px',
            }}
          >
            Registrarme
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#555' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: '#0284c7', fontWeight: 'bold', textDecoration: 'none' }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}