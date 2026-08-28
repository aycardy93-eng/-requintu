export const API = 'http://localhost:3000/api';

export function emailUnico(prefix = 'e2e') {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}@test.requintu`;
}

export async function registrarUI(page, { nombre = 'Test E2E', email, password = 'ClaveSegura123' }) {
  await page.goto('/register');
  await page.locator('input[type="text"]').fill(nombre);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  page.once('dialog', (d) => d.accept());
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/login');
}

export async function loginUI(page, email, password) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

export async function registrarApi(page, { nombre = 'Test E2E', email, password = 'ClaveSegura123' }) {
  const res = await page.request.post(`${API}/register`, { data: { nombre, email, password } });
  if (!res.ok()) throw new Error(`register via API falló: ${res.status()}`);
}

export async function loginViaApi(page, email, password) {
  const res = await page.request.post(`${API}/login`, { data: { email, password } });
  if (!res.ok()) throw new Error(`login via API falló: ${res.status()}`);
}

export async function obtenerTokenApi(email, password) {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body.token;
}

export async function crearPublicacionApi(email, password, contenido) {
  const token = await obtenerTokenApi(email, password);
  const res = await fetch(`${API}/publicaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contenido })
  });
  if (!res.ok) throw new Error(`error creando publicación: ${res.status}`);
}

export async function borrarUsuarioApi(email, password) {
  const token = await obtenerTokenApi(email, password);
  if (!token) return;
  await fetch(`${API}/usuarios/perfil`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}