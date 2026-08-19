import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Home() {
  const { logout } = useAuth();

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h1>Bienvenido a Requintu</h1>
      <p>Ya iniciaste sesión correctamente. Esta pantalla solo es visible con un token válido.</p>

      <p><Link to="/locales">Ver locales turísticos</Link></p>

      <button onClick={logout} style={{ padding: '10px 20px' }}>
        Cerrar sesión
      </button>
    </div>
  );
}

export default Home;