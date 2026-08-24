import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mapaSvgRaw from '../assets/co-departamentos.svg?raw';
import fondoMar from '../assets/fondo-mapa.jpg';
import { API_URL } from '../config';

// Mapea el id de cada <path> del SVG (simplemaps.com) al nombre EXACTO
// que usa la columna `departamento` en la tabla `municipios` de tu base de datos.
const ID_A_DEPARTAMENTO = {
  COAMA: 'Amazonas',
  COANT: 'Antioquia',
  COARA: 'Arauca',
  COATL: 'Atlántico',
  COBOL: 'Bolívar',
  COBOY: 'Boyacá',
  COCAL: 'Caldas',
  COCAQ: 'Caquetá',
  COCAS: 'Casanare',
  COCAU: 'Cauca',
  COCES: 'Cesar',
  COCHO: 'Chocó',
  COCOR: 'Córdoba',
  COCUN: 'Cundinamarca',
  CODC: 'Bogotá D.C.',
  COGUA: 'Guainía',
  COGUV: 'Guaviare',
  COHUI: 'Huila',
  COLAG: 'La Guajira',
  COMAG: 'Magdalena',
  COMET: 'Meta',
  CONAR: 'Nariño',
  CONSA: 'Norte de Santander',
  COPUT: 'Putumayo',
  COQUI: 'Quindío',
  CORIS: 'Risaralda',
  COSAN: 'Santander',
  COSAP: 'Archipiélago de San Andrés, Providencia y Santa Catalina',
  COSUC: 'Sucre',
  COTOL: 'Tolima',
  COVAC: 'Valle del Cauca',
  COVAU: 'Vaupés',
  COVID: 'Vichada',
};

function MapaColombia() {
  const navigate = useNavigate();
  const contenedorMapaRef = useRef(null);

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

  // Delegación de eventos: un solo listener detecta en qué <path> se hizo clic
  // dentro del SVG inyectado, y lo traduce al nombre real del departamento.
  const manejarClicMapa = (e) => {
    const path = e.target.closest('path[id]');
    if (!path) return;

    const nombre = ID_A_DEPARTAMENTO[path.id];
    if (!nombre) return;

    // Solo abrir si el backend realmente devolvió ese departamento
    const existe = departamentos.some((d) => d.departamento === nombre);
    if (existe) {
      abrirDepartamento(nombre);
    }
  };

  const estiloPagina = {
    minHeight: '100vh',
    backgroundImage: `linear-gradient(rgba(6, 26, 20, 0.72), rgba(6, 26, 20, 0.72)), url(${fondoMar})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
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
      {/* Estilos del SVG inyectado: se sobreponen a los colores por defecto
          del archivo (verde genérico) para combinar con la paleta de Requintu. */}
      <style>{`
        .mapa-colombia-svg {
          background: radial-gradient(circle at 40% 35%, #5cc8fb 0%, #38bdf8 55%, #1ea3e0 100%);
          border-radius: 14px;
          padding: 10px;
        }
        .mapa-colombia-svg svg {
          width: 100%;
          height: auto;
          display: block;
        }
        .mapa-colombia-svg path {
          fill: #d8c341;
          stroke: #0d3b2e;
          stroke-width: 1.2;
          cursor: pointer;
          transition: fill 0.15s ease;
        }
        .mapa-colombia-svg path:hover {
          fill: #f2df6e;
        }
        .mapa-colombia-svg path.seleccionado {
          fill: #ffcc33;
        }
        .mapa-colombia-svg text {
          font-size: 22px;
          font-weight: 700;
          font-family: sans-serif;
          fill: #ffffff;
          paint-order: stroke;
          stroke: #0d2c3f;
          stroke-width: 4px;
          pointer-events: none;
          user-select: none;
        }
      `}</style>

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
          // ===== VISTA: MAPA REAL DE COLOMBIA (SVG con contornos exactos) =====
          <div
            ref={contenedorMapaRef}
            className="mapa-colombia-svg"
            onClick={manejarClicMapa}
            dangerouslySetInnerHTML={{ __html: mapaSvgRaw }}
          />
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
