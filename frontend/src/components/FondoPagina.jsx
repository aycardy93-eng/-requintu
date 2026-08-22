import fondoMar from '../assets/fondo-mapa.jpg';

/**
 * Envuelve el contenido de cualquier página con la foto de fondo del mar
 * y una capa oscura semitransparente encima, para que el texto siga
 * siendo legible. Se usa en todas las páginas internas de Requintu
 * (Publicaciones, Locales, Perfil, etc.) para mantener una identidad
 * visual consistente en toda la app.
 *
 * Uso:
 *   <FondoPagina>
 *     ...contenido de la página...
 *   </FondoPagina>
 */
function FondoPagina({ children, opacidad = 0.72 }) {
  const estilo = {
    minHeight: '100vh',
    backgroundImage: `linear-gradient(rgba(6, 26, 20, ${opacidad}), rgba(6, 26, 20, ${opacidad})), url(${fondoMar})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    color: 'white',
  };

  return <div style={estilo}>{children}</div>;
}

export default FondoPagina;