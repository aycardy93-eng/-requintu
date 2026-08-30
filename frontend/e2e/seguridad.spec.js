import { test, expect } from '@playwright/test';
import {
  registrarApi,
  crearPublicacionApi,
  crearLocalApi,
  calificarLocalApi,
  emailUnico,
  borrarUsuarioApi
} from './utils.js';

// Marca única por ejecución: el muro acumula publicaciones de runs anteriores,
// así el payload debe ser identificable sin colisionar con datos previos.
const marcaMuro = `xssMuro${Date.now()}`;
const PAYLOAD_MURO =
  `<script>window.${marcaMuro}=1;</script><img src=x onerror="window.${marcaMuro}=1">`;

const marcaLocal = `xssLocal${Date.now()}`;
const PAYLOAD_COMENTARIO =
  `<svg onload="window.${marcaLocal}=1"></svg><img src=x onerror="window.${marcaLocal}=1">`;

// Verifica que los contenidos con payloads XSS se rendericen como texto plano
// inerte (React los escapa) y que ningún navegador llegue a ejecutar el código.
test.describe('Seguridad: contenido con payloads XSS', () => {
  test('las publicaciones XSS se muestran como texto inerte en el muro', async ({ page }) => {
    const email = emailUnico('xss-muro');
    const password = 'ClaveSegura123';
    await registrarApi(page, { nombre: 'XSS Muro', email, password });
    await crearPublicacionApi(email, password, PAYLOAD_MURO);

    await page.goto('/publicaciones');

    const publicacion = page.locator('p', { hasText: PAYLOAD_MURO }).first();
    await expect(publicacion).toBeVisible();
    await expect(publicacion).toContainText(PAYLOAD_MURO);

    await expect(page.locator(`script:has-text("${marcaMuro}")`)).toHaveCount(0);
    await expect(page.locator('img[onerror]')).toHaveCount(0);
    expect(await page.evaluate((m) => window[m], marcaMuro)).toBeUndefined();

    await borrarUsuarioApi(email, password);
  });

  test('los comentarios XSS en un local se muestran como texto inerte', async ({ page }) => {
    const comerciante = emailUnico('xss-owner');
    const turista = emailUnico('xss-turista');
    const password = 'ClaveSegura123';
    await registrarApi(page, { nombre: 'Dueño XSS', email: comerciante, password, rol: 'comerciante' });
    await registrarApi(page, { nombre: 'Turista XSS', email: turista, password });

    const idLocal = await crearLocalApi(comerciante, password, {
      nombre: 'Café Seguridad Requintu',
      descripcion: 'Local usado para la prueba de seguridad XSS.',
      direccion: 'Calle de la Prueba 123'
    });
    await calificarLocalApi(turista, password, idLocal, {
      puntuacion: 5,
      comentario: PAYLOAD_COMENTARIO
    });

    await page.goto(`/locales/${idLocal}`);

    const bloque = page.locator('p', { hasText: PAYLOAD_COMENTARIO }).first();
    await expect(bloque).toBeVisible();
    await expect(bloque).toContainText(PAYLOAD_COMENTARIO);

    await expect(page.locator('img[onerror]')).toHaveCount(0);
    await expect(page.locator('svg[onload]')).toHaveCount(0);
    expect(await page.evaluate((m) => window[m], marcaLocal)).toBeUndefined();

    await borrarUsuarioApi(turista, password);
    await borrarUsuarioApi(comerciante, password);
  });
});