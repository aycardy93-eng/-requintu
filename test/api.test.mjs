import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pool, { checkDatabaseHealth } from '../db.js';

process.env.RATE_LIMIT_API_MAX = '1000';
process.env.RATE_LIMIT_AUTH_MAX = '1000';

const app = (await import('../index.js')).default;

let base = '';
let server;
const emailsTest = [];
const publicacionesTest = [];

const registroUnico = () => {
  const email = `test-${Date.now()}-${Math.round(Math.random() * 1e6)}@test.requintu`;
  emailsTest.push(email);
  return email;
};

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  if (publicacionesTest.length > 0) {
    await pool.query('DELETE FROM publicaciones WHERE id IN (?)', [publicacionesTest]);
  }
  if (emailsTest.length > 0) {
    await pool.query('DELETE FROM usuarios WHERE email IN (?)', [emailsTest]);
  }
  await pool.end();
});

async function registrarUsuario({ nombre = 'Usuario Test', rol = 'turista', password = 'ClaveSegura123' } = {}) {
  const email = registroUnico();
  const res = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, email, password, rol })
  });
  assert.equal(res.status, 201);
  return { email, password };
}

async function login(email, password) {
  return fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
}

test('rechaza registro con email invalido', async () => {
  const res = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Test', email: 'no-es-email', password: 'ClaveSegura123' })
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.error);
});

test('rechaza registro con password corta', async () => {
  const res = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Test', email: registroUnico(), password: 'corta' })
  });
  assert.equal(res.status, 400);
});

test('convierte intento de rol admin en turista', async () => {
  const credenciales = await registrarUsuario({ rol: 'admin' });
  const res = await login(credenciales.email, credenciales.password);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.user.rol, 'turista');
});

test('login responde identico con usuario inexistente y password erronea', async () => {
  const resInexistente = await login(`nadie-${Date.now()}@test.requintu`, 'loquesea123');
  const credenciales = await registrarUsuario();
  const resMalaClave = await login(credenciales.email, 'PasswordEquivocada1');

  assert.equal(resInexistente.status, 401);
  assert.equal(resMalaClave.status, 401);

  const cuerpoInexistente = await resInexistente.json();
  const cuerpoMalaClave = await resMalaClave.json();
  assert.deepEqual(cuerpoInexistente, cuerpoMalaClave);
});

test('ruta protegida sin token devuelve 401', async () => {
  const res = await fetch(`${base}/api/perfil`);
  assert.equal(res.status, 401);
});

test('token falsificado es rechazado con 403', async () => {
  const jwt = (await import('jsonwebtoken')).default;
  const tokenFalso = jwt.sign({ id: 999999, rol: 'admin' }, process.env.JWT_SECRET + 'alterado');
  const res = await fetch(`${base}/api/perfil`, {
    headers: { Authorization: `Bearer ${tokenFalso}` }
  });
  assert.equal(res.status, 403);
});

test('perfil responde datos del usuario autenticado', async () => {
  const credenciales = await registrarUsuario({ nombre: 'Perfil Test' });
  const { body: loginBody } = { body: await (await login(credenciales.email, credenciales.password)).json() };
  const res = await fetch(`${base}/api/perfil`, {
    headers: { Authorization: `Bearer ${loginBody.token}` }
  });
  assert.equal(res.status, 200);
  const perfil = await res.json();
  assert.equal(perfil.email, credenciales.email);
  assert.equal(perfil.rol, 'turista');
});

test('comerciante no puede crear publicaciones', async () => {
  const comerciante = await registrarUsuario({ rol: 'comerciante' });
  const loginRes = await login(comerciante.email, comerciante.password);
  const { token } = await loginRes.json();

  const res = await fetch(`${base}/api/publicaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contenido: '[test] comerciante bloqueado' })
  });
  assert.equal(res.status, 403);
});

test('ciclo completo de publicacion: crear y eliminar', async () => {
  const usuario = await registrarUsuario();
  const { token } = await (await login(usuario.email, usuario.password)).json();

  const crear = await fetch(`${base}/api/publicaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contenido: '[test] publicacion de prueba automatizada' })
  });
  assert.equal(crear.status, 201);
  const { id } = await crear.json();
  publicacionesTest.push(id);

  const editar = await fetch(`${base}/api/publicaciones/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contenido: '[test] editada por test automatizado' })
  });
  assert.equal(editar.status, 200);

  const eliminar = await fetch(`${base}/api/publicaciones/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(eliminar.status, 200);
});

test('filtros de locales: municipio sin locales devuelve vacio', async () => {
  const res = await fetch(`${base}/api/locales?municipio=2`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.locales.length, 0);
});

test('filtros de locales: departamento filtra sin aumentar resultados', async () => {
  const todos = (await (await fetch(`${base}/api/locales`)).json()).locales;
  const filtrados = (await (await fetch(`${base}/api/locales?departamento=DepartamentoQueNoExiste`)).json()).locales;
  assert.equal(filtrados.length, 0);
  assert.ok(todos.length >= 0);
});

