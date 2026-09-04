import { useState } from 'react';
import { Link } from 'react-router-dom';
import FondoPagina from '../components/FondoPagina';
import { API_URL } from '../config';

export default function OlvidePassword() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    setEnviando(true);

    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar la solicitud.');
      }

      setMensaje(data.mensaje);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <FondoPagina>
      <div style={{ maxWidth: '420px', margin: '0 auto', padding: '40px 20px' }}>
        <div
          style={{
            background: 'rgba(18, 40, 61, 0.85)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '30px',
          }}
        >
          <h1 style={{ marginTop: 0 }}>Recuperar contraseña</h1>
          <p style={{ color: '#a9c9bb' }}>
            Escribe el correo con el que te registraste y te enviaremos un enlace para crear una nueva contraseña.
          </p>

          {error && (
            <p style={{ color: '#ffb4b4', background: 'rgba(255,180,180,0.12)', padding: '8px', borderRadius: '6px' }}>{error}</p>
          )}
          {mensaje && (
            <p style={{ color: '#a9f0b4', background: 'rgba(169,240,180,0.12)', padding: '8px', borderRadius: '6px' }}>{mensaje}</p>
          )}

          {!mensaje && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label>Correo electrónico:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tucorreo@gmail.com"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.25)',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    color: '#12283d',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={enviando}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  background: '#ccff00',
                  color: '#12283d',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                {enviando ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          )}

          <p style={{ marginTop: '15px' }}>
            <Link to="/login" style={{ color: '#ccff00', fontWeight: 'bold', textDecoration: 'none' }}>← Volver a iniciar sesión</Link>
          </p>
        </div>
      </div>
    </FondoPagina>
  );
}
