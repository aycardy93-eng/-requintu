import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import FondoPagina from '../components/FondoPagina';
import { localeFecha } from '../i18n';
import BACKEND_ORIGIN, { API_URL } from '../config';

// Las imágenes subidas se guardan como ruta relativa (/uploads/archivo.jpg).
// El frontend corre en otro puerto (5173), así que hay que completar la URL
// con el origen del backend para que el navegador la encuentre.
const resolverImagenUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BACKEND_ORIGIN}${url}`;
};

const estiloTexto = {
  width: '100%',
  padding: '10px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.25)',
  backgroundColor: 'rgba(255,255,255,0.95)',
  color: '#12283d',
  marginBottom: '10px',
  minHeight: '70px',
  boxSizing: 'border-box',
};

const estiloError = {
  color: '#ffb4b4',
  background: 'rgba(255,180,180,0.12)',
  padding: '8px',
  borderRadius: '6px',
};

const estiloBotonPrimario = {
  backgroundColor: '#ccff00',
  color: '#12283d',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
  cursor: 'pointer',
  padding: '8px 16px',
  transition: 'transform 0.12s ease, opacity 0.15s ease',
};

const estiloBotonSecundario = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.3)',
  color: '#a9c9bb',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold',
  padding: '6px 12px',
};

function Publicaciones() {
  const { token, isAuthenticated, usuario: usuarioActual } = useAuth();
  const { t } = useTranslation();

  const [publicaciones, setPublicaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Avisos en tiempo real del muro (SSE)
  const [novedades, setNovedades] = useState(0);

  // Formulario de nueva publicación
  const [contenidoNuevo, setContenidoNuevo] = useState('');
  const [imagenNuevaFile, setImagenNuevaFile] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState('');

  // Edición en línea
  const [editandoId, setEditandoId] = useState(null);
  const [contenidoEdit, setContenidoEdit] = useState('');
  const [imagenEditFile, setImagenEditFile] = useState(null);
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState('');

  // Denuncias de publicaciones (moderación de la comunidad)
  const [denunciandoId, setDenunciandoId] = useState(null);
  const [denunciaMotivo, setDenunciaMotivo] = useState('pornografia');
  const [denunciaDetalle, setDenunciaDetalle] = useState('');
  const [denunciaMensaje, setDenunciaMensaje] = useState('');
  const [denunciaError, setDenunciaError] = useState('');

  const cargarPublicaciones = () => {
    setCargando(true);
    setError('');

    fetch(`${API_URL}/publicaciones`)
      .then((res) => res.json())
      .then((data) => {
        setPublicaciones(data.publicaciones || []);
        setCargando(false);
      })
      .catch(() => {
        setError(t('muro.errorServidor'));
        setCargando(false);
      });
  };

  useEffect(() => {
    cargarPublicaciones();
  }, []);

  // Se suscribe a los avisos del muro. Cuando alguien publica, avisa en pantalla
  // para que el usuario vea las novedades sin recargar. Sus propias publicaciones
  // no generan el aviso (ya se recarga la lista automáticamente al crearlas).
  useEffect(() => {
    const es = new EventSource(`${BACKEND_ORIGIN}/api/eventos`);
    es.onerror = () => { /* EventSource se reconecta solo */ };
    es.addEventListener('nueva', (e) => {
      try {
        const evento = JSON.parse(e.data);
        if (evento.usuario_id && usuarioActual && evento.usuario_id === usuarioActual.id) return;
        setNovedades((n) => n + 1);
      } catch { /* evento malformado: se ignora */ }
    });
    es.addEventListener('editada', () => cargarPublicaciones());
    es.addEventListener('borrada', () => cargarPublicaciones());
    return () => es.close();
  }, [usuarioActual, token]);

  const verNovedades = () => {
    setNovedades(0);
    cargarPublicaciones();
  };

  const subirImagenSiHay = async (file) => {
    if (!file) return null;

    const formData = new FormData();
    formData.append('imagen', file);

    const uploadRes = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new Error(uploadData.error || t('muro.errorSubirImagen'));
    }

    return uploadData.url;
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    setErrorNuevo('');

    if (!contenidoNuevo.trim()) {
      setErrorNuevo(t('muro.contenidoObligatorio'));
      return;
    }

    setEnviando(true);

    try {
      const imagen_url = await subirImagenSiHay(imagenNuevaFile);

      const res = await fetch(`${API_URL}/publicaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contenido: contenidoNuevo, imagen_url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('muro.errorCrear'));
      }

      setContenidoNuevo('');
      setImagenNuevaFile(null);
      cargarPublicaciones();
    } catch (err) {
      setErrorNuevo(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleIniciarEdicion = (pub) => {
    setEditandoId(pub.id);
    setContenidoEdit(pub.contenido);
    setImagenEditFile(null);
    setErrorEdit('');
  };

  const handleCancelarEdicion = () => {
    setEditandoId(null);
    setContenidoEdit('');
    setImagenEditFile(null);
    setErrorEdit('');
  };

  const handleGuardarEdicion = async (pub) => {
    setErrorEdit('');

    if (!contenidoEdit.trim()) {
      setErrorEdit(t('muro.contenidoObligatorio'));
      return;
    }

    setGuardandoEdit(true);

    try {
      // Si el usuario eligió una nueva imagen, la sube; si no, conserva la que ya tenía
      const nuevaImagenUrl = imagenEditFile
        ? await subirImagenSiHay(imagenEditFile)
        : pub.imagen_url;

      const res = await fetch(`${API_URL}/publicaciones/${pub.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contenido: contenidoEdit, imagen_url: nuevaImagenUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('muro.errorActualizar'));
      }

      handleCancelarEdicion();
      cargarPublicaciones();
    } catch (err) {
      setErrorEdit(err.message);
    } finally {
      setGuardandoEdit(false);
    }
  };

  const handleEliminar = async (id) => {
    const confirmar = window.confirm(t('muro.confirmarEliminar'));
    if (!confirmar) return;

    try {
      const res = await fetch(`${API_URL}/publicaciones/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('muro.errorEliminar'));
      }

      cargarPublicaciones();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleIniciarDenuncia = (pub) => {
    setDenunciandoId(pub.id);
    setDenunciaMotivo('pornografia');
    setDenunciaDetalle('');
    setDenunciaMensaje('');
    setDenunciaError('');
  };

  const handleCancelarDenuncia = () => {
    setDenunciandoId(null);
    setDenunciaMotivo('pornografia');
    setDenunciaDetalle('');
    setDenunciaMensaje('');
    setDenunciaError('');
  };

  const handleEnviarDenuncia = async (pub) => {
    setDenunciaError('');
    setDenunciaMensaje('');

    try {
      const res = await fetch(`${API_URL}/publicaciones/${pub.id}/denuncias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          motivo: denunciaMotivo,
          detalle: denunciaDetalle.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('muro.errorDenuncia'));
      }

      setDenunciaMensaje(data.mensaje || t('muro.graciasDenuncia'));
      setDenunciandoId(null);
      setDenunciaDetalle('');
    } catch (err) {
      setDenunciaError(err.message);
    }
  };

  return (
    <FondoPagina>
    <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif', padding: '30px 15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{t('muro.titulo')}</h1>
        <Link to="/" style={{ color: '#ccff00', fontWeight: 'bold', textDecoration: 'none' }}>← {t('common.volver')}</Link>
      </div>

      {/* Formulario de nueva publicación */}
      {isAuthenticated ? (
        <form onSubmit={handleCrear} style={{ marginBottom: '25px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(18, 40, 61, 0.75)', borderRadius: '8px', padding: '15px' }}>
          {errorNuevo && (
            <p style={estiloError}>{errorNuevo}</p>
          )}

          <textarea
            placeholder={t('muro.placeholder')}
            value={contenidoNuevo}
            onChange={(e) => setContenidoNuevo(e.target.value)}
            style={estiloTexto}
          />

          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => setImagenNuevaFile(e.target.files[0])}
            style={{ display: 'block', marginBottom: '10px', color: '#e2f3ff' }}
          />

          <button type="submit" disabled={enviando} style={{ ...estiloBotonPrimario, opacity: enviando ? 0.6 : 1 }}>
            {enviando ? t('muro.publicando') : t('muro.publicar')}
          </button>
        </form>
      ) : (
        <p style={{ marginBottom: '25px' }}>
          <Link to="/login" style={{ color: '#ccff00', fontWeight: 'bold' }}>{t('muro.iniciaSesion')}</Link> {t('muro.paraPublicar')}.
        </p>
      )}

      {/* Estado de carga / error */}
      {cargando && <p>{t('muro.cargando')}</p>}
      {error && <p style={{ color: '#ffb4b4' }}>{error}</p>}
      {!cargando && !error && publicaciones.length === 0 && <p>{t('muro.sinPublicaciones')}</p>}

      {/* Lista de publicaciones */}
      {publicaciones.map((pub) => {
        const esAutor = usuarioActual && pub.usuario_id === usuarioActual.id;
        const enEdicion = editandoId === pub.id;

        return (
          <div key={pub.id} style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(18, 40, 61, 0.75)', borderRadius: '8px', padding: '15px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong>{pub.autor}</strong>
              <span style={{ fontSize: '12px', color: '#a9c9bb' }}>
                {new Date(pub.fecha_creacion).toLocaleString(localeFecha())}
              </span>
            </div>

            {enEdicion ? (
              <div>
                {errorEdit && (
                  <p style={estiloError}>{errorEdit}</p>
                )}

                <textarea
                  value={contenidoEdit}
                  onChange={(e) => setContenidoEdit(e.target.value)}
                  style={estiloTexto}
                />

                {pub.imagen_url && !imagenEditFile && (
                  <img
                    src={resolverImagenUrl(pub.imagen_url)}
                    alt="Actual"
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '6px', marginBottom: '10px' }}
                  />
                )}

                <label style={{ fontSize: '13px', color: '#a9c9bb' }}>{t('muro.cambiarImagen')}:</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => setImagenEditFile(e.target.files[0])}
                  style={{ display: 'block', margin: '5px 0 10px 0' }}
                />

                <button
                  onClick={() => handleGuardarEdicion(pub)}
                  disabled={guardandoEdit}
                  style={{ ...estiloBotonPrimario, padding: '6px 14px', marginRight: '8px', opacity: guardandoEdit ? 0.6 : 1 }}
                >
                  {guardandoEdit ? t('common.guardando') : t('common.guardar')}
                </button>
                <button onClick={handleCancelarEdicion} style={estiloBotonSecundario}>
                  {t('common.cancelar')}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 10px 0', whiteSpace: 'pre-wrap' }}>{pub.contenido}</p>

                {pub.imagen_url && (
                  <img
                    src={resolverImagenUrl(pub.imagen_url)}
                    alt="Publicación"
                    style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '6px', marginBottom: '10px' }}
                  />
                )}

                {esAutor && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleIniciarEdicion(pub)} style={estiloBotonSecundario}>
                      {t('common.editar')}
                    </button>
                    <button
                      onClick={() => handleEliminar(pub.id)}
                      style={{ ...estiloBotonSecundario, color: '#ff8080' }}
                    >
                      {t('common.eliminar')}
                    </button>
                  </div>
                )}

                {isAuthenticated && !esAutor && (
                  <div style={{ marginTop: '10px' }}>
                    {denunciaMensaje && (
                      <p style={{ fontSize: '13px', color: '#4ade80', margin: '0 0 8px 0' }}>{denunciaMensaje}</p>
                    )}

                    {denunciandoId === pub.id ? (
                      <div style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '10px' }}>
                        <strong style={{ fontSize: '13px' }}>{t('muro.denunciarTitulo')}</strong>
                        <select
                          value={denunciaMotivo}
                          onChange={(e) => setDenunciaMotivo(e.target.value)}
                          style={{ ...estiloTexto, minHeight: 'unset', padding: '8px', margin: '8px 0' }}
                        >
                          <option value="pornografia">{t('muro.motivoSexual')}</option>
                          <option value="violencia">{t('muro.motivoViolencia')}</option>
                          <option value="spam">{t('muro.motivoSpam')}</option>
                          <option value="otro">{t('muro.motivoOtro')}</option>
                        </select>
                        <textarea
                          placeholder={t('muro.detalleOpcional')}
                          value={denunciaDetalle}
                          onChange={(e) => setDenunciaDetalle(e.target.value)}
                          style={{ ...estiloTexto, minHeight: '50px' }}
                        />
                        {denunciaError && <p style={estiloError}>{denunciaError}</p>}
                        <button
                          onClick={() => handleEnviarDenuncia(pub)}
                          style={{ ...estiloBotonPrimario, padding: '6px 14px', marginRight: '8px' }}
                        >
                          {t('muro.enviarDenuncia')}
                        </button>
                        <button onClick={handleCancelarDenuncia} style={estiloBotonSecundario}>
                          {t('common.cancelar')}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleIniciarDenuncia(pub)} style={estiloBotonSecundario}>
                        ⚑ {t('muro.denunciar')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Aviso de nuevas publicaciones en tiempo real */}
    {novedades > 0 && (
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '600px', zIndex: 1200, padding: '10px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#12283d', border: '1px solid #ccff00', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 6px 20px rgba(0,0,0,0.45)' }}>
          <span style={{ color: '#e2f3ff', fontWeight: 'bold' }}>
            {t('muro.novedades', { count: novedades })}
          </span>
          <button onClick={verNovedades} style={{ background: '#ccff00', color: '#12283d', fontWeight: 'bold', border: 'none', borderRadius: '6px', padding: '7px 12px', cursor: 'pointer' }}>
            {t('muro.verAhora')}
          </button>
        </div>
      </div>
    )}
    </FondoPagina>
  );
}

export default Publicaciones;
