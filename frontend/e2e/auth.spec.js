import { test, expect } from '@playwright/test';
import { emailUnico, registrarUI, loginUI, loginViaApi, registrarApi, borrarUsuarioApi } from './utils.js';

test('una ruta protegida redirige al login cuando no hay sesión', async ({ page }) => {
  await page.goto('/perfil');
  await expect(page).toHaveURL(/\/login/);
});

test('registro, inicio de sesión, cierre de sesión y limpieza del usuario', async ({ page }) => {
  const email = emailUnico();
  const password = 'ClaveSegura123';

  await registrarUI(page, { nombre: 'Usuario E2E', email, password });

  await loginUI(page, email, password);
  await expect(page.getByText(/Hola, Usuario E2E/)).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('link', { name: 'Iniciar / Registrarse' })).toBeVisible();

  await borrarUsuarioApi(email, password);
});

test('el mapa aparece solo con sesión iniciada', async ({ page }) => {
  const email = emailUnico();
  const password = 'ClaveSegura123';

  await registrarApi(page, { nombre: 'Mapa E2E', email, password });
  await loginViaApi(page, email, password);

  await page.goto('/');
  await expect(page.getByText(/Hola, Mapa E2E/)).toBeVisible();

  await page.goto('/mapa');
  await expect(page.locator('svg')).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await borrarUsuarioApi(email, password);
});