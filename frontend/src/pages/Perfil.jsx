import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FondoPagina from '../components/FondoPagina';
import { API_URL } from '../config';

function Perfil() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState('');
  const [fotoPerfilFile, setFotoPerfilFile] = useState(null);
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        const res = await fetch(`${API_URL}/perfil`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'No se pudo cargar el perfil.');
        }

        setNombre(data.usuario.nombre || '');
        setEmail(data.usuario.email || '');
        setRol(data.usuario.rol || '');
        setFotoPerfil(data.usuario.foto_perfil || '');
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    cargarPerfil();
  }, [token]);

  const seleccionarFoto = (e) => {
    const file = e.target.files[0];
    setFotoPerfilFile(file || null);

    if (file) {
      setFotoPerfil(URL.createObjectURL(file));
    }
  };

  const guardarPerfil = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    if (!nombre.trim() || !email.trim()) {
      setError('El nombre y el correo son obligatorios.');
      return;
    }

    if (password && password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setGuardando(true);

    try {
      let foto_perfil = fotoPerfil;

      if (fotoPerfilFile) {
        const formData = new FormData();
        formData.append('imagen', fotoPerfilFile);

        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.message || 'No se pudo subir la foto.');
        }

        foto_perfil = uploadData.imagen_url;
      }

      const res = await fetch(`${API_URL}/perfil`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim(), password, foto_perfil }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'No se pudo actualizar el perfil.');
      }

      setNombre(data.usuario.nombre);
      setEmail(data.usuario.email);
      setFotoPerfil(data.usuario.foto_perfil || '');
      setFotoPerfilFile(null);
      setPassword('');
      setExito('Perfil actualizado correctamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarCuenta = async () => {
    if (!window.confirm('¿Seguro que quieres eliminar tu cuenta? Se borrarán todos tus datos, locales y publicaciones. Esta acción no se puede deshacer.')) return;
    setEliminando(true);
    try {
      const res = await fetch(`${API_URL}/usuarios/perfil`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar la cuenta');
      logout();
      navigate('/');
    } catch (err) {
      alert(err.message);
      setEliminando(false);
    }
  };

  const estiloInput = {
    boxSizing: 'border-box',
    display: 'block',
    width: '100%',
    marginTop: '5px',
    padding: '9px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    color: '#12283d',
  };

  if (cargando) return <FondoPagina><p style={{ padding: '20px' }}>Cargando perfil...</p></FondoPagina>;

  return (
    <FondoPagina>
      <main style={{ maxWidth: '500px', margin: '40px auto', padding: '0 15px', fontFamily: 'sans-serif' }}>
        <h1 style={{ marginTop: 0 }}>Mi perfil</h1>
        <p style={{ color: '#a9c9bb' }}>Tipo de cuenta: <strong style={{ color: '#ccff00' }}>{rol || 'usuario'}</strong></p>

        <div style={{
          background: 'rgba(18, 40, 61, 0.85)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '12px',
          padding: '30px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            {fotoPerfil ? (
              <img
                src={fotoPerfil}
                alt="Foto de perfil"
                style={{ width: '86px', height: '86px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ccff00' }}
              />
            ) : (
              <div style={{ width: '86px', height: '86px', borderRadius: '50%', background: '#0d1f30', border: '2px solid #ccff00', color: '#ccff00', display: 'grid', placeItems: 'center', fontSize: '32px', fontWeight: 'bold' }}>
                {(nombre || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <label htmlFor="fotoPerfil" style={{ color: '#a9c9bb' }}>Foto de perfil</label>
              <input
                id="fotoPerfil"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={seleccionarFoto}
                style={{ display: 'block', marginTop: '6px', color: '#e2f3ff' }}
              />
            </div>
          </div>

          {error && <p style={{ color: '#ffb4b4', background: 'rgba(255,180,180,0.12)', padding: '10px', borderRadius: '6px' }}>{error}</p>}
          {exito && <p style={{ color: '#a9f0b4', background: 'rgba(169,240,180,0.12)', padding: '10px', borderRadius: '6px' }}>{exito}</p>}

          <form onSubmit={guardarPerfil}>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="nombre" style={{ color: '#dce8e3' }}>Nombre</label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                style={estiloInput}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="email" style={{ color: '#dce8e3' }}>Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={estiloInput}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="password" style={{ color: '#dce8e3' }}>Nueva contraseña <span style={{ color: '#a9c9bb' }}>(opcional)</span></label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                placeholder="Déjala vacía para conservar la actual"
                style={estiloInput}
              />
            </div>

            <button type="submit" disabled={guardando} style={{
              padding: '10px 20px', backgroundColor: '#ccff00', color: '#12283d', border: 'none',
              borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer',
            }}>
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>

          <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.15)' }} />

          <button
            onClick={handleEliminarCuenta}
            disabled={eliminando}
            style={{
              padding: '10px 18px', backgroundColor: '#dc2626', color: 'white',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
            }}
          >
            {eliminando ? 'Eliminando...' : 'Eliminar mi cuenta'}
          </button>
          <p style={{ fontSize: '12px', color: '#a9c9bb', marginTop: '6px' }}>
            Esta acción borra permanentemente tu cuenta y todos tus datos.
          </p>
        </div>
      </main>
    </FondoPagina>
  );
}

export default Perfil;