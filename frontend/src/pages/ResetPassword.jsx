import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FondoPagina from '../components/FondoPagina';
import { API_URL } from '../config';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmar) {
      setError(t('reset.noCoinciden'));
      return;
    }

    setEnviando(true);

    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('reset.errorRestablecer'));
      }

      setExito(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (!token) {
    return (
      <FondoPagina>
        <div style={{ maxWidth: '420px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
          <p>{t('reset.enlaceInvalido')}</p>
          <Link to="/olvide-password" style={{ color: '#ccff00', fontWeight: 'bold' }}>{t('reset.nuevoEnlace')}</Link>
        </div>
      </FondoPagina>
    );
  }

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
          <h1 style={{ marginTop: 0 }}>{t('reset.nuevaContrasena')}</h1>

          {exito ? (
            <>
              <p style={{ color: '#a9f0b4', background: 'rgba(169,240,180,0.12)', padding: '8px', borderRadius: '6px' }}>
                {t('reset.actualizada')}
              </p>
              <Link to="/login" style={{ color: '#ccff00', fontWeight: 'bold', textDecoration: 'none' }}>{t('reset.iniciarSesion')} →</Link>
            </>
          ) : (
            <>
              <p style={{ color: '#a9c9bb' }}>{t('reset.creaNueva')}</p>

              {error && (
                <p style={{ color: '#ffb4b4', background: 'rgba(255,180,180,0.12)', padding: '8px', borderRadius: '6px' }}>{error}</p>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                  <label>{t('reset.nuevaContrasena')}:</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder={t('reset.minimo')}
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

                <div style={{ marginBottom: '15px' }}>
                  <label>{t('reset.confirmar')}:</label>
                  <input
                    type="password"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    required
                    minLength={8}
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
                  {enviando ? t('reset.guardando') : t('reset.guardar')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </FondoPagina>
  );
}
