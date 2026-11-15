import { expect, test } from '@playwright/test'
import { gotoExplore, noHorizontalScroll } from './helpers'

// Corre en desktop, tablet y mobile: todas las rutas deben ser alcanzables en cualquier viewport.
test('recorre todas las vistas: Inicio → Personalizado → Explorar → Luna → Marte → Inicio', async ({ page }) => {
  await page.goto('/')
  await noHorizontalScroll(page)
  await page.getByRole('button', { name: /Búsqueda global/ }).click()
  await expect(page).toHaveURL(/#explorar$/)
  const buscador = page.getByRole('dialog').filter({ hasText: 'Comparar entornos de misión' })
  await expect(buscador).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(buscador).toBeHidden()
  // la búsqueda personalizada por variables sigue viva en su URL
  await page.goto('/#personalizado')
  await expect(page.getByRole('heading', { name: 'Armá tu búsqueda' })).toBeVisible()
  await noHorizontalScroll(page)
  await page.getByRole('button', { name: 'Inicio' }).first().click()
  await expect(page).toHaveURL(/\/$/)

  await gotoExplore(page)
  await noHorizontalScroll(page)
  const nav = page.getByRole('navigation', { name: 'Cuerpo visualizado' })
  await expect(nav.getByRole('button', { name: 'Tierra' })).toHaveAttribute('aria-pressed', 'true')
  await expect(nav.getByRole('button', { name: 'Comparador 3D' })).toBeDisabled()

  await nav.getByRole('button', { name: 'Luna', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Elegí un lugar en la Luna' })).toBeVisible()
  await expect(page.getByRole('region', { name: /Globo 3D de la Luna/ })).toBeVisible()
  await noHorizontalScroll(page)

  await nav.getByRole('button', { name: 'Marte', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Elegí un lugar en Marte' })).toBeVisible()
  await expect(page.getByText('Límites de la analogía (Marte)')).toBeVisible()
  await noHorizontalScroll(page)

  await nav.getByRole('button', { name: 'Volver al inicio' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'TerraLunar' })).toBeVisible()
})

test('el hash #marte abre directo la vista de Marte', async ({ page }) => {
  await page.goto('/#marte')
  await expect(page.getByRole('heading', { name: 'Elegí un lugar en Marte' })).toBeVisible()
})
