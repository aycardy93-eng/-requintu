import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Publicaciones from './pages/Publicaciones';
import Home from './pages/Home';
import Locales from './pages/Locales';
import CrearLocal from './pages/CrearLocal';
import LocalDetalle from './pages/LocalDetalle';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/publicaciones" element={<Publicaciones />} />
        <Route path="/locales" element={<Locales />} />
        <Route path="/locales/:id" element={<LocalDetalle />} />
        <Route
          path="/crear-local"
          element={
            <ProtectedRoute>
              <CrearLocal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;