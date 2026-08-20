import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import App from '../App';
import CrearLocal from './CrearLocal';
import Home from './Home';
import LocalDetalle from './LocalDetalle';
import Locales from './Locales';
import Login from './Login';
import Perfil from './Perfil';
import Publicaciones from './Publicaciones';
import Register from './Register';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div>{children}</div>,
  SwiperSlide: ({ children }) => <div>{children}</div>,
}));

vi.mock('swiper/modules', () => ({
  Autoplay: {},
  Pagination: {},
  Navigation: {},
  EffectFade: {},
}));

const token = 'header.eyJpZCI6MSwibm9tYnJlIjoiQW5hIiwicm9sIjoiYWRtaW4ifQ.signature';

const categoryData = {
  categorias: [{ id_categoria: 2, nombre: 'Gastronomía' }],
};
const municipalityData = {
  municipios: [{ id_municipio: 3, nombre: 'Armenia' }],
};
const localData = {
  local: {
    id_local: 8,
    id_usuario: 1,
    nombre: 'Café Andino',
    descripcion: 'Café de origen',
    direccion: 'Carrera 1',
    telefono: '5551234',
    categoria: 'Gastronomía',
    municipio: 'Armenia',
    imagen_url: null,
  },
};
const plansData = {
  planes: [{
    id_plan: 4,
    titulo: 'Festival de café',
    descripcion: 'Degustación',
    fecha_inicio: '2025-06-01',
    fecha_fin: '2025-06-02',
    imagen_url: null,
    precio: null,
  }],
};
const ratingsData = {
  calificaciones: [{
    id_resena: 6,
    id_usuario: 2,
    usuario: 'Luis',
    puntuacion: 5,
    comentario: 'Excelente',
  }],
  promedio: 5,
};

const response = (data, ok = true) => Promise.resolve({
  ok,
  json: async () => data,
});

const renderWithAuth = (element, initialEntries = ['/']) => render(
  <AuthProvider>
    <MemoryRouter initialEntries={initialEntries}>{element}</MemoryRouter>
  </AuthProvider>,
);

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  localStorage.clear();
  global.fetch = vi.fn();
  navigateMock.mockReset();
});

describe('Login page', () => {
  it('renders the form and submits a successful login', async () => {
    global.fetch.mockResolvedValue(response({ token }));
    const user = userEvent.setup();
    renderWithAuth(<Login />);

    await user.type(document.querySelector('input[type="email"]'), 'ana@example.com');
    await user.type(document.querySelector('input[type="password"]'), 'secreto');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/locales'));
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'ana@example.com', password: 'secreto' }),
    }));
    expect(localStorage.getItem('token')).toBe(token);
  });

  it('shows the API error when login fails', async () => {
    global.fetch.mockResolvedValue(response({ message: 'Credenciales inválidas' }, false));
    const user = userEvent.setup();
    renderWithAuth(<Login />);

    await user.type(document.querySelector('input[type="email"]'), 'ana@example.com');
    await user.type(document.querySelector('input[type="password"]'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});

describe('Register page', () => {
  it('submits the account form and displays the success message', async () => {
    global.fetch.mockResolvedValue(response({ message: 'ok' }));
    const user = userEvent.setup();
    renderWithAuth(<Register />);

    await user.type(document.querySelector('input[type="text"]'), 'Ana');
    await user.type(document.querySelector('input[type="email"]'), 'ana@example.com');
    await user.type(document.querySelector('input[type="password"]'), 'secreto');
    await user.selectOptions(document.querySelector('select'), 'comerciante');
    await user.click(screen.getByRole('button', { name: 'Registrarme' }));

    expect(await screen.findByText('¡Cuenta creada con éxito! Redirigiendo al login...')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/register', expect.objectContaining({
      body: JSON.stringify({
        nombre: 'Ana',
        email: 'ana@example.com',
        password: 'secreto',
        rol: 'comerciante',
      }),
    }));
  });

  it('shows server and connection errors', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue(response({ message: 'El correo ya existe' }, false));
    renderWithAuth(<Register />);

    await user.type(document.querySelector('input[type="text"]'), 'Ana');
    await user.type(document.querySelector('input[type="email"]'), 'ana@example.com');
    await user.type(document.querySelector('input[type="password"]'), 'secreto');
    await user.click(screen.getByRole('button', { name: 'Registrarme' }));
    expect(await screen.findByText('El correo ya existe')).toBeInTheDocument();

    global.fetch.mockRejectedValue(new Error('offline'));
    await user.click(screen.getByRole('button', { name: 'Registrarme' }));
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument();
  });
});

describe('Home page', () => {
  it('renders each city slide', () => {
    renderWithAuth(<Home />);

    expect(screen.getByRole('heading', { name: 'Armenia' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bogotá' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bucaramanga' })).toBeInTheDocument();
    expect(screen.getByAltText('Armenia')).toBeInTheDocument();
  });
});

