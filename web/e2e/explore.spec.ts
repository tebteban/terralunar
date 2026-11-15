import { expect, test } from '@playwright/test'
import { gotoExplore, openRanking, watchConsole } from './helpers'

test.describe('Explorar: ranking, pesos y ficha', () => {
  test('ranking de 20 zonas con puntajes 0–100 y pesos que suman ~100 %', async ({ page }) => {
    await gotoExplore(page)
    const filas = page.getByRole('list').filter({ has: page.getByText('#01') }).getByRole('listitem')
    await expect(filas).toHaveCount(20)
    await expect(page.getByText('20 sitios')).toBeVisible()
    const puntajes = await filas.locator('span.metric.text-\\[22px\\]').allTextContents()
    for (const p of puntajes) { const n = Number(p); expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(100) }
    // orden descendente
    expect([...puntajes].map(Number)).toEqual([...puntajes].map(Number).sort((a, b) => b - a))
    const pesos = (await page.getByText(/^\d+%$/).allTextContents()).map((t) => Number(t.replace('%', '')))
    expect(pesos).toHaveLength(7)
    const suma = pesos.reduce((a, b) => a + b, 0)
    expect(suma).toBeGreaterThanOrEqual(99)
    expect(suma).toBeLessThanOrEqual(101)
  })

  test('mover un slider marca "Personalizado" y Restaurar vuelve al preset', async ({ page }) => {
    await gotoExplore(page)
    await expect(page.getByRole('button', { name: 'Movilidad de rover' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('slider').first().fill('0')
    await expect(page.getByText(/Personalizado \(basado en/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Movilidad de rover' })).toHaveAttribute('aria-pressed', 'false')
    await page.getByRole('button', { name: 'Restaurar' }).click()
    await expect(page.getByText(/Personalizado \(basado en/)).toBeHidden()
  })

  test('todos los pesos en 0 muestra un aviso (estado inválido)', async ({ page }) => {
    await gotoExplore(page)
    for (const s of await page.getByRole('slider').all()) await s.fill('0')
    await expect(page.getByRole('alert')).toContainText('Todos los pesos están en 0')
    await expect(page.getByText('0%')).toHaveCount(7)
  })

  test('la ficha muestra datos con formato, límites de la analogía y enlace a Worldview', async ({ page }) => {
    test.slow() // terreno 3D en software GL + Recharts: con dos workers puede pasar de 60 s
    const con = watchConsole(page)
    await gotoExplore(page)
    await openRanking(page)
    await page.getByRole('button', { name: /#01/ }).click()
    const ficha = page.getByRole('article')
    await expect(ficha).toBeVisible()
    await expect(ficha.getByText(/^#01 · .+ · [\d.]+ km²$/)).toBeVisible()
    await expect(ficha.getByText(/^\d+,\d{4}° [NS] · \d+,\d{4}° [EO]/)).toBeVisible() // coordenadas es-AR con hemisferio
    await expect(ficha.getByText('/ 100')).toBeVisible()
    await expect(ficha.getByText('Firma de la zona')).toBeVisible()
    await expect(ficha.getByText(/\+\d+,\d ptos/)).toHaveCount(7)
    const limites = ficha.getByRole('heading', { name: 'Límites de la analogía' })
    await expect(limites).toBeVisible()
    for (const l of ['Gravedad', 'Vacío', 'Radiación', 'Comunicaciones']) await expect(ficha.getByText(`${l}:`)).toBeVisible()
    const link = ficha.getByRole('link', { name: /Worldview/ })
    await expect(link).toHaveAttribute('href', /worldview\.earthdata\.nasa\.gov\/\?v=.+&l=.+&t=\d{4}-\d{2}-\d{2}/)
    await expect(link).toHaveAttribute('target', '_blank')
    await ficha.getByRole('button', { name: 'Cerrar ficha' }).click()
    await expect(ficha).toBeHidden()
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
