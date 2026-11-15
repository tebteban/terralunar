import { expect, test } from '@playwright/test'
import { gotoExplore } from './helpers'

test.describe('Luna y Marte', () => {
  test('Luna: elegir Mons Mouton da 4 métricas LOLA, 6 parecidos y abre el comparador 3D', async ({ page }) => {
    await gotoExplore(page)
    await page.getByRole('navigation', { name: 'Cuerpo visualizado' }).getByRole('button', { name: 'Luna', exact: true }).click()
    await page.getByRole('button', { name: 'Mons Mouton' }).click()
    await expect(page.getByRole('heading', { name: 'Punto elegido en la Luna' })).toBeVisible()
    await expect(page.getByText(/a \d+ km de Mons Mouton/)).toBeVisible()
    const dl = page.locator('dl').filter({ hasText: 'Pendiente mediana' })
    await expect(dl.getByRole('definition')).toHaveCount(4)
    await expect(dl.getByText(/^\d+,\d°$/)).toHaveCount(2) // pendientes con coma decimal (es-AR)
    await expect(dl.getByText(/^[\d.]+(,\d)? m$/)).toHaveCount(2) // metros: 3,3 m o 1.513 m
    const lista = page.getByRole('list').filter({ has: page.getByRole('button', { name: 'Comparar relieve 3D' }) })
    await expect(lista.getByRole('listitem')).toHaveCount(6)
    await lista.getByRole('button', { name: 'Comparar relieve 3D' }).first().click()
    const cmp = page.getByRole('dialog', { name: /Comparador de relieve/ })
    await expect(cmp).toBeVisible()
    await expect(cmp.locator('canvas')).toHaveCount(2)
    await expect(cmp.getByText('Misma escala', { exact: false }).first()).toBeVisible()
    await expect(cmp.getByText(/Parecido de relieve: \d+\/100/)).toBeVisible()
    await expect(cmp.getByRole('heading', { name: 'Límites de la comparación' })).toBeVisible()
    await cmp.getByRole('button', { name: /Cerrar/ }).click()
    await expect(cmp).toBeHidden()
  })

  test('Marte: latitud inválida muestra error; Jezero devuelve métricas MOLA', async ({ page }) => {
    test.slow() // baja ~16 tiles de MOLA la primera vez
    await page.goto('/#marte')
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
    await expect(page.getByText('Lugares parecidos en la Tierra')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Comparar relieve 3D' }).first()).toBeVisible()
  })
})
