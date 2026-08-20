import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query } = vi.hoisted(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'secreto';
  return { query: vi.fn() };
});

vi.mock('../db.js', () => ({ default: { query } }));

const { default: app } = await import('../index.js');

const userToken = (payload = {}) => jwt.sign({ id: 1, rol: 'turista', ...payload }, 'secreto');
const auth = (payload) => ({ Authorization: `Bearer ${userToken(payload)}` });
const fail = (error = new Error('db failure')) => query.mockRejectedValueOnce(error);
const json = (method, url, body, headers) => {
  const req = request(app)[method](url);
  if (headers) req.set(headers);
  return body === undefined ? req : req.send(body);
};
const expectServerError = async (method, url, body, headers) => {
  fail();
  const response = await json(method, url, body, headers);
  expect(response.status).toBe(500);
  expect(response.body).toEqual({ message: 'Error en el servidor', error: 'db failure' });
};

beforeEach(() => {
  query.mockReset();
});

describe('authentication used by index routes', () => {
  it('returns 401 when a protected route has no token', async () => {
    const response = await request(app).post('/api/publicaciones').send({ contenido: 'hola' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Token requerido' });
  });

  it('returns 403 for an invalid token', async () => {
    const response = await request(app)
      .post('/api/publicaciones')
      .set('Authorization', 'Bearer invalid')
      .send({ contenido: 'hola' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Token inválido' });
  });

  it.each([
    ['put', '/api/publicaciones/1', { contenido: 'x' }],
    ['delete', '/api/publicaciones/1'],
    ['post', '/api/locales', { nombre: 'L', descripcion: 'D' }],
    ['put', '/api/locales/1', { nombre: 'L', descripcion: 'D' }],
    ['delete', '/api/locales/1'],
    ['post', '/api/locales/1/calificaciones', { puntuacion: 4 }],
    ['put', '/api/calificaciones/1', { puntuacion: 4 }],
    ['delete', '/api/calificaciones/1'],
    ['post', '/api/locales/1/planes', { titulo: 'P', fecha_inicio: '2026-01-01', fecha_fin: '2026-01-02' }],
    ['put', '/api/planes/1', { titulo: 'P', fecha_inicio: '2026-01-01', fecha_fin: '2026-01-02' }],
    ['delete', '/api/planes/1'],
    ['get', '/api/perfil'],
    ['put', '/api/perfil', { nombre: 'A', email: 'a@b.com' }],
    ['post', '/api/upload'],
  ])('returns 401 for protected %s %s without a token', async (method, url, body) => {
    const response = await json(method, url, body);
    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/Token requerido/);
  });
});

describe('login and registration', () => {
  it('logs in with a valid password', async () => {
    const passwordHash = await bcrypt.hash('secret', 4);
    query.mockResolvedValueOnce([[{ id_usuario: 1, email: 'a@b.com', rol: 'turista', password_hash: passwordHash }]]);

    const response = await request(app).post('/api/login').send({ email: 'a@b.com', password: 'secret' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login exitoso');
    expect(jwt.verify(response.body.token, 'secreto')).toMatchObject({ id: 1, email: 'a@b.com', rol: 'turista' });
  });

  it('rejects an unknown user and a wrong password', async () => {
    query.mockResolvedValueOnce([[]]);
    const unknown = await request(app).post('/api/login').send({ email: 'missing', password: 'secret' });
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual({ message: 'Usuario no encontrado' });

    const hash = await bcrypt.hash('other', 4);
    query.mockResolvedValueOnce([[{ password_hash: hash }]]);
    const wrong = await request(app).post('/api/login').send({ email: 'a@b.com', password: 'secret' });
    expect(wrong.status).toBe(401);
    expect(wrong.body).toEqual({ message: 'Contraseña incorrecta' });
  });

  it('handles login database failures', () => expectServerError('post', '/api/login', { email: 'a@b.com', password: 'x' }));

  it('validates registration, rejects duplicate email, and creates a user', async () => {
    const invalid = await request(app).post('/api/register').send({ email: 'a@b.com' });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ message: 'Todos los campos son obligatorios.' });

    query.mockResolvedValueOnce([[{ id_usuario: 2 }]]);
    const duplicate = await request(app).post('/api/register').send({ nombre: 'A', email: 'a@b.com', password: 'x' });
    expect(duplicate.status).toBe(400);
    expect(duplicate.body).toEqual({ message: 'El correo ya está registrado.' });

    query.mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ insertId: 3 }]);
    const created = await request(app).post('/api/register').send({ nombre: 'A', email: 'a@b.com', password: 'x' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ message: 'Usuario registrado con éxito', usuario: { id: 3, rol: 'turista' } });
  });

  it('handles registration database failures', () => expectServerError('post', '/api/register', { nombre: 'A', email: 'a@b.com', password: 'x' }));
});