describe('Locales page', () => {
  it('shows loading then populated locales and applies filters', async () => {
    const locales = {
      locales: [{
        id_local: 8,
        nombre: 'Café Andino',
        descripcion: 'Café de origen',
        categoria: 'Gastronomía',
        municipio: 'Armenia',
        direccion: 'Carrera 1',
        imagen_url: null,
      }],
    };
    const pendingLocales = deferred();
    global.fetch.mockImplementation((url) => {
      if (url.endsWith('/categorias')) return response(categoryData);
      if (url.endsWith('/municipios')) return response(municipalityData);
      return pendingLocales.promise;
    });
    const user = userEvent.setup();
    renderWithAuth(<Locales />);

    expect(screen.getByText('Cargando locales...')).toBeInTheDocument();
    pendingLocales.resolve(response(locales));
    expect(await screen.findByText('Café Andino')).toBeInTheDocument();
    expect(screen.getByText('Sin imagen')).toBeInTheDocument();

    global.fetch.mockImplementation((url) => {
      if (url.endsWith('/categorias')) return response(categoryData);
      if (url.endsWith('/municipios')) return response(municipalityData);
      return response(locales);
    });
    await user.type(screen.getByPlaceholderText('Buscar por nombre...'), 'café');
    await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith(
      'http://localhost:3000/api/locales?buscar=caf%C3%A9',
    ));
  });

  it('renders the empty state and handles a rejected request', async () => {
    global.fetch.mockImplementation((url) => (
      url.includes('/locales?') ? response({ locales: [] }) : response({})
    ));
    renderWithAuth(<Locales />);
    expect(await screen.findByText('No se encontraron locales.')).toBeInTheDocument();

    global.fetch.mockRejectedValue(new Error('offline'));
    renderWithAuth(<Locales />);
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument();
  });
});

describe('CrearLocal page', () => {
  it('loads options, validates required fields, and creates a local', async () => {
    localStorage.setItem('token', token);
    global.fetch.mockImplementation((url) => {
      if (url.endsWith('/categorias')) return response(categoryData);
      if (url.endsWith('/municipios')) return response(municipalityData);
      return response({ local: localData.local });
    });
    const user = userEvent.setup();
    renderWithAuth(<CrearLocal />);

    await screen.findByRole('option', { name: 'Gastronomía' });
    await user.click(screen.getByRole('button', { name: 'Crear local' }));
    expect(screen.getByText('Nombre y descripción son obligatorios.')).toBeInTheDocument();

    await user.type(document.querySelector('input[type="text"]'), 'Café Andino');
    await user.type(document.querySelector('textarea'), 'Café de origen');
    await user.type(document.querySelectorAll('input[type="text"]')[1], 'Carrera 1');
    await user.selectOptions(document.querySelectorAll('select')[0], '2');
    await user.selectOptions(document.querySelectorAll('select')[1], '3');
    await user.click(screen.getByRole('button', { name: 'Crear local' }));

    expect(await screen.findByText('¡Local creado con éxito!')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenLastCalledWith('http://localhost:3000/api/locales', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
    }));
  });

  it('shows an API error while creating a local', async () => {
    localStorage.setItem('token', token);
    global.fetch.mockImplementation((url) => {
      if (url.endsWith('/categorias')) return response(categoryData);
      if (url.endsWith('/municipios')) return response(municipalityData);
      return response({ message: 'No autorizado' }, false);
    });
    const user = userEvent.setup();
    renderWithAuth(<CrearLocal />);
    await user.type(document.querySelector('input[type="text"]'), 'Café');
    await user.type(document.querySelector('textarea'), 'Descripción');
    await user.click(screen.getByRole('button', { name: 'Crear local' }));

    expect(await screen.findByText('No autorizado')).toBeInTheDocument();
  });
});

describe('Perfil page', () => {
  it('shows loading, populates the form, and submits profile changes', async () => {
    localStorage.setItem('token', token);
    const pendingProfile = deferred();
    global.fetch.mockImplementation((url) => {
      if (url.endsWith('/perfil') && !url.includes('http')) return pendingProfile.promise;
      if (url.endsWith('/perfil')) return response({ usuario: { nombre: 'Ana', email: 'ana@example.com', rol: 'turista' } });
      return response({});
    });
    const user = userEvent.setup();
    renderWithAuth(<Perfil />);
    expect(screen.getByText('Cargando perfil...')).toBeInTheDocument();
    pendingProfile.resolve(response({ usuario: { nombre: 'Ana', email: 'ana@example.com', rol: 'turista' } }));
    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Nombre'));
    await user.type(screen.getByLabelText('Nombre'), 'Ana María');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Perfil actualizado correctamente.')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenLastCalledWith('http://localhost:3000/api/perfil', expect.objectContaining({
      method: 'PUT',
      body: expect.stringContaining('Ana María'),
    }));
  });

  it('shows validation and fetch errors', async () => {
    localStorage.setItem('token', token);
    global.fetch.mockRejectedValue(new Error('offline'));
    renderWithAuth(<Perfil />);
    expect(await screen.findByText('offline')).toBeInTheDocument();

    cleanup();
    global.fetch.mockResolvedValue(response({ usuario: { nombre: 'Ana', email: 'ana@example.com' } }));
    const user = userEvent.setup();
    renderWithAuth(<Perfil />);
    await user.clear(await screen.findByLabelText('Nombre'));
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar cambios' }).closest('form'));
    expect(screen.getByText('El nombre y el correo son obligatorios.')).toBeInTheDocument();
  });
});

