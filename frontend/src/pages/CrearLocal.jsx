import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:3000/api';

function CrearLocal() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState([]);
  const [municipios, setMunicipios] = useState([]);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [idCategoria, setIdCategoria] = useState('');
  const [idMunicipio, setIdMunicipio] = useState('');
  const [imagenFile, setImagenFile] = useState(null);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Cargar categorías y municipios al montar el componente
  useEffect(() => {
    fetch(`${API_URL}/categorias`)
      .then((res) => res.json())
      .then((data) => setCategorias(data.categorias || []))
      .catch(() => setCategorias([]));

    fetch(`${API_URL}/municipios`)
      .then((res) => res.json())
      .then((data) => setMunicipios(data.municipios || []))
      .catch(() => setMunicipios([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    if (!nombre || !descripcion) {
      setError('Nombre y descripción son obligatorios.');
      return;
    }

    setCargando(true);

    try {
      let imagen_url = null;

      // 1. Si hay imagen seleccionada, subirla primero
      if (imagenFile) {
        const formData = new FormData();
        formData.append('imagen', imagenFile);

        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.message || 'Error al subir la imagen.');
        }

        imagen_url = uploadData.imagen_url;
      }

      // 2. Crear el local con (o sin) imagen_url
     const localRes = await fetch(`${API_URL}/locales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre,
          descripcion,
          direccion,
          telefono,
          imagen_url,
          id_categoria: idCategoria || null,
          id_municipio: idMunicipio || null,
        }),
      });

      const localData = await localRes.json();

      if (!localRes.ok) {
        throw new Error(localData.message || 'Error al crear el local.');
      }

      setExito('¡Local creado con éxito!');
      setTimeout(() => navigate('/locales'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '0 20px' }}>
      <h1>Crear nuevo local</h1>

      {error && (
        <p style={{ color: 'red', background: '#fee', padding: '8px' }}>{error}</p>
      )}
      {exito && (
        <p style={{ color: 'green', background: '#efe', padding: '8px' }}>{exito}</p>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Nombre:</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Descripción:</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={{ width: '100%', padding: '8px', minHeight: '80px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Dirección:</label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Teléfono:</label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Categoría:</label>
          <select
            value={idCategoria}
            onChange={(e) => setIdCategoria(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="">-- Selecciona --</option>
            {categorias.map((cat) => (
              <option key={cat.id_categoria} value={cat.id_categoria}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Municipio:</label>
          <select
            value={idMunicipio}
            onChange={(e) => setIdMunicipio(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="">-- Selecciona --</option>
            {municipios.map((mun) => (
              <option key={mun.id_municipio} value={mun.id_municipio}>
                {mun.nombre}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Imagen (opcional):</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => setImagenFile(e.target.files[0])}
            style={{ display: 'block', marginTop: '5px' }}
          />
        </div>

        <button type="submit" disabled={cargando} style={{ padding: '10px 20px' }}>
          {cargando ? 'Creando...' : 'Crear local'}
        </button>
      </form>
    </div>
  );
}

export default CrearLocal;