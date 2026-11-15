import { defineConfig, devices } from '@playwright/test'

// Suite e2e de TerraLunar. Corre contra `vite` en 5174 (reutiliza el servidor si ya está levantado).
// Proyectos: desktop 1440, tablet 768, mobile 390 y "sin-webgl" (fallback de los globos).
const PORT = Number(process.env.PORT ?? 5174)

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000, toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' } },
  fullyParallel: false,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-AR',
    // Las animaciones de entrada no cambian el contenido: con reduced-motion las capturas son estables.
    contextOptions: { reducedMotion: 'reduce' },
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true }, testMatch: /responsive|navigation/ },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, testMatch: /responsive|navigation/ },
    {
      name: 'sin-webgl',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { args: ['--disable-3d-apis'] } },
      testMatch: /webgl/,
    },
  ],
})