describe('publicaciones routes', () => {
  it('creates a publication and validates content', async () => {
    const invalid = await json('post', '/api/publicaciones', {}, auth());
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ message: 'El contenido es obligatorio.' });

    query.mockResolvedValueOnce([{ insertId: 8 }]);
    const created = await json('post', '/api/publicaciones', { contenido: 'Hola' }, auth());
    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      message: 'Publicación creada con éxito',
      publicacion: { id: 8, usuario_id: 1, contenido: 'Hola', imagen_url: null },
    });
  });

  it('lists publications and handles failures', async () => {
    query.mockResolvedValueOnce([[{ id: 1, contenido: 'Hola' }]]);
    const listed = await request(app).get('/api/publicaciones');
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual({ publicaciones: [{ id: 1, contenido: 'Hola' }] });
    await expectServerError('get', '/api/publicaciones');
  });

  it('gets a publication by id, including not found', async () => {
    query.mockResolvedValueOnce([[]]);
    const missing = await request(app).get('/api/publicaciones/99');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ message: 'Publicación no encontrada' });

    query.mockResolvedValueOnce([[{ id: 2, contenido: 'Hola' }]]);
    const found = await request(app).get('/api/publicaciones/2');
    expect(found.status).toBe(200);
    expect(found.body).toEqual({ publicacion: { id: 2, contenido: 'Hola' } });
    await expectServerError('get', '/api/publicaciones/2');
  });

  it('gets publications by user and handles failures', async () => {
    query.mockResolvedValueOnce([[{ id: 2, usuario_id: 4 }]]);
    const found = await request(app).get('/api/usuarios/4/publicaciones');
    expect(found.status).toBe(200);
    expect(found.body.publicaciones).toHaveLength(1);
    await expectServerError('get', '/api/usuarios/4/publicaciones');
  });

  it('updates publications only for their owner', async () => {
    query.mockResolvedValueOnce([[]]);
    const missing = await json('put', '/api/publicaciones/2', { contenido: 'x' }, auth());
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ message: 'Publicación no encontrada' });

    query.mockResolvedValueOnce([[{ usuario_id: 9 }]]);
    const forbidden = await json('put', '/api/publicaciones/2', { contenido: 'x' }, auth());
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.message).toContain('permiso');

    query.mockResolvedValueOnce([[{ usuario_id: 1 }]]);
    const invalid = await json('put', '/api/publicaciones/2', {}, auth());
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ message: 'El contenido es obligatorio.' });

    query.mockResolvedValueOnce([[{ usuario_id: 1 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    const updated = await json('put', '/api/publicaciones/2', { contenido: 'new' }, auth());
    expect(updated.status).toBe(200);
    expect(updated.body.publicacion).toMatchObject({ id: 2, contenido: 'new', usuario_id: 1 });
    await expectServerError('put', '/api/publicaciones/2', { contenido: 'x' }, auth());
  });

  it('deletes publications only for their owner', async () => {
    query.mockResolvedValueOnce([[]]);
    expect((await json('delete', '/api/publicaciones/2', undefined, auth())).status).toBe(404);
    query.mockResolvedValueOnce([[{ usuario_id: 9 }]]);
    expect((await json('delete', '/api/publicaciones/2', undefined, auth())).status).toBe(403);
    query.mockResolvedValueOnce([[{ usuario_id: 1 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    const deleted = await json('delete', '/api/publicaciones/2', undefined, auth());
    expect(deleted.status).toBe(200);
    expect(deleted.body).toEqual({ message: 'Publicación eliminada con éxito' });
    await expectServerError('delete', '/api/publicaciones/2', undefined, auth());
  });
});

describe('locales routes', () => {
  it('creates locales for permitted roles and validates input', async () => {
    const turista = await json('post', '/api/locales', { nombre: 'L', descripcion: 'D' }, auth({ rol: 'turista' }));
    expect(turista.status).toBe(403);
    const invalid = await json('post', '/api/locales', { nombre: 'L' }, auth({ rol: 'comerciante' }));
    expect(invalid.status).toBe(400);
    query.mockResolvedValueOnce([{ insertId: 4 }]);
    const created = await json('post', '/api/locales', { nombre: 'L', descripcion: 'D' }, auth({ rol: 'admin', id: 5 }));
    expect(created.status).toBe(201);
    expect(created.body.local).toMatchObject({ id: 4, id_usuario: 5 });
    await expectServerError('post', '/api/locales', { nombre: 'L', descripcion: 'D' }, auth({ rol: 'admin' }));
  });

  it('lists and filters locales, and gets one by id', async () => {
    query.mockResolvedValueOnce([[{ id_local: 1, nombre: 'L' }]]);
    const listed = await request(app).get('/api/locales?categoria=2&municipio=3&buscar=park');
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual({ total: 1, locales: [{ id_local: 1, nombre: 'L' }] });
    await expectServerError('get', '/api/locales');

    query.mockResolvedValueOnce([[]]);
    expect((await request(app).get('/api/locales/1')).status).toBe(404);
    query.mockResolvedValueOnce([[{ id_local: 1, nombre: 'L' }]]);
    expect((await request(app).get('/api/locales/1')).body).toEqual({ local: { id_local: 1, nombre: 'L' } });
    await expectServerError('get', '/api/locales/1');
  });

  it('updates and deletes locales with owner/admin permissions', async () => {
    query.mockResolvedValueOnce([[]]);
    expect((await json('put', '/api/locales/1', {}, auth({ rol: 'admin' }))).status).toBe(404);
    query.mockResolvedValueOnce([[{ id_usuario: 8 }]]);
    expect((await json('put', '/api/locales/1', {}, auth({ id: 1, rol: 'comerciante' }))).status).toBe(403);
    query.mockResolvedValueOnce([[{ id_usuario: 1 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    expect((await json('put', '/api/locales/1', { nombre: 'N', descripcion: 'D' }, auth({ id: 1, rol: 'comerciante' }))).status).toBe(200);
    await expectServerError('put', '/api/locales/1', { nombre: 'N', descripcion: 'D' }, auth({ rol: 'admin' }));

    query.mockResolvedValueOnce([[]]);
    expect((await json('delete', '/api/locales/1', undefined, auth({ rol: 'admin' }))).status).toBe(404);
    query.mockResolvedValueOnce([[{ id_usuario: 8 }]]);
    expect((await json('delete', '/api/locales/1', undefined, auth({ id: 1, rol: 'comerciante' }))).status).toBe(403);
    query.mockResolvedValueOnce([[{ id_usuario: 1 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    expect((await json('delete', '/api/locales/1', undefined, auth({ id: 1, rol: 'comerciante' }))).status).toBe(200);
    await expectServerError('delete', '/api/locales/1', undefined, auth({ rol: 'admin' }));
  });
});

describe('calificaciones routes', () => {
  it('creates ratings with validation, existence and duplicate checks', async () => {
    const invalid = await json('post', '/api/locales/1/calificaciones', { puntuacion: 6 }, auth());
    expect(invalid.status).toBe(400);
    query.mockResolvedValueOnce([[]]);
    expect((await json('post', '/api/locales/1/calificaciones', { puntuacion: 4 }, auth())).status).toBe(404);
    query.mockResolvedValueOnce([[{ id_local: 1 }]]).mockResolvedValueOnce([[{ id_resena: 3 }]]);
    expect((await json('post', '/api/locales/1/calificaciones', { puntuacion: 4 }, auth())).status).toBe(400);
    query.mockResolvedValueOnce([[{ id_local: 1 }]]).mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ insertId: 5 }]);
    const created = await json('post', '/api/locales/1/calificaciones', { puntuacion: 4, comentario: 'bien' }, auth());
    expect(created.status).toBe(201);
    expect(created.body.calificacion).toMatchObject({ id: 5, puntuacion: 4 });
    await expectServerError('post', '/api/locales/1/calificaciones', { puntuacion: 4 }, auth());
  });

  it('lists ratings with an average and handles failures', async () => {
    query.mockResolvedValueOnce([[{ puntuacion: 5 }, { puntuacion: 3 }]]);
    const response = await request(app).get('/api/locales/1/calificaciones');
    expect(response.body).toMatchObject({ promedio: '4.0', total: 2 });
    query.mockResolvedValueOnce([[]]);
    expect((await request(app).get('/api/locales/1/calificaciones')).body).toMatchObject({ promedio: null, total: 0 });
    await expectServerError('get', '/api/locales/1/calificaciones');
  });

  it('updates and deletes ratings only for the author or admin', async () => {
    query.mockResolvedValueOnce([[]]);
    expect((await json('put', '/api/calificaciones/2', { puntuacion: 4 }, auth())).status).toBe(404);
    query.mockResolvedValueOnce([[{ id_usuario: 9 }]]);
    expect((await json('put', '/api/calificaciones/2', { puntuacion: 4 }, auth())).status).toBe(403);
    query.mockResolvedValueOnce([[{ id_usuario: 1 }]]);
    expect((await json('put', '/api/calificaciones/2', { puntuacion: 0 }, auth())).status).toBe(400);
    query.mockResolvedValueOnce([[{ id_usuario: 1 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    expect((await json('put', '/api/calificaciones/2', { puntuacion: 4 }, auth())).status).toBe(200);
    await expectServerError('put', '/api/calificaciones/2', { puntuacion: 4 }, auth());

    query.mockResolvedValueOnce([[]]);
    expect((await json('delete', '/api/calificaciones/2', undefined, auth())).status).toBe(404);
    query.mockResolvedValueOnce([[{ id_usuario: 9 }]]);
    expect((await json('delete', '/api/calificaciones/2', undefined, auth())).status).toBe(403);
    query.mockResolvedValueOnce([[{ id_usuario: 9 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    expect((await json('delete', '/api/calificaciones/2', undefined, auth({ rol: 'admin' }))).status).toBe(200);
    await expectServerError('delete', '/api/calificaciones/2', undefined, auth());
  });
});

describe('planes routes', () => {
  const validPlan = { titulo: 'Plan', fecha_inicio: '2026-01-01', fecha_fin: '2026-01-02' };

  it('creates plans after validating dates and ownership', async () => {
    expect((await json('post', '/api/locales/1/planes', {}, auth())).status).toBe(400);
    expect((await json('post', '/api/locales/1/planes', { ...validPlan, fecha_fin: '2025-01-01' }, auth())).status).toBe(400);
    query.mockResolvedValueOnce([[]]);
    expect((await json('post', '/api/locales/1/planes', validPlan, auth())).status).toBe(404);
    query.mockResolvedValueOnce([[{ id_usuario: 8 }]]);
    expect((await json('post', '/api/locales/1/planes', validPlan, auth())).status).toBe(403);
    query.mockResolvedValueOnce([[{ id_usuario: 1 }]]).mockResolvedValueOnce([{ insertId: 7 }]);
    expect((await json('post', '/api/locales/1/planes', validPlan, auth())).status).toBe(201);
    await expectServerError('post', '/api/locales/1/planes', validPlan, auth());
  });

  it('lists plans and updates/deletes them with permission checks', async () => {
    query.mockResolvedValueOnce([[{ id_plan: 1 }]]);
    expect((await request(app).get('/api/locales/1/planes')).body).toEqual({ planes: [{ id_plan: 1 }] });
    await expectServerError('get', '/api/locales/1/planes');

    query.mockResolvedValueOnce([[]]);
    expect((await json('put', '/api/planes/1', validPlan, auth())).status).toBe(404);
    query.mockResolvedValueOnce([[{ dueno_local: 8 }]]);
    expect((await json('put', '/api/planes/1', validPlan, auth())).status).toBe(403);
    query.mockResolvedValueOnce([[{ dueno_local: 1 }]]);
    expect((await json('put', '/api/planes/1', {}, auth())).status).toBe(400);
    query.mockResolvedValueOnce([[{ dueno_local: 1 }]]);
    expect((await json('put', '/api/planes/1', { ...validPlan, fecha_fin: '2025-01-01' }, auth())).status).toBe(400);
    query.mockResolvedValueOnce([[{ dueno_local: 1 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    expect((await json('put', '/api/planes/1', validPlan, auth())).status).toBe(200);
    await expectServerError('put', '/api/planes/1', validPlan, auth());

    query.mockResolvedValueOnce([[]]);
    expect((await json('delete', '/api/planes/1', undefined, auth())).status).toBe(404);
    query.mockResolvedValueOnce([[{ dueno_local: 8 }]]);
    expect((await json('delete', '/api/planes/1', undefined, auth())).status).toBe(403);
    query.mockResolvedValueOnce([[{ dueno_local: 1 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    expect((await json('delete', '/api/planes/1', undefined, auth())).status).toBe(200);
    await expectServerError('delete', '/api/planes/1', undefined, auth());
  });
});

describe('catalogue, profile, and password recovery routes', () => {
  it('lists categories and municipalities, including failures', async () => {
    query.mockResolvedValueOnce([[{ id_categoria: 1 }]]);
    expect((await request(app).get('/api/categorias')).body).toEqual({ categorias: [{ id_categoria: 1 }] });
    await expectServerError('get', '/api/categorias');
    query.mockResolvedValueOnce([[{ id_municipio: 2 }]]);
    expect((await request(app).get('/api/municipios')).body).toEqual({ municipios: [{ id_municipio: 2 }] });
    await expectServerError('get', '/api/municipios');
  });

  it('gets and updates the current profile', async () => {
    query.mockResolvedValueOnce([[]]);
    expect((await request(app).get('/api/perfil').set(auth())).status).toBe(404);
    query.mockResolvedValueOnce([[{ id_usuario: 1, nombre: 'A' }]]);
    expect((await request(app).get('/api/perfil').set(auth())).body).toEqual({ usuario: { id_usuario: 1, nombre: 'A' } });
    fail();
    const profileFailure = await json('get', '/api/perfil', undefined, auth());
    expect(profileFailure.status).toBe(500);
    expect(profileFailure.body).toEqual({ message: 'Error al consultar el perfil', error: 'db failure' });

    expect((await json('put', '/api/perfil', { nombre: 'A' }, auth())).status).toBe(400);
    query.mockResolvedValueOnce([[{ id_usuario: 2 }]]);
    expect((await json('put', '/api/perfil', { nombre: 'A', email: 'a@b.com' }, auth())).status).toBe(400);
    query.mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    const updated = await json('put', '/api/perfil', { nombre: 'A', email: 'a@b.com' }, auth());
    expect(updated.status).toBe(200);
    expect(updated.body.usuario).toMatchObject({ id: 1, nombre: 'A', foto_perfil: null });
    query.mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    expect((await json('put', '/api/perfil', { nombre: 'A', email: 'a@b.com', password: 'x' }, auth())).status).toBe(200);
    await expectServerError('put', '/api/perfil', { nombre: 'A', email: 'a@b.com' }, auth());
  });

  it('handles forgot-password validation, missing users, success and errors', async () => {
    expect((await request(app).post('/api/forgot-password').send({})).status).toBe(400);
    query.mockResolvedValueOnce([[]]);
    expect((await request(app).post('/api/forgot-password').send({ email: 'x@y.com' })).status).toBe(404);
    query.mockResolvedValueOnce([[{ id_usuario: 1 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    const sent = await request(app).post('/api/forgot-password').send({ email: 'x@y.com' });
    expect(sent.status).toBe(200);
    expect(sent.body.message).toContain('código');
    await expectServerError('post', '/api/forgot-password', { email: 'x@y.com' });
  });

  it('resets passwords after validating code and expiry', async () => {
    expect((await request(app).post('/api/reset-password').send({})).status).toBe(400);
    query.mockResolvedValueOnce([[]]);
    expect((await request(app).post('/api/reset-password').send({ email: 'x', codigo: '1', nuevaPassword: 'x' })).status).toBe(404);
    query.mockResolvedValueOnce([[{ reset_token: '2', reset_token_expira: new Date(Date.now() + 10000) }]]);
    expect((await request(app).post('/api/reset-password').send({ email: 'x', codigo: '1', nuevaPassword: 'x' })).status).toBe(400);
    query.mockResolvedValueOnce([[{ reset_token: '1', reset_token_expira: new Date(Date.now() - 10000) }]]);
    expect((await request(app).post('/api/reset-password').send({ email: 'x', codigo: '1', nuevaPassword: 'x' })).status).toBe(400);
    query.mockResolvedValueOnce([[{ reset_token: '1', reset_token_expira: new Date(Date.now() + 10000) }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    const reset = await request(app).post('/api/reset-password').send({ email: 'x', codigo: '1', nuevaPassword: 'x' });
    expect(reset.status).toBe(200);
    expect(reset.body.message).toContain('Contraseña actualizada');
    await expectServerError('post', '/api/reset-password', { email: 'x', codigo: '1', nuevaPassword: 'x' });
  });
});

describe('upload route and multer errors', () => {
  it('requires authentication and rejects missing files', async () => {
    expect((await request(app).post('/api/upload')).status).toBe(401);
    const response = await request(app).post('/api/upload').set(auth());
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'No se envió ninguna imagen.' });
  });

  it('rejects invalid file types with the multer error message', async () => {
    const response = await request(app)
      .post('/api/upload')
      .set(auth())
      .attach('imagen', Buffer.from('not an image'), { filename: 'notes.txt', contentType: 'text/plain' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Solo se permiten imágenes JPG, PNG o WEBP' });
  });

  it('rejects oversized files with a 400 multer message', async () => {
    const response = await request(app)
      .post('/api/upload')
      .set(auth())
      .attach('imagen', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'large.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('File too large');
  });

  it('uploads an accepted image', async () => {
    const response = await request(app)
      .post('/api/upload')
      .set(auth())
      .attach('imagen', Buffer.from('image'), { filename: 'tiny.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ message: 'Imagen subida con éxito' });
  });
});