describe('Publicaciones page', () => {
  const publication = {
    id: 12,
    id_usuario: 1,
    autor: 'Ana',
    contenido: 'Una recomendación',
    fecha_creacion: '2025-01-01T12:00:00.000Z',
    imagen_url: null,
  };

  it('loads publications and creates, edits, and deletes an authored post', async () => {
    localStorage.setItem('token', token);
    global.fetch.mockImplementation((url) => {
      if (url.endsWith('/publicaciones')) return response({ publicaciones: [publication] });
      return response({ message: 'ok' });
    });
    const user = userEvent.setup();
    renderWithAuth(<Publicaciones />);

    expect(screen.getByText('Cargando publicaciones...')).toBeInTheDocument();
    expect(await screen.findByText('Una recomendación')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('¿Qué quieres compartir?'), 'Nueva publicación');
    await user.click(screen.getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/publicaciones',
      expect.objectContaining({ method: 'POST' }),
    ));

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const editArea = screen.getByDisplayValue('Una recomendación');
    await user.clear(editArea);
    await user.type(editArea, 'Recomendación editada');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/publicaciones/12',
      expect.objectContaining({ method: 'PUT' }),
    ));

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/publicaciones/12',
      expect.objectContaining({ method: 'DELETE' }),
    ));
    window.confirm.mockRestore();
  });

  it('shows empty and connection-error states', async () => {
    global.fetch.mockResolvedValue(response({ publicaciones: [] }));
    renderWithAuth(<Publicaciones />);
    expect(await screen.findByText('Aún no hay publicaciones.')).toBeInTheDocument();

    global.fetch.mockRejectedValue(new Error('offline'));
    renderWithAuth(<Publicaciones />);
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument();
  });
});

describe('LocalDetalle page', () => {
  it('loads details and submits a rating with a comment and a plan', async () => {
    localStorage.setItem('token', token);
    global.fetch.mockImplementation((url) => {
      if (url.endsWith('/locales/8')) return response(localData);
      if (url.endsWith('/calificaciones')) return response(ratingsData);
      if (url.endsWith('/planes')) return response(plansData);
      return response({ message: 'ok' });
    });
    const user = userEvent.setup();
    renderWithAuth(
      <Routes>
        <Route path="/locales/:id" element={<LocalDetalle />} />
      </Routes>,
      ['/locales/8'],
    );

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Café Andino' })).toBeInTheDocument();
    expect(screen.getByText('Festival de café')).toBeInTheDocument();
    expect(screen.getByText('Excelente')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox'), '4');
    await user.type(document.querySelectorAll('textarea')[1], 'Muy recomendado');
    await user.click(screen.getByRole('button', { name: 'Enviar calificación' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/locales/8/calificaciones',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ puntuacion: 4, comentario: 'Muy recomendado' }) }),
    ));

    await user.type(document.querySelector('input[type="text"]'), 'Noche de café');
    await user.type(document.querySelectorAll('input[type="date"]')[0], '2025-07-01');
    await user.type(document.querySelectorAll('input[type="date"]')[1], '2025-07-02');
    await user.click(screen.getByRole('button', { name: 'Crear promoción/evento' }));
    expect(await screen.findByText('¡Promoción/evento creado con éxito!')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/locales/8/planes',
      expect.objectContaining({ method: 'POST' }),
    );

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/planes/4',
      expect.objectContaining({ method: 'PUT' }),
    ));

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/planes/4',
      expect.objectContaining({ method: 'DELETE' }),
    ));
    window.confirm.mockRestore();
  });

  it('shows loading and the error state when details cannot be loaded', async () => {
    const pending = deferred();
    global.fetch.mockReturnValue(pending.promise);
    renderWithAuth(
      <Routes>
        <Route path="/locales/:id" element={<LocalDetalle />} />
      </Routes>,
      ['/locales/8'],
    );
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    pending.reject(new Error('offline'));
    expect(await screen.findByText('No se pudo cargar el local.')).toBeInTheDocument();
  });
});

describe('App routing', () => {
  it('renders a public route and redirects a protected route', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Requintu - Iniciar sesión' })).toBeInTheDocument();

    cleanup();
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/perfil']}>
          <Routes>
            <Route path="*" element={<App />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(await screen.findByRole('heading', { name: 'Requintu - Iniciar sesión' })).toBeInTheDocument();
  });
});
