import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { gotoExplore } from './helpers'

// axe-core sobre cada pantalla. Se excluyen los lienzos WebGL (MapLibre/three) y la atribución de MapLibre, que no controlamos.
const audit = (page: Parameters<typeof AxeBuilder>[0]['page']) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).exclude('canvas').exclude('.maplibregl-ctrl').analyze()

const resumen = (r: Awaited<ReturnType<typeof audit>>) => r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nodos — ${v.nodes[0]?.target.join(' ')}`)

test('portada sin violaciones WCAG AA', async ({ page }) => {
  await page.goto('/')
  expect(resumen(await audit(page))).toEqual([])
})

test('personalizado sin violaciones WCAG AA', async ({ page }) => {
  await page.goto('/#personalizado')
  await page.getByRole('button', { name: 'Rover', exact: true }).click()
  expect(resumen(await audit(page))).toEqual([])
})

test('explorar con ficha abierta sin violaciones WCAG AA', async ({ page }) => {
  await gotoExplore(page)
  await page.getByRole('button', { name: /#01/ }).click()
  await expect(page.getByRole('article')).toBeVisible()
  expect(resumen(await audit(page))).toEqual([])
})

test('Marte sin violaciones WCAG AA', async ({ page }) => {
  await page.goto('/#marte')
  await expect(page.getByRole('heading', { name: 'Elegí un lugar en Marte' })).toBeVisible()
  expect(resumen(await audit(page))).toEqual([])
})
