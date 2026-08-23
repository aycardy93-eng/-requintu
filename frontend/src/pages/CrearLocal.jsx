import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FondoPagina from '../components/FondoPagina';

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
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState('');
  const [idMunicipio, setIdMunicipio] = useState('');
  const [imagenFile, setImagenFile] = useState(null);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Cargar categorías y municipios al montar el componente.
  // /api/categorias y /api/municipios devuelven el arreglo directo
  // (no envuelto en { categorias: [...] }), así que se usa `data` tal cual.
  useEffect(() => {
    fetch(`${API_URL}/categorias`)
      .then((res) => res.json())
      .then((data) => setCategorias(Array.isArray(data) ? data : []))
      .catch(() => setCategorias([]));

    fetch(`${API_URL}/municipios`)
      .then((res) => res.json())
      .then((data) => setMunicipios(Array.isArray(data) ? data : []))
      .catch(() => setMunicipios([]));
  }, []);

  // Departamentos únicos, derivados de la lista de municipios
  const departamentos = [...new Set(municipios.map((m) => m.departamento).filter(Boolean))].sort();

  // Municipios filtrados según el departamento elegido, para no navegar los 1122 de golpe
  const municipiosFiltrados = departamentoSeleccionado
    ? municipios.filter((m) => m.departamento === departamentoSeleccionado)
    : municipios;

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
          throw new Error(uploadData.error || 'Error al subir la imagen.');
        }

        imagen_url = uploadData.url;
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
        throw new Error(localData.error || 'Error al crear el local.');
      }

      setExito('¡Local creado con éxito!');
      setTimeout(() => navigate('/locales'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const estiloInput = {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    color: '#12283d',
  };

  return (
    <FondoPagina>
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 20px' }}>
        <div
          style={{
            background: 'rgba(18, 40, 61, 0.85)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '30px',
          }}
        >
          <h1 style={{ marginTop: 0 }}>Crear nuevo local</h1>

          {error && (
            <p style={{ color: '#ffb4b4', background: 'rgba(255, 180, 180, 0.12)', padding: '8px', borderRadius: '6px' }}>{error}</p>
          )}
          {exito && (
            <p style={{ color: '#a9f0b4', background: 'rgba(169, 240, 180, 0.12)', padding: '8px', borderRadius: '6px' }}>{exito}</p>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label>Nombre:</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={estiloInput}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Descripción:</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                style={{ ...estiloInput, minHeight: '80px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Dirección:</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                style={estiloInput}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Teléfono:</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                style={estiloInput}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Categoría:</label>
              <select
                value={idCategoria}
                onChange={(e) => setIdCategoria(e.target.value)}
                style={estiloInput}
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
              <label>Departamento:</label>
              <select
                value={departamentoSeleccionado}
                onChange={(e) => {
                  setDepartamentoSeleccionado(e.target.value);
                  setIdMunicipio(''); // Reinicia el municipio al cambiar de departamento
                }}
                style={estiloInput}
              >
                <option value="">-- Selecciona --</option>
                {departamentos.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Municipio:</label>
              <select
                value={idMunicipio}
                onChange={(e) => setIdMunicipio(e.target.value)}
                style={estiloInput}
              >
                <option value="">-- Selecciona --</option>
                {municipiosFiltrados.map((mun) => (
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

            <button
              type="submit"
              disabled={cargando}
              style={{
                padding: '10px 20px',
                background: '#ccff00',
                color: '#0284c7',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {cargando ? 'Creando...' : 'Crear local'}
            </button>
          </form>
        </div>
      </div>
    </FondoPagina>
  );
}

export default CrearLocal;
