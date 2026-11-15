import { expect, type Page } from '@playwright/test'

// Recolecta errores de consola y respuestas 4xx/5xx. Las teselas canceladas (ERR_ABORTED) son normales al mover la cámara.
export function watchConsole(page: Page) {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`[http ${r.status()}] ${r.url()}`) })
  return {
    errors,
    // Avisos de terceros que no controlamos (MapLibre con proyección globo) se toleran; todo lo nuestro debe estar limpio.
    expectClean: () => expect(errors.filter((e) => !/calculateFogMatrix|Deprecated API for given entry type/.test(e))).toEqual([]),
  }
}

export async function gotoExplore(page: Page) {
  await page.goto('/#explorar')
  await expect(page.getByRole('heading', { name: 'TerraLunar' })).toBeVisible()
  await expect(page.getByRole('button', { name: /#01/ })).toBeVisible()
}

export async function noHorizontalScroll(page: Page) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
  expect(sw, 'la página no debe desbordar horizontalmente').toBeLessThanOrEqual(cw)
}
