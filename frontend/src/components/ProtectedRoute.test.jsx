import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

const token = 'header.eyJpZCI6MX0.signature';

function renderRoute(initialEntries = ['/private']) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/private" element={<ProtectedRoute><span>private content</span></ProtectedRoute>} />
          <Route path="/login" element={<span>login page</span>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => localStorage.clear());

  it('redirects unauthenticated users to login', () => {
    renderRoute();

    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('private content')).not.toBeInTheDocument();
  });

  it('renders children for authenticated users', () => {
    localStorage.setItem('token', token);
    renderRoute();

    expect(screen.getByText('private content')).toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });
});
