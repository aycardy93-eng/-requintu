import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BACKEND_ORIGIN, { API_URL } from '../config';

const resolverImagenUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('https://res.cloudinary.com/')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return null;
  return `${BACKEND_ORIGIN}${url}`;
};

export default function ChatBot() {
  const { t, i18n } = useTranslation();
  const [abierto, setAbierto] = useState(false);
  const [entrada, setEntrada] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensajes, setMensajes] = useState([
    { rol: 'bot', texto: t('chat.bienvenida'), sugerencias: t('chat.ejemplos', { returnObjects: true }) }
  ]);
  const finRef = useRef(null);

  useEffect(() => {
    if (finRef.current) {
      finRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [mensajes, cargando, abierto]);

  const enviar = async (textoExplicito) => {
    const texto = (textoExplicito ?? entrada).trim();
    if (!texto || cargando) return;
    const historial = [...mensajes, { rol: 'user', texto }];
    setMensajes(historial);
    setEntrada('');
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: texto, lang: (i18n.language || 'es').slice(0, 2) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error del asistente');
      setMensajes([
        ...historial,
        { rol: 'bot', texto: data.respuesta, locales: data.locales || [], sugerencias: data.sugerencias || [] }
      ]);
    } catch {
      setMensajes([...historial, { rol: 'bot', texto: t('chat.error') }]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '18px',
        right: '18px',
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        fontFamily: 'sans-serif',
      }}
    >
      {abierto && (
        <div
          style={{
            width: 'min(380px, calc(100vw - 32px))',
            height: 'min(500px, 72vh)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0f2438',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
            marginBottom: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              backgroundColor: '#16324c',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px' }}>{t('chat.titulo')}</span>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label={t('chat.cerrar')}
              title={t('chat.cerrar')}
              style={{
                background: 'none',
                border: 'none',
                color: '#a9c9bb',
                fontSize: '20px',
                lineHeight: 1,
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {mensajes.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.rol === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    backgroundColor: msg.rol === 'user' ? '#ccff00' : '#16324c',
                    color: msg.rol === 'user' ? '#12283d' : '#dce8e3',
                    fontWeight: msg.rol === 'user' ? 500 : 400,
                  }}
                >
                  {msg.texto}
                </div>

                {msg.locales && msg.locales.length > 0 && (
                  <div style={{ width: '100%', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {msg.locales.map((local) => (
                      <Link
                        key={local.id_local}
                        to={`/locales/${local.id_local}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          textDecoration: 'none',
                          color: 'inherit',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <span
                          style={{
                            width: '38px',
                            height: '38px',
                            flexShrink: 0,
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '10px',
                            color: '#a9c9bb',
                          }}
                        >
                          {local.imagen_url ? (
                            <img
                              src={resolverImagenUrl(local.imagen_url)}
                              alt={local.nombre}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            t('locales.sinImagen')
                          )}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>{local.nombre}</span>
                            {local.destacado && (
                              <span style={{
                                background: 'rgba(0,200,255,0.2)',
                                color: '#49c7ff',
                                padding: '1px 6px',
                                borderRadius: '999px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                              }}>
                                {t('locales.oficial')}
                              </span>
                            )}
                          </span>
                          <span style={{ display: 'block', fontSize: '11px', color: '#a9c9bb', marginTop: '2px' }}>
                            {[local.categoria_nombre, local.municipio_nombre, local.departamento].filter(Boolean).join(' · ')}
                          </span>
                          {Number(local.calificacion_promedio) > 0 && (
                            <span style={{ fontSize: '12px', color: '#ffd700', marginTop: '2px', display: 'block' }}>
                              ★ {Number(local.calificacion_promedio).toFixed(1)}
                              {local.total_calificaciones > 0 ? ` (${local.total_calificaciones})` : ''}
                            </span>
                          )}
                        </span>
                        <span style={{ color: '#ccff00', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                          {t('chat.verLocal')} →
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {msg.sugerencias && msg.sugerencias.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {msg.sugerencias.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => enviar(s)}
                        style={{
                          background: 'rgba(204,255,0,0.12)',
                          color: '#ccff00',
                          border: '1px solid rgba(204,255,0,0.3)',
                          borderRadius: '999px',
                          padding: '5px 11px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {cargando && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 12px', borderRadius: '10px', fontSize: '14px', backgroundColor: '#16324c', color: '#a9c9bb', fontStyle: 'italic' }}>
                {t('chat.escribiendo')}
              </div>
            )}

            <div ref={finRef} />
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px',
              borderTop: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <input
              type="text"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') enviar();
              }}
              placeholder={t('chat.placeholder')}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '14px',
                color: '#ffffff',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => enviar()}
              disabled={!entrada.trim() || cargando}
              style={{
                backgroundColor: '#ccff00',
                color: '#12283d',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                cursor: entrada.trim() && !cargando ? 'pointer' : 'default',
                opacity: entrada.trim() && !cargando ? 1 : 0.55,
              }}
            >
              {t('chat.enviar')}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? t('chat.cerrar') : t('chat.abrir')}
        title={abierto ? t('chat.cerrar') : t('chat.abrir')}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: '#ccff00',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="#12283d"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5a8.38 8.38 0 0 1-.9 3.8z" />
        </svg>
      </button>
    </div>
  );
}