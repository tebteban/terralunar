import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { gotoExplore, openSurface } from './helpers'

// axe-core sobre cada pantalla. Se excluyen los lienzos WebGL (MapLibre/three) y la atribución de MapLibre, que no controlamos.
const audit = (page: Parameters<typeof AxeBuilder>[0]['page']) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).exclude('canvas').exclude('.maplibregl-ctrl').analyze()

const resumen = (r: Awaited<ReturnType<typeof audit>>) => r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nodos — ${v.nodes[0]?.target.join(' ')}`)

test('portada sin violaciones WCAG AA', async ({ page }) => {
  await page.goto('/')
  expect(resumen(await audit(page))).toEqual([])
})

test('buscador de análogos sin violaciones WCAG AA', async ({ page }) => {
  await page.goto('/#personalizado')
  await expect(page.getByRole('heading', { name: 'Comparar entornos de misión' })).toBeVisible()
  expect(resumen(await audit(page))).toEqual([])
})

test('explorar con ficha abierta sin violaciones WCAG AA', async ({ page }) => {
  await gotoExplore(page)
  await page.getByRole('button', { name: /Ficha y candidatos terrestres/ }).click()
  await expect(page.getByRole('heading', { name: 'Límites de la analogía' })).toBeVisible()
  expect(resumen(await audit(page))).toEqual([])
})

test('Marte sin violaciones WCAG AA', async ({ page }) => {
  await page.goto('/#marte')
  await openSurface(page, 'Ficha de Marte')
  await expect(page.getByRole('heading', { name: 'Elegí un lugar en Marte' })).toBeVisible()
  expect(resumen(await audit(page))).toEqual([])
})
