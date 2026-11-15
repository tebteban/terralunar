import { expect, test } from '@playwright/test'
import { gotoExplore, watchConsole } from './helpers'

// Explorar sin ejecución: no hay ranking inventado; el flujo con datos reales está en analysis-flow.spec.ts.
test.describe('Explorar: estado inicial, ficha y fuentes', () => {
  test('sin ejecución no muestra candidatos y explica cómo obtenerlos', async ({ page }) => {
    const con = watchConsole(page)
    await gotoExplore(page)
    await page.getByRole('button', { name: /Ficha y candidatos terrestres/ }).click()
    const ranking = page.getByRole('region', { name: 'Candidatos de la ejecución' })
    await expect(ranking).toContainText('Elegí un destino y ejecutá la comparación')
    await expect(page.getByRole('heading', { name: 'Límites de la analogía' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Cuerpo visualizado' }).getByRole('button', { name: 'Comparador 3D' })).toBeDisabled()
    await page.waitForTimeout(1000)
    con.expectClean()
  })

  test('el diálogo Fuentes y método abre y cierra con Escape', async ({ page }) => {
    await gotoExplore(page)
    await page.getByRole('button', { name: 'Fuentes y método' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Fuentes y método' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('link')).toHaveCount(4)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})
