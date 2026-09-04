
import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Publicaciones from './pages/Publicaciones';
import Home from './pages/Home';
import Locales from './pages/Locales';
import CrearLocal from './pages/CrearLocal';
import LocalDetalle from './pages/LocalDetalle';
import Perfil from './pages/Perfil';
import OlvidePassword from './pages/OlvidePassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Admin from './pages/Admin';
import MapaColombia from './pages/MapaColombia';
import PoliticaPrivacidad from './pages/PoliticaPrivacidad';
import InstallBanner from './components/InstallBanner';
import Footer from './components/Footer';
import { Link } from 'react-router-dom';

function App() {
  useEffect(() => {
    let activo = true;

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        if (!activo) return;

        await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
      } catch {
        // No corre en navegador web, se ignora.
      }
    })();

    return () => {
      activo = false;
    };
  }, []);

  return (
    <>
      <Navbar />
      <InstallBanner />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/olvide-password" element={<OlvidePassword />} />

        <Route path="/politica-de-privacidad" element={<PoliticaPrivacidad />} />

        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/publicaciones"
          element={<Publicaciones />}
        />

        <Route
          path="/locales"
          element={<Locales />}
        />

        <Route
          path="/locales/:id"
          element={<LocalDetalle />}
        />

        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Perfil />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mapa"
          element={
            <ProtectedRoute>
              <MapaColombia />
            </ProtectedRoute>
          }
        />

        <Route
          path="/crear-local"
          element={
            <ProtectedRoute>
              <CrearLocal />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />

        <Route
          path="*"
          element={
            <div style={{
              minHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px 20px',
              color: '#e2f3ff',
            }}>
              <h1 style={{ fontSize: '52px', margin: 0, color: '#ccff00' }}>404</h1>
              <p>La página que buscas no existe.</p>
              <Link to="/" style={{
                color: '#ccff00', fontWeight: 'bold', textDecoration: 'none', marginTop: '12px',
                border: '1px solid #ccff00', padding: '8px 18px', borderRadius: '6px',
              }}>Volver al inicio</Link>
            </div>
          }
        />
      </Routes>

      <Footer />
    </>
  );
}

export default App;