import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api';

// Posición aproximada (columna, fila) de cada departamento en una cuadrícula de 10x11,
// ubicada según su posición real en el mapa de Colombia (norte arriba, sur abajo, oeste izquierda, este derecha)
const POSICIONES = {
  'Archipiélago de San Andrés, Providencia y Santa Catalina': { col: 1, row: 1 },
  'La Guajira': { col: 8, row: 1 },
  'Atlántico': { col: 5, row: 2 },
  'Magdalena': { col: 6, row: 2 },
  'Cesar': { col: 7, row: 2 },
  'Bolívar': { col: 5, row: 3 },
  'Sucre': { col: 4, row: 3 },
  'Córdoba': { col: 3, row: 3 },
  'Norte de Santander': { col: 8, row: 3 },
  'Santander': { col: 7, row: 4 },
  'Antioquia': { col: 4, row: 4 },
  'Chocó': { col: 2, row: 4 },
  'Arauca': { col: 9, row: 4 },
  'Boyacá': { col: 7, row: 5 },
  'Casanare': { col: 8, row: 5 },
  'Caldas': { col: 4, row: 5 },
  'Risaralda': { col: 3, row: 5 },
  'Quindío': { col: 3, row: 6 },
  'Cundinamarca': { col: 6, row: 6 },
  'Bogotá D.C.': { col: 6, row: 7 },
  'Tolima': { col: 5, row: 6 },
  'Vichada': { col: 9, row: 6 },
  'Valle del Cauca': { col: 2, row: 6 },
  'Meta': { col: 7, row: 7 },
  'Guainía': { col: 9, row: 7 },
  'Huila': { col: 5, row: 7 },
  'Cauca': { col: 3, row: 7 },
  'Guaviare': { col: 7, row: 8 },
  'Nariño': { col: 2, row: 8 },
  'Vaupés': { col: 8, row: 8 },
  'Putumayo': { col: 4, row: 9 },
  'Caquetá': { col: 5, row: 9 },
  'Amazonas': { col: 6, row: 10 },
};

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
          maxWidth: '700px',
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
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gridTemplateRows: 'repeat(11, 32px)',
              gap: '4px',
            }}
          >
            {departamentos.map((dep) => {
              const pos = POSICIONES[dep.departamento];
              if (!pos) return null; // por si algún nombre no coincide, no rompe el mapa

              return (
                <button
                  key={dep.departamento}
                  onClick={() => abrirDepartamento(dep.departamento)}
                  title={`${dep.departamento} — ${dep.total_municipios} municipios`}
                  style={{
                    gridColumn: pos.col,
                    gridRow: pos.row,
                    background: '#e8b93a',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s, background 0.15s',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ffd45e';
                    e.currentTarget.style.transform = 'scale(1.15)';
                    e.currentTarget.style.zIndex = 10;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e8b93a';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.zIndex = 1;
                  }}
                />
              );
            })}
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