import { expect, test } from '@playwright/test'
import { gotoExplore, openSurface } from './helpers'

test.describe('Luna y Marte', () => {
  test('Luna: elegir Mons Mouton da 4 métricas LOLA y lleva el punto al buscador', async ({ page }) => {
    test.slow() // globo lunar + dos maquetas WebGL en software GL, en paralelo con la bajada de MOLA
    await gotoExplore(page)
    await page.getByRole('navigation', { name: 'Cuerpo visualizado' }).getByRole('button', { name: 'Luna', exact: true }).click()
    await openSurface(page, 'Ficha de la Luna')
    await page.getByRole('button', { name: 'Mons Mouton' }).click()
    await expect(page.getByRole('heading', { name: 'Punto elegido en la Luna' })).toBeVisible()
    await expect(page.getByText(/a \d+ km de Mons Mouton/)).toBeVisible()
    const dl = page.locator('dl').filter({ hasText: 'Pendiente mediana' })
    await expect(dl.getByRole('definition')).toHaveCount(4)
    await expect(dl.getByText(/^\d+,\d°$/)).toHaveCount(2) // pendientes con coma decimal (es-AR)
    await expect(dl.getByText(/^[\d.]+(,\d)? m$/)).toHaveCount(2) // metros: 3,3 m o 1.513 m
    // los análogos terrestres se calculan en el buscador; el comparador 3D lo cubre analysis-flow.spec.ts
    await page.getByRole('button', { name: 'Buscar análogos de esta región' }).click()
    const dialog = page.locator('dialog[open]')
    await expect(dialog.getByRole('heading', { name: 'Comparar entornos de misión' })).toBeVisible()
    await expect(dialog.getByLabel('Destino de misión')).toHaveValue('selected')
    await expect(dialog.getByRole('option', { name: /Luna · punto/ })).toBeAttached()
  })

  test('Marte: latitud inválida muestra error; Jezero devuelve métricas MOLA', async ({ page }) => {
    test.slow() // baja ~16 tiles de MOLA la primera vez
    await page.goto('/#marte')
    await openSurface(page, 'Ficha de Marte')
    await expect(page.getByRole('heading', { name: 'Elegí un lugar en Marte' })).toBeVisible()
    const lat = page.getByLabel('Latitud marciana')
    await lat.fill('120')
    await page.getByRole('button', { name: 'Ir' }).click()
    // el formulario nativo (min/max) frena el envío: el campo queda inválido y no se calcula nada
    expect(await lat.evaluate((el: HTMLInputElement) => el.validity.rangeOverflow)).toBe(true)
    await expect(page.getByRole('heading', { name: 'Elegí un lugar en Marte' })).toBeVisible()
    await lat.fill('18.44')
    await page.getByRole('button', { name: 'Jezero', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Punto elegido en Marte' })).toBeVisible({ timeout: 90_000 })
    const dl = page.locator('dl').filter({ hasText: 'Pendiente mediana' })
    await expect(dl.getByRole('definition')).toHaveCount(4)
    await expect(page.getByRole('button', { name: 'Buscar análogos de esta región' })).toBeVisible()
  })
})
