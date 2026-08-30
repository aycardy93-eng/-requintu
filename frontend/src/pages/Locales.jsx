import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import FondoPagina from '../components/FondoPagina';
import BACKEND_ORIGIN, { API_URL } from '../config';

const resolverImagenUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BACKEND_ORIGIN}${url}`;
};

export default function Locales() {
  const [locales, setLocales] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [searchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoria') || '');
  const [selectedDepartment, setSelectedDepartment] = useState(searchParams.get('departamento') || '');
  const [selectedMunicipality, setSelectedMunicipality] = useState(searchParams.get('municipio') || '');

  // Catálogos para llenar los selects (categorías y municipios reales de la BD)
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

  // Locales filtrados: se piden al backend cada vez que cambia un filtro
  useEffect(() => {
    setCargando(true);
    setError('');

    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('buscar', searchTerm.trim());
    if (selectedCategory) params.append('categoria', selectedCategory);
    if (selectedDepartment) params.append('departamento', selectedDepartment);
    if (selectedMunicipality) params.append('municipio', selectedMunicipality);

    fetch(`${API_URL}/locales?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setLocales(data.locales || []);
        setCargando(false);
      })
      .catch(() => {
        setError('No se pudo conectar con el servidor.');
        setCargando(false);
      });
  }, [searchTerm, selectedCategory, selectedDepartment, selectedMunicipality]);

  // Departamentos únicos, derivados de la lista de municipios
  const departamentos = [...new Set(municipios.map((m) => m.departamento).filter(Boolean))].sort();

  // Municipios filtrados según el departamento elegido
  const municipiosFiltrados = selectedDepartment
    ? municipios.filter((m) => m.departamento === selectedDepartment)
    : municipios;

  const estiloInput = {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(18, 40, 61, 0.75)',
    color: '#ffffff',
    fontSize: '14px',
  };

  return (
    <FondoPagina>
      <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Locales turísticos</h1>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <Link to="/crear-local" style={{
              backgroundColor: '#ccff00', color: '#12283d', textDecoration: 'none',
              fontWeight: 'bold', padding: '8px 14px', borderRadius: '6px',
              transition: 'transform 0.12s ease, background-color 0.15s ease',
            }}>
              + Crear local
            </Link>
            <Link to="/" style={{ color: '#ccff00', textDecoration: 'none', fontWeight: '500' }}>
              ← Volver
            </Link>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '30px' }}>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...estiloInput, flex: '1 1 200px' }}
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={estiloInput}
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
            style={estiloInput}
          >
            <option value="">Todos los departamentos</option>
            {departamentos.map((dep) => (
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>

          <select
            value={selectedMunicipality}
            onChange={(e) => setSelectedMunicipality(e.target.value)}
            style={estiloInput}
          >
            <option value="">Todos los municipios</option>
            {municipiosFiltrados.map((m) => (
              <option key={m.id_municipio} value={m.id_municipio}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        {cargando && <p>Cargando locales...</p>}
        {error && <p style={{ color: '#ffb4b4' }}>{error}</p>}
        {!cargando && !error && locales.length === 0 && <p>No se encontraron locales con esos filtros.</p>}
        {!cargando && !error && locales.length > 0 && (
          <p style={{ color: '#a9c9bb', fontSize: '14px', margin: '0 0 12px 0' }}>
            {locales.length} {locales.length === 1 ? 'lugar encontrado' : 'lugares encontrados'} en Colombia
          </p>
        )}

        {/* Grid de Tarjetas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {locales.map((local) => (
            <Link
              key={local.id_local}
              to={`/locales/${local.id_local}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  backgroundColor: 'rgba(18, 40, 61, 0.75)',
                  height: '100%',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.35)';
                  e.currentTarget.style.borderColor = 'rgba(204,255,0,0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
              >
                <div
                  style={{
                    height: '180px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
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
                    'Sin imagen'
                  )}
                </div>
                <div style={{ padding: '15px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#ffffff' }}>{local.nombre}</h3>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#dce8e3' }}>{local.descripcion}</p>
                  <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#a9c9bb' }}>
                    {local.categoria_nombre}
                    {local.municipio_nombre ? ` · ${local.municipio_nombre}` : ''}
                    {local.departamento ? `, ${local.departamento}` : ''}
                  </p>
                  {local.direccion && (
                    <p style={{ margin: 0, fontSize: '13px', color: '#8aa6a0' }}>{local.direccion}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </FondoPagina>
  );
}