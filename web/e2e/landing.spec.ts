import { expect, test } from '@playwright/test'
import { watchConsole } from './helpers'

test.describe('Portada', () => {
  test('muestra las tres opciones y datos NASA, sin errores de consola', async ({ page }) => {
    const con = watchConsole(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'TerraLunar' })).toBeVisible()
    const opciones = page.getByRole('list').getByRole('button')
    await expect(opciones).toHaveCount(3)
    await expect(opciones.nth(0)).toContainText('Luna')
    await expect(opciones.nth(1)).toContainText('Marte')
    await expect(opciones.nth(2)).toContainText('Personalizado')
    await expect(page.getByText(/MODIS · GPM IMERG · NASADEM/)).toBeVisible()
    await page.waitForTimeout(1500)
    con.expectClean()
  })

  test('atajos de teclado 1/2/3 y botón atrás del navegador', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('1')
    await expect(page).toHaveURL(/#explorar$/)
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1, name: 'TerraLunar' })).toBeVisible()
    await page.keyboard.press('2')
    await expect(page).toHaveURL(/#marte$/)
    await page.goBack()
    await page.keyboard.press('3')
    await expect(page).toHaveURL(/#personalizado$/)
  })

  test('navegación por teclado: Tab llega a las opciones y Enter las activa', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: /Luna/ })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#explorar$/)
  })
})
