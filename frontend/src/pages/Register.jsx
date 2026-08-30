import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import fondoRegisterImg from '../assets/registro-fondo.jpg';
import { API_URL } from '../config';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Viajero');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setEnviando(true);
    setError('');
    setExito('');

    const rol = role === 'Propietario' ? 'comerciante' : 'turista';

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: name, email, password, rol }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No se pudo completar el registro');
        return;
      }

      setExito(data.mensaje);
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      console.error('Error al registrarse:', error);
      setError('No se pudo conectar con el servidor');
    } finally {
      setEnviando(false);
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
          backgroundColor: 'rgba(18, 40, 61, 0.92)',
          border: '1px solid rgba(255,255,255,0.15)',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <h2
          style={{
            textAlign: 'center',
            color: '#ccff00',
            marginTop: 0,
            marginBottom: '25px',
            textTransform: 'uppercase',
          }}
        >
          REQUINTU - Crear cuenta
        </h2>

        {error && (
          <p style={{
            color: '#ffb4b4', background: 'rgba(255,180,180,0.12)',
            padding: '10px', borderRadius: '6px', fontSize: '14px', marginBottom: '15px',
          }}>{error}</p>
        )}
        {exito && (
          <p style={{
            color: '#a9f0b4', background: 'rgba(169,240,180,0.12)',
            padding: '10px', borderRadius: '6px', fontSize: '14px', marginBottom: '15px',
          }}>{exito} Te llevaremos a iniciar sesión...</p>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#a9c9bb' }}>
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
                border: '1px solid rgba(255,255,255,0.25)',
                boxSizing: 'border-box',
                backgroundColor: 'rgba(255,255,255,0.95)',
                color: '#12283d',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#a9c9bb' }}>
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
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#a9c9bb' }}>
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

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#a9c9bb' }}>
              Tipo de cuenta:
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.25)',
                boxSizing: 'border-box',
                backgroundColor: 'rgba(255,255,255,0.95)',
                color: '#12283d',
              }}
            >
              <option value="Viajero">Viajero</option>
              <option value="Propietario">Propietario de local</option>
            </select>
          </div>

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
              fontSize: '16px',
              cursor: 'pointer',
              marginTop: '10px',
              opacity: enviando ? 0.6 : 1,
              transition: 'transform 0.12s ease, opacity 0.15s ease',
            }}
          >
            {enviando ? 'Registrando...' : 'Registrarme'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#a9c9bb' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: '#ccff00', fontWeight: 'bold', textDecoration: 'none' }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}