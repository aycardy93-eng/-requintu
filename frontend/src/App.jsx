
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
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#12283d' }}>
              <h1 style={{ fontSize: '48px', margin: 0 }}>404</h1>
              <p>La página que buscas no existe.</p>
              <Link to="/" style={{ color: '#38bdf8', fontWeight: 'bold' }}>Volver al inicio</Link>
            </div>
          }
        />
      </Routes>
    </>
  );
}

export default App;