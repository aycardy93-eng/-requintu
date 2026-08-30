import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      // Backend local (usa el .env de la raíz y la BD).
      // Los límites de rate limiting se elevan para no tumbar la suite e2e.
      command: 'node ./index.js',
      cwd: '..',
      env: {
        ...process.env,
        RATE_LIMIT_AUTH_MAX: '500',
        RATE_LIMIT_API_MAX: '5000',
      },
      url: 'http://127.0.0.1:3000/api/municipios',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // Frontend de producción compilado contra el backend local
      command: 'npm run build && npx vite preview --port 4173 --strictPort',
      env: { ...process.env, VITE_BACKEND_ORIGIN: 'http://localhost:3000' },
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});