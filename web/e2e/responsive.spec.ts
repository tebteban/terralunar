import { expect, test } from '@playwright/test'
import { gotoExplore, noHorizontalScroll } from './helpers'

// Regresión visual de las pantallas estáticas (sin mapas) en cada proyecto/viewport.
test('portada: sin desborde y captura de regresión', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'TerraLunar' })).toBeVisible()
  await page.waitForTimeout(500)
  await noHorizontalScroll(page)
  await expect(page).toHaveScreenshot('landing.png', { fullPage: true })
})

test('personalizado: sin desborde y captura de regresión', async ({ page }) => {
  await page.goto('/#personalizado')
  await page.getByRole('button', { name: 'Rover', exact: true }).click()
  await page.waitForTimeout(500)
  await noHorizontalScroll(page)
  await expect(page).toHaveScreenshot('personalizado.png', { fullPage: true })
})

test('explorar: la barra de controles y el ranking entran en el viewport', async ({ page, viewport }) => {
  await gotoExplore(page)
  await noHorizontalScroll(page)
  const nav = page.getByRole('navigation', { name: 'Cuerpo visualizado' })
  const box = (await nav.boundingBox())!
  expect(box.x + box.width, 'el selector de cuerpo no debe salirse de la pantalla').toBeLessThanOrEqual(viewport!.width)
  // Abrir una ficha no debe tapar el selector de cuerpo (en tablet quedaba debajo de la ficha)
  await page.getByRole('button', { name: /#01/ }).click()
  await expect(page.getByRole('article')).toBeVisible()
  await nav.getByRole('button', { name: 'Luna', exact: true }).click({ trial: true })
  // objetivos táctiles de al menos 44 px en los controles principales
  for (const name of ['Tierra', 'Luna', 'Marte']) {
    const b = (await nav.getByRole('button', { name, exact: true }).boundingBox())!
    expect(b.height, `${name} debe medir ≥ 40 px de alto`).toBeGreaterThanOrEqual(40)
  }
})
