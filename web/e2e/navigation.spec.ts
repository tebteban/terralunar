import { expect, test } from '@playwright/test'
import { gotoExplore, noHorizontalScroll, openSurface } from './helpers'

// Corre en desktop, tablet y mobile: todas las rutas deben ser alcanzables en cualquier viewport.
test('recorre todas las vistas: Inicio → Búsqueda global → Explorar → Luna → Marte → Inicio', async ({ page }) => {
  test.slow() // tres globos seguidos en GL por software; el visor de Marte puede tardar en montar
  await page.goto('/')
  await noHorizontalScroll(page)
  await page.getByRole('button', { name: /Búsqueda global/ }).click()
  await expect(page).toHaveURL(/#personalizado$/)
  const buscador = page.getByRole('dialog').filter({ hasText: 'Comparar entornos de misión' })
  await expect(buscador).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(buscador).toBeHidden()
  await gotoExplore(page)
  await noHorizontalScroll(page)
  const nav = page.getByRole('navigation', { name: 'Cuerpo visualizado' })
  await expect(nav.getByRole('button', { name: 'Tierra' })).toHaveAttribute('aria-pressed', 'true')
  await expect(nav.getByRole('button', { name: 'Comparador 3D' })).toBeDisabled()

  await nav.getByRole('button', { name: 'Luna', exact: true }).click()
  await openSurface(page, 'Ficha de la Luna')
  await expect(page.getByRole('heading', { name: 'Elegí un lugar en la Luna' })).toBeVisible()
  await expect(page.getByRole('region', { name: /Globo 3D de la Luna/ })).toBeVisible()
  await noHorizontalScroll(page)

  await nav.getByRole('button', { name: 'Marte', exact: true }).click()
  await openSurface(page, 'Ficha de Marte')
  await expect(page.getByRole('heading', { name: 'Elegí un lugar en Marte' })).toBeVisible()
  await expect(page.getByText('Límites de la analogía (Marte)')).toBeVisible()
  await noHorizontalScroll(page)

  await nav.getByRole('button', { name: 'Volver al inicio' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'TerraLunar' })).toBeVisible()
})

test('el hash #marte abre directo la vista de Marte', async ({ page }) => {
  await page.goto('/#marte')
  await openSurface(page, 'Ficha de Marte')
  await expect(page.getByRole('heading', { name: 'Elegí un lugar en Marte' })).toBeVisible()
})
