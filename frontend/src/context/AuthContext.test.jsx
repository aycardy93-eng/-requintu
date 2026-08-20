import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const encodeToken = (payload) => {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const base64 = btoa(binary);
  const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${base64url}.signature`;
};

function AuthConsumer() {
  const { usuario, token, isAuthenticated, login, logout } = useAuth();

  return (
    <>
      <output data-testid="token">{token || 'none'}</output>
      <output data-testid="user">{usuario ? JSON.stringify(usuario) : 'none'}</output>
      <output data-testid="authenticated">{String(isAuthenticated)}</output>
      <button onClick={() => login(encodeToken({ id: 2, nombre: 'Nuevo' }))}>login</button>
      <button onClick={logout}>logout</button>
    </>
  );
}

const renderAuth = () => render(<AuthProvider><AuthConsumer /></AuthProvider>);

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts unauthenticated without a stored token', () => {
    renderAuth();

    expect(screen.getByTestId('token')).toHaveTextContent('none');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('decodes a valid base64url token and authenticates the user', () => {
    const token = encodeToken({ id: 1, nombre: '😀', rol: 'turista' });
    expect(token).toContain('-');
    localStorage.setItem('token', token);

    renderAuth();

    expect(screen.getByTestId('user')).toHaveTextContent('"nombre":"😀"');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
  });

  it('treats malformed and expired tokens as unauthenticated', () => {
    localStorage.setItem('token', 'garbage');
    const { unmount } = renderAuth();
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');

    unmount();
    localStorage.setItem('token', encodeToken({ id: 1, exp: Math.floor(Date.now() / 1000) - 1 }));
    renderAuth();
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('persists a login token and removes it on logout', async () => {
    const user = userEvent.setup();
    renderAuth();

    await user.click(screen.getByRole('button', { name: 'login' }));
    await waitFor(() => expect(localStorage.getItem('token')).toBe(screen.getByTestId('token').textContent));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');

    await user.click(screen.getByRole('button', { name: 'logout' }));
    await waitFor(() => expect(localStorage.getItem('token')).toBeNull());
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });
});