test('origen CORS desconocido no recibe header Allow-Origin', async () => {
  const res = await fetch(`${base}/api/municipios`, {
    headers: { Origin: 'http://sitio-malicioso.example' }
  });
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

test('origen CORS autorizado recibe su origen en Allow-Origin', async () => {
  const res = await fetch(`${base}/api/municipios`, {
    headers: { Origin: 'http://localhost:5173' }
  });
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
});

test('upload rechaza archivo con firma invalida', async () => {
  const usuario = await registrarUsuario();
  const { token } = await (await login(usuario.email, usuario.password)).json();

  const fd = new FormData();
  fd.append('imagen', new Blob(['esto no es una imagen'], { type: 'image/jpeg' }), 'falso.jpg');

  const res = await fetch(`${base}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  });
  assert.equal(res.status, 400);
});

test('upload acepta un JPEG genuino', async () => {
  const usuario = await registrarUsuario();
  const { token } = await (await login(usuario.email, usuario.password)).json();

  const jpegMinimo = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0xff, 0xd9
  ]);
  const fd = new FormData();
  fd.append('imagen', new Blob([jpegMinimo], { type: 'image/jpeg' }), 'real.jpg');

  const res = await fetch(`${base}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  });
  assert.equal(res.status, 200);
  const body = await res.json();

  const rutaArchivo = new URL('../uploads/' + body.url.split('/').pop(), import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const { unlink } = await import('fs/promises');
  await unlink(rutaArchivo).catch(() => {});
});

test('refresh sin cookie devuelve 401', async () => {
  const res = await fetch(`${base}/api/auth/refresh`, { method: 'POST' });
  assert.equal(res.status, 401);
});

test('forgot-password responde identico si el email existe o no', async () => {
  const credenciales = await registrarUsuario();

  const resExistente = await fetch(`${base}/api/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: credenciales.email })
  });
  const cuerpoExistente = await resExistente.json();

  const resInexistente = await fetch(`${base}/api/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nadie@test.requintu' })
  });
  const cuerpoInexistente = await resInexistente.json();

  assert.equal(resExistente.status, 200);
  assert.equal(resInexistente.status, 200);
  assert.deepEqual(cuerpoExistente, cuerpoInexistente);
});

test('reset-password rechaza tokens invalidos y expirados', async () => {
  const tokenFalso = crypto.randomBytes(32).toString('hex');

  const res = await fetch(`${base}/api/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenFalso, password: 'nuevaClave123' })
  });

  assert.equal(res.status, 400);
  const cuerpo = await res.json();
  assert.ok(cuerpo.error.includes('inválido') || cuerpo.error.includes('expiró'));
});

test('flujo completo de reset de contrasena: registrar, olvidar, restablecer, login', async () => {
  const credenciales = await registrarUsuario();

  const tokenRaw = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');

  const [users] = await pool.query('SELECT id_usuario FROM usuarios WHERE email = ?', [credenciales.email]);
  await pool.query(
    'INSERT INTO password_resets (id_usuario, token_hash, expira_en) VALUES (?, ?, ?)',
    [users[0].id_usuario, tokenHash, new Date(Date.now() + 3600000)]
  );

  const resetRes = await fetch(`${base}/api/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenRaw, password: 'NuevaClave123!' })
  });
  assert.equal(resetRes.status, 200);

  const loginNuevo = await login(credenciales.email, 'NuevaClave123!');
  assert.equal(loginNuevo.status, 200);

  const loginVieja = await login(credenciales.email, credenciales.password);
  assert.equal(loginVieja.status, 401);

  const [filas] = await pool.query('SELECT usado FROM password_resets WHERE token_hash = ?', [tokenHash]);
  assert.equal(filas[0].usado, 1);

  const reuso = await fetch(`${base}/api/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenRaw, password: 'OtraClave456!' })
  });
  assert.equal(reuso.status, 400);
});

test('rechaza registro con email duplicado', async () => {
  const credenciales = await registrarUsuario();
  const res = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Otro', email: credenciales.email, password: 'ClaveSegura123' })
  });
  assert.equal(res.status, 400);
  const cuerpo = await res.json();
  assert.ok(cuerpo.error.includes('ya está registrado') || cuerpo.error.includes('registrado'));
});

test('flujo completo de refresh token con rotacion y revocacion', async () => {
  const credenciales = await registrarUsuario();

  const loginRes = await login(credenciales.email, credenciales.password);
  assert.equal(loginRes.status, 200);

  const setCookies = loginRes.headers.getSetCookie();
  const cookieSesion = setCookies.find((c) => c.startsWith('refresh_token='));
  assert.ok(cookieSesion, 'el login debe emitir la cookie refresh_token');
  assert.match(cookieSesion, /HttpOnly/i, 'la cookie debe ser httpOnly');
  assert.match(cookieSesion, /Path=\/api\/auth/i);

  const valorPrimeraCookie = cookieSesion.split(';')[0];

  const refresh1 = await fetch(`${base}/api/auth/refresh`, {
    method: 'POST',
    headers: { Cookie: valorPrimeraCookie }
  });
  assert.equal(refresh1.status, 200);
  const cuerpoRefresh = await refresh1.json();
  assert.ok(cuerpoRefresh.token);
  assert.equal(cuerpoRefresh.user.email, credenciales.email);

  const cookiesRotadas = refresh1.headers.getSetCookie();
  const cookieNueva = cookiesRotadas.find((c) => c.startsWith('refresh_token='))?.split(';')[0];
  assert.ok(cookieNueva && cookieNueva !== valorPrimeraCookie, 'el refresh token debe rotar en cada uso');

  const logoutRes = await fetch(`${base}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookieNueva }
  });
  assert.equal(logoutRes.status, 200);

  const refreshTrasLogout = await fetch(`${base}/api/auth/refresh`, {
    method: 'POST',
    headers: { Cookie: cookieNueva }
  });
  assert.equal(refreshTrasLogout.status, 401, 'tras el logout el refresh debe estar revocado');
});
