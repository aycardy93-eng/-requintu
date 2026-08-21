import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';

export default function Locales() {
  const [searchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState(searchParams.get('municipio') || '');

  const [categorias, setCategorias] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [locales, setLocales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/categorias')
      .then((data) => setCategorias(data.categorias || []))
      .catch((err) => setError(err.message));

    apiFetch('/municipios')
      .then((data) => setMunicipios(data.municipios || []))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('buscar', searchTerm);
    if (selectedCategory) params.set('categoria', selectedCategory);
    if (selectedMunicipality) params.set('municipio', selectedMunicipality);

    setCargando(true);
    setError('');

    apiFetch(`/locales?${params.toString()}`)
      .then((data) => setLocales(data.locales || []))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [searchTerm, selectedCategory, selectedMunicipality]);

  const departamentos = useMemo(
    () => [...new Set(municipios.map((m) => m.departamento).filter(Boolean))].sort(),
    [municipios]
  );

  const municipiosVisibles = useMemo(
    () =>
      selectedDepartment
        ? municipios.filter((m) => m.departamento === selectedDepartment)
        : municipios,
    [municipios, selectedDepartment]
  );

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Locales turísticos</h1>
        <Link to="/" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: '500' }}>
          ← Volver
        </Link>
      </div>

      {/* Barra de Filtros */}
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '30px' }}>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1 1 200px',
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            fontSize: '14px'
          }}
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            backgroundColor: '#fff',
            fontSize: '14px'
          }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.id_categoria} value={cat.id_categoria}>
              {cat.nombre}
            </option>
          ))}
        </select>

        <select
          value={selectedDepartment}
          onChange={(e) => {
            setSelectedDepartment(e.target.value);
            setSelectedMunicipality(''); // Reinicia el municipio al cambiar de departamento
          }}
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            backgroundColor: '#fff',
            fontSize: '14px'
          }}
        >
          <option value="">Todos los departamentos</option>
          {departamentos.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        <select
          value={selectedMunicipality}
          onChange={(e) => setSelectedMunicipality(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            backgroundColor: '#fff',
            fontSize: '14px'
          }}
        >
          <option value="">Todos los municipios</option>
          {municipiosVisibles.map((muni) => (
            <option key={muni.id_municipio} value={muni.id_municipio}>
              {muni.nombre}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p style={{ color: '#b91c1c', marginBottom: '20px' }}>{error}</p>
      )}

      {cargando ? (
        <p style={{ color: '#6b7280' }}>Cargando locales...</p>
      ) : !error && locales.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No hay locales que coincidan con los filtros.</p>
      ) : (
        /* Grid de Tarjetas */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}
        >
          {locales.map((local) => (
            <Link
              key={local.id_local}
              to={`/locales/${local.id_local}`}
              style={{
                textDecoration: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                backgroundColor: '#fff'
              }}
            >
              <div
                style={{
                  height: '180px',
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#9ca3af'
                }}
              >
                {local.imagen_url ? (
                  <img
                    src={local.imagen_url}
                    alt={local.nombre}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  'Sin imagen'
                )}
              </div>
              <div style={{ padding: '15px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#111827' }}>{local.nombre}</h3>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4b5563' }}>{local.descripcion}</p>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#6b7280' }}>
                  {[local.categoria, local.municipio].filter(Boolean).join(' · ')}
                </p>
                {local.direccion && (
                  <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>{local.direccion}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
