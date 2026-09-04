import { test, expect } from '@playwright/test';
import { emailUnico, registrarApi, loginUI, crearPublicacionApi, borrarUsuarioApi } from './utils.js';

test('denunciar una publicación desde el muro', async ({ page }) => {
  const autor = { email: emailUnico('autor'), password: 'ClaveSegura123' };
  const denunciante = { email: emailUnico('denunciante'), password: 'ClaveSegura123' };

  await registrarApi(page, { email: autor.email, password: autor.password });
  await registrarApi(page, { email: denunciante.email, password: denunciante.password });

  const marcador = `[e2e-${Date.now()}] publicación denunciable`;
  await crearPublicacionApi(autor.email, autor.password, marcador);

  await loginUI(page, denunciante.email, denunciante.password);
  await expect(page.getByText(/Hola,/)).toBeVisible();
  await page.getByRole('link', { name: 'Publicaciones', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Publicaciones' })).toBeVisible();

  const tarjeta = page.locator('div', { hasText: marcador }).last();
  await tarjeta.getByRole('button', { name: /denunciar/i }).click();

  await tarjeta.getByRole('combobox').selectOption('violencia');
  await tarjeta.getByPlaceholder('Detalle (opcional)').fill('Imagen violenta');
  await tarjeta.getByRole('button', { name: /enviar denuncia/i }).click();

  await expect(tarjeta.getByText(/gracias por tu denuncia/i)).toBeVisible();

  await borrarUsuarioApi(autor.email, autor.password);
  await borrarUsuarioApi(denunciante.email, denunciante.password);
});