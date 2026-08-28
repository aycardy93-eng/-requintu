import { test, expect } from '@playwright/test';
import { emailUnico, registrarApi, crearPublicacionApi, borrarUsuarioApi } from './utils.js';

test('el muro avisa en tiempo real cuando llega una publicación nueva', async ({ page }) => {
  const autor = emailUnico('autor');
  const oyente = emailUnico('oyente');
  const password = 'ClaveSegura123';

  await registrarApi(page, { nombre: 'Autor RT', email: autor, password });
  await registrarApi(page, { nombre: 'Oyente RT', email: oyente, password });

  // El "oyente" abre el muro y queda suscrito a los avisos
  await page.goto('/publicaciones');
  await expect(page.getByText(/para crear una publicación/)).toBeVisible();

  // El "autor" publica (otra sesión) y el muro del oyente debe avisarlo
  await crearPublicacionApi(autor, password, `Aviso en tiempo real ${Date.now()}`);

  await expect(page.getByText(/publicación nueva en el muro/)).toBeVisible();

  // Limpieza (borrar al autor elimina su publicación en cascada)
  await borrarUsuarioApi(autor, password);
  await borrarUsuarioApi(oyente, password);
});