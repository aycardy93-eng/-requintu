import { test, expect } from '@playwright/test';

test('la política de privacidad está disponible sin extensión', async ({ page }) => {
  await page.goto('/politica-de-privacidad');
  await expect(page.getByRole('heading', { name: /Política de privacidad/ })).toBeVisible();
});

test('la política de privacidad está disponible con extensión .html', async ({ page }) => {
  await page.goto('/politica-de-privacidad.html');
  await expect(page.getByRole('heading', { name: /Política de privacidad/ })).toBeVisible();
});