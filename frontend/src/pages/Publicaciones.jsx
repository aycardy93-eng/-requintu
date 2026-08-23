import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FondoPagina from '../components/FondoPagina';

const API_URL = 'http://localhost:3000/api';
const BACKEND_ORIGIN = 'http://localhost:3000';

// Las imágenes subidas se guardan como ruta relativa (/uploads/archivo.jpg).
// El frontend corre en otro puerto (5173), así que hay que completar la URL
// con el origen del backend para que el navegador la encuentre.
const resolverImagenUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BACKEND_ORIGIN}${url}`;
};

function Publicaciones() {
  const { token, isAuthenticated, usuario: usuarioActual } = useAuth();

  const [publicaciones, setPublicaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

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
        setError('No se pudo conectar con el servidor.');
        setCargando(false);
      });
  };

  useEffect(() => {
    cargarPublicaciones();
  }, []);

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
      throw new Error(uploadData.error || 'Error al subir la imagen.');
    }

    return uploadData.url;
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    setErrorNuevo('');

    if (!contenidoNuevo.trim()) {
      setErrorNuevo('El contenido es obligatorio.');
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
        throw new Error(data.error || 'Error al crear la publicación.');
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
      setErrorEdit('El contenido es obligatorio.');
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
        throw new Error(data.error || 'Error al actualizar la publicación.');
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
    const confirmar = window.confirm('¿Seguro que quieres eliminar esta publicación? Esta acción no se puede deshacer.');
    if (!confirmar) return;

    try {
      const res = await fetch(`${API_URL}/publicaciones/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar la publicación.');
      }

      cargarPublicaciones();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <FondoPagina>
    <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif', padding: '30px 15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Publicaciones</h1>
        <Link to="/" style={{ color: '#ccff00', fontWeight: 'bold', textDecoration: 'none' }}>← Volver</Link>
      </div>

      {/* Formulario de nueva publicación */}
      {isAuthenticated ? (
        <form onSubmit={handleCrear} style={{ marginBottom: '25px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(18, 40, 61, 0.75)', borderRadius: '8px', padding: '15px' }}>
          {errorNuevo && (
            <p style={{ color: 'red', background: '#fee', padding: '8px' }}>{errorNuevo}</p>
          )}

          <textarea
            placeholder="¿Qué quieres compartir?"
            value={contenidoNuevo}
            onChange={(e) => setContenidoNuevo(e.target.value)}
            style={{ width: '100%', padding: '8px', minHeight: '70px', marginBottom: '10px' }}
          />

          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => setImagenNuevaFile(e.target.files[0])}
            style={{ display: 'block', marginBottom: '10px' }}
          />

          <button type="submit" disabled={enviando} style={{ padding: '8px 16px' }}>
            {enviando ? 'Publicando...' : 'Publicar'}
          </button>
        </form>
      ) : (
        <p style={{ marginBottom: '25px' }}>
          <Link to="/login" style={{ color: '#ccff00', fontWeight: 'bold' }}>Inicia sesión</Link> para crear una publicación.
        </p>
      )}

      {/* Estado de carga / error */}
      {cargando && <p>Cargando publicaciones...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!cargando && !error && publicaciones.length === 0 && <p>Aún no hay publicaciones.</p>}

      {/* Lista de publicaciones */}
      {publicaciones.map((pub) => {
        const esAutor = usuarioActual && pub.usuario_id === usuarioActual.id;
        const enEdicion = editandoId === pub.id;

        return (
          <div key={pub.id} style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(18, 40, 61, 0.75)', borderRadius: '8px', padding: '15px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong>{pub.autor}</strong>
              <span style={{ fontSize: '12px', color: '#a9c9bb' }}>
                {new Date(pub.fecha_creacion).toLocaleString('es-CO')}
              </span>
            </div>

            {enEdicion ? (
              <div>
                {errorEdit && (
                  <p style={{ color: 'red', background: '#fee', padding: '8px' }}>{errorEdit}</p>
                )}

                <textarea
                  value={contenidoEdit}
                  onChange={(e) => setContenidoEdit(e.target.value)}
                  style={{ width: '100%', padding: '8px', minHeight: '70px', marginBottom: '10px' }}
                />

                {pub.imagen_url && !imagenEditFile && (
                  <img
                    src={resolverImagenUrl(pub.imagen_url)}
                    alt="Actual"
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '6px', marginBottom: '10px' }}
                  />
                )}

                <label style={{ fontSize: '13px', color: '#a9c9bb' }}>Cambiar imagen (opcional):</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => setImagenEditFile(e.target.files[0])}
                  style={{ display: 'block', margin: '5px 0 10px 0' }}
                />

                <button
                  onClick={() => handleGuardarEdicion(pub)}
                  disabled={guardandoEdit}
                  style={{ padding: '6px 14px', marginRight: '8px' }}
                >
                  {guardandoEdit ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={handleCancelarEdicion} style={{ padding: '6px 14px' }}>
                  Cancelar
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
                    <button onClick={() => handleIniciarEdicion(pub)} style={{ padding: '5px 12px' }}>
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(pub.id)}
                      style={{ padding: '5px 12px', color: '#c00' }}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
    </FondoPagina>
  );
}

export default Publicaciones;
