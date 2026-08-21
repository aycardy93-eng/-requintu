import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api';

// Coordenadas aproximadas (latitud, longitud) de la capital de cada departamento.
// Se usan como referencia geográfica para ubicar cada departamento en su posición
// real relativa dentro del mapa, en lugar de una cuadrícula arbitraria.
const COORDENADAS = {
  'Amazonas': { lat: -4.21, lon: -69.94 },
  'Antioquia': { lat: 6.25, lon: -75.58 },
  'Arauca': { lat: 7.09, lon: -70.76 },
  'Atlántico': { lat: 10.96, lon: -74.80 },
  'Bolívar': { lat: 9.6, lon: -74.6 },
  'Boyacá': { lat: 5.53, lon: -73.36 },
  'Caldas': { lat: 5.3, lon: -75.4 },
  'Caquetá': { lat: 1.0, lon: -74.5 },
  'Casanare': { lat: 5.6, lon: -71.8 },
  'Cauca': { lat: 2.44, lon: -76.9 },
  'Cesar': { lat: 9.5, lon: -73.4 },
  'Chocó': { lat: 5.9, lon: -76.9 },
  'Córdoba': { lat: 8.4, lon: -75.9 },
  'Cundinamarca': { lat: 4.9, lon: -74.2 },
  'Bogotá D.C.': { lat: 4.61, lon: -74.08 },
  'Guainía': { lat: 2.8, lon: -68.5 },
  'Guaviare': { lat: 1.8, lon: -72.5 },
  'Huila': { lat: 2.5, lon: -75.6 },
  'La Guajira': { lat: 11.6, lon: -72.5 },
  'Magdalena': { lat: 10.4, lon: -74.2 },
  'Meta': { lat: 3.6, lon: -73.0 },
  'Nariño': { lat: 1.2, lon: -77.6 },
  'Norte de Santander': { lat: 8.1, lon: -72.9 },
  'Putumayo': { lat: 0.4, lon: -76.2 },
  'Quindío': { lat: 4.53, lon: -75.68 },
  'Risaralda': { lat: 5.1, lon: -76.0 },
  'Santander': { lat: 6.9, lon: -73.3 },
  'Sucre': { lat: 9.1, lon: -75.1 },
  'Tolima': { lat: 3.9, lon: -75.2 },
  'Valle del Cauca': { lat: 3.9, lon: -76.6 },
  'Vaupés': { lat: 0.7, lon: -70.5 },
  'Vichada': { lat: 4.9, lon: -69.0 },
};

// San Andrés y Providencia se muestra aparte en una casilla fija (recuadro),
// tal como aparece en los mapas oficiales de Colombia, por estar muy lejos
// del territorio continental.
const NOMBRE_SAN_ANDRES = 'Archipiélago de San Andrés, Providencia y Santa Catalina';

const LON_MIN = -79.2;
const LON_MAX = -66.8;
const LAT_MIN = -4.5;
const LAT_MAX = 12.6;

// Convierte coordenadas geográficas a un porcentaje (0-100) dentro del contenedor,
// preservando la proporción real del territorio colombiano.
function proyectar(lat, lon) {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * 100;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 100;
  return { x, y };
}

