import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'middleware-secret';
});

const { authenticateToken } = await import('../authMiddleware.js');

const run = (headers = {}) => {
  const req = { headers };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  const next = vi.fn();
  authenticateToken(req, res, next);
  return { req, res, next };
};

describe('authenticateToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a missing Authorization header', () => {
    const { res, next } = run();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Acceso denegado, token requerido.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a malformed token with 403', () => {
    const { res, next } = run({ authorization: 'Bearer not-a-jwt' });

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido o expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an expired token with 403', () => {
    const token = jwt.sign({ id: 2 }, 'middleware-secret', { expiresIn: -1 });
    const { res, next } = run({ authorization: `Bearer ${token}` });

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido o expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('uses JWT_SECRET and passes the verified user to next', () => {
    const user = { id: 7, email: 'user@example.com', rol: 'admin' };
    const token = jwt.sign(user, 'middleware-secret');
    const { req, next, res } = run({ authorization: `Bearer ${token}` });

    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toMatchObject(user);
    expect(next).toHaveBeenCalledOnce();
  });

  it('does not accept a token signed with another secret', () => {
    const token = jwt.sign({ id: 7 }, 'wrong-secret');
    const { res } = run({ authorization: `Bearer ${token}` });

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
