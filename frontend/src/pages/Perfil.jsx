import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

function Perfil() {
  const { token } = useAuth();
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

  if (cargando) return <p style={{ padding: '20px' }}>Cargando perfil...</p>;

  return (
    <main style={{ maxWidth: '500px', margin: '40px auto', padding: '0 15px', fontFamily: 'sans-serif' }}>
      <h1>Mi perfil</h1>
      <p style={{ color: '#666' }}>Tipo de cuenta: <strong>{rol || 'usuario'}</strong></p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', margin: '20px 0' }}>
        {fotoPerfil ? (
          <img
            src={fotoPerfil}
            alt="Foto de perfil"
            style={{ width: '86px', height: '86px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #1b5e3a' }}
          />
        ) : (
          <div style={{ width: '86px', height: '86px', borderRadius: '50%', background: '#1b5e3a', color: 'white', display: 'grid', placeItems: 'center', fontSize: '32px', fontWeight: 'bold' }}>
            {(nombre || 'U').charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <label htmlFor="fotoPerfil">Foto de perfil</label>
          <input
            id="fotoPerfil"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={seleccionarFoto}
            style={{ display: 'block', marginTop: '6px' }}
          />
        </div>
      </div>

      {error && <p style={{ color: '#b00020', background: '#fee', padding: '10px' }}>{error}</p>}
      {exito && <p style={{ color: '#176b32', background: '#efe', padding: '10px' }}>{exito}</p>}

      <form onSubmit={guardarPerfil}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            style={{ boxSizing: 'border-box', display: 'block', width: '100%', marginTop: '5px', padding: '9px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ boxSizing: 'border-box', display: 'block', width: '100%', marginTop: '5px', padding: '9px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="password">Nueva contraseña <span style={{ color: '#666' }}>(opcional)</span></label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            placeholder="Déjala vacía para conservar la actual"
            style={{ boxSizing: 'border-box', display: 'block', width: '100%', marginTop: '5px', padding: '9px' }}
          />
        </div>

        <button type="submit" disabled={guardando} style={{ padding: '10px 18px' }}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </main>
  );
}

export default Perfil;