function MapaColombia() {
  const navigate = useNavigate();

  const [departamentos, setDepartamentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState(null);
  const [municipios, setMunicipios] = useState([]);
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/departamentos`)
      .then((res) => res.json())
      .then((data) => {
        setDepartamentos(data.departamentos || []);
        setCargando(false);
      })
      .catch(() => {
        setError('No se pudo cargar el mapa. Verifica que el servidor esté corriendo.');
        setCargando(false);
      });
  }, []);

  const abrirDepartamento = (nombreDepartamento) => {
    setDepartamentoSeleccionado(nombreDepartamento);
    setCargandoMunicipios(true);
    setMunicipios([]);

    fetch(`${API_URL}/departamentos/${encodeURIComponent(nombreDepartamento)}/municipios`)
      .then((res) => res.json())
      .then((data) => {
        setMunicipios(data.municipios || []);
        setCargandoMunicipios(false);
      })
      .catch(() => setCargandoMunicipios(false));
  };

  const volverAlMapa = () => {
    setDepartamentoSeleccionado(null);
    setMunicipios([]);
  };

  const irALocalesDelMunicipio = (idMunicipio) => {
    navigate(`/locales?municipio=${idMunicipio}`);
  };

  const estiloPagina = {
    minHeight: '100vh',
    background: '#0d3b2e',
    padding: '30px 15px',
    fontFamily: 'sans-serif',
    color: 'white',
  };

  if (cargando) {
    return <div style={estiloPagina}><p>Cargando mapa...</p></div>;
  }

  if (error) {
    return <div style={estiloPagina}><p style={{ color: '#ffb4b4' }}>{error}</p></div>;
  }

  return (
    <div style={estiloPagina}>
      <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center', marginBottom: '25px' }}>
        <h1 style={{ margin: '0 0 8px 0' }}>Explora Colombia por departamento</h1>
        <p style={{ color: '#a9c9bb', margin: 0 }}>
          Toca un departamento, elige el municipio y descubre los locales recomendados por la gente.
        </p>
      </div>

      <div
        style={{
          maxWidth: '620px',
          margin: '0 auto',
          background: '#12283d',
          borderRadius: '20px',
          padding: '30px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        }}
      >
        {!departamentoSeleccionado ? (
          // ===== VISTA: MAPA COMPLETO DE DEPARTAMENTOS =====
          <div
            style={{
              position: 'relative',
              width: '100%',
              // Colombia continental es más alta que ancha; esta proporción
              // respeta el rango real de latitud/longitud usado en la proyección.
              paddingBottom: `${((LAT_MAX - LAT_MIN) / (LON_MAX - LON_MIN)) * 100}%`,
            }}
          >
            {departamentos
              .filter((dep) => dep.departamento !== NOMBRE_SAN_ANDRES)
              .map((dep) => {
                const coords = COORDENADAS[dep.departamento];
                if (!coords) return null; // por si algún nombre no coincide, no rompe el mapa

                const pos = proyectar(coords.lat, coords.lon);

                return (
                  <button
                    key={dep.departamento}
                    onClick={() => abrirDepartamento(dep.departamento)}
                    title={`${dep.departamento} — ${dep.total_municipios} municipios`}
                    style={{
                      position: 'absolute',
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '34px',
                      height: '34px',
                      background: '#e8b93a',
                      border: '2px solid #12283d',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      transition: 'transform 0.15s, background 0.15s',
                      padding: 0,
                      zIndex: 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ffd45e';
                      e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.3)';
                      e.currentTarget.style.zIndex = 10;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#e8b93a';
                      e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                      e.currentTarget.style.zIndex = 1;
                    }}
                  />
                );
              })}

            {/* Recuadro fijo para San Andrés, Providencia y Santa Catalina,
                igual que en los mapas oficiales de Colombia */}
            {departamentos.some((d) => d.departamento === NOMBRE_SAN_ANDRES) && (
              <button
                onClick={() => abrirDepartamento(NOMBRE_SAN_ANDRES)}
                title="San Andrés, Providencia y Santa Catalina"
                style={{
                  position: 'absolute',
                  left: '4%',
                  top: '2%',
                  width: '34px',
                  height: '34px',
                  background: '#e8b93a',
                  border: '2px dashed #a9c9bb',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  padding: 0,
                  zIndex: 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ffd45e';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#e8b93a';
                }}
              />
            )}
          </div>
        ) : (
          // ===== VISTA: MUNICIPIOS DEL DEPARTAMENTO SELECCIONADO (ZOOM) =====
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
            <button
              onClick={volverAlMapa}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffd45e',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '15px',
                padding: 0,
              }}
            >
              ← Volver al mapa
            </button>

            <h2 style={{ margin: '0 0 15px 0' }}>{departamentoSeleccionado}</h2>

            {cargandoMunicipios ? (
              <p>Cargando municipios...</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {municipios.map((m) => (
                  <button
                    key={m.id_municipio}
                    onClick={() => irALocalesDelMunicipio(m.id_municipio)}
                    style={{
                      background: '#e8b93a',
                      color: '#12283d',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#ffd45e')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#e8b93a')}
                  >
                    {m.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MapaColombia;