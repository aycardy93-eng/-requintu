import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import Navbar from './Navbar';

const token = 'header.eyJpZCI6MX0.signature';

const renderNavbar = () => render(
  <AuthProvider>
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  </AuthProvider>,
);

describe('Navbar', () => {
  beforeEach(() => localStorage.clear());

  it('renders public navigation and the login link when logged out', () => {
    renderNavbar();

    expect(screen.getByText('Requintu')).toBeInTheDocument();
    expect(screen.getByText('Locales')).toBeInTheDocument();
    expect(screen.getByText('Publicaciones')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar / Registrarse' })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('Crear local')).not.toBeInTheDocument();
    expect(screen.queryByText('Mi perfil')).not.toBeInTheDocument();
  });

  it('renders private links and logs out the authenticated user', async () => {
    localStorage.setItem('token', token);
    const user = userEvent.setup();
    renderNavbar();

    expect(screen.getByText('Crear local')).toBeInTheDocument();
    expect(screen.getByText('Mi perfil')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByRole('link', { name: 'Entrar / Registrarse' })).toBeInTheDocument();
  });
});
