import { test, expect } from '@playwright/test';

test('la home carga con la marca y la navegación', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('REQUINTU', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Locales' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Publicaciones' }).first()).toBeVisible();
});

test('locales muestra el buscador', async ({ page }) => {
  await page.goto('/locales');
  await expect(page.getByPlaceholder('Buscar por nombre...')).toBeVisible();
});

test('publicaciones muestra el muro', async ({ page }) => {
  await page.goto('/publicaciones');
  await expect(page.getByRole('heading', { name: 'Publicaciones' })).toBeVisible();
  await expect(page.getByText(/para crear una publicación/)).toBeVisible();
});