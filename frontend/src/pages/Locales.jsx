import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

function Locales() {
  const [locales, setLocales] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Cargar categorías y municipios una sola vez
  useEffect(() => {
    apiFetch('/categorias')
      .then((data) => setCategorias(data.categorias || []))
      .catch(() => {});

    apiFetch('/municipios')
      .then((data) => setMunicipios(data.municipios || []))
      .catch(() => {});
  }, []);

  // Cargar locales cada vez que cambian los filtros
  useEffect(() => {
    const params = new URLSearchParams();
    if (buscar) params.append('buscar', buscar);
    if (categoria) params.append('categoria', categoria);
    if (municipio) params.append('municipio', municipio);

    setCargando(true);
    setError('');

    apiFetch(`/locales?${params.toString()}`)
      .then((data) => {
        setLocales(data.locales || []);
        setCargando(false);
      })
      .catch(() => {
        setError('No se pudo conectar con el servidor.');
        setCargando(false);
      });
  }, [buscar, categoria, municipio]);

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', fontFamily: 'sans-serif', padding: '0 15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Locales turísticos</h1>
        <Link to="/">← Volver</Link>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          style={{ padding: '8px', flex: '1', minWidth: '200px' }}
        />

        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ padding: '8px' }}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
          ))}
        </select>

        <select value={municipio} onChange={(e) => setMunicipio(e.target.value)} style={{ padding: '8px' }}>
          <option value="">Todos los municipios</option>
          {municipios.map((m) => (
            <option key={m.id_municipio} value={m.id_municipio}>{m.nombre}</option>
          ))}
        </select>
      </div>

      {/* Estado de carga / error */}
      {cargando && <p>Cargando locales...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!cargando && !error && locales.length === 0 && <p>No se encontraron locales.</p>}

      {/* Lista de locales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {locales.map((local) => (
          <Link
            key={local.id_local}
            to={`/locales/${local.id_local}`}
            style={{
              border: '1px solid #ccc',
              borderRadius: '8px',
              overflow: 'hidden',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            {local.imagen_url ? (
              <img
                src={local.imagen_url}
                alt={local.nombre}
                style={{ width: '100%', height: '150px', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '150px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                Sin imagen
              </div>
            )}

            <div style={{ padding: '12px' }}>
              <h3 style={{ margin: '0 0 5px 0' }}>{local.nombre}</h3>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#555' }}>{local.descripcion}</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
                {local.categoria || 'Sin categoría'} · {local.municipio || 'Sin municipio'}
              </p>
              {local.direccion && (
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#888' }}>{local.direccion}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Locales;