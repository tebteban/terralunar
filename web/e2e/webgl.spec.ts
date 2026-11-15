import { expect, test } from '@playwright/test'
import { openRanking, watchConsole } from './helpers'

// Proyecto "sin-webgl" (Chromium con --disable-3d-apis): la app no debe romperse, debe explicar qué falta.
test('sin WebGL: Tierra, Luna y Marte muestran un aviso en vez de una pantalla vacía', async ({ page }) => {
  const con = watchConsole(page)
  await page.goto('/#explorar')
  await openRanking(page)
  await expect(page.getByRole('button', { name: /#01/ })).toBeVisible()
  await expect(page.locator('[role=status]:visible', { hasText: 'WebGL' }).first()).toBeVisible()
  await page.getByRole('navigation', { name: 'Cuerpo visualizado' }).getByRole('button', { name: 'Luna', exact: true }).click()
  await expect(page.locator('[role=status]:visible', { hasText: 'WebGL' }).first()).toBeVisible()
  await page.getByRole('navigation', { name: 'Cuerpo visualizado' }).getByRole('button', { name: 'Marte', exact: true }).click()
  await expect(page.locator('[role=status]:visible', { hasText: 'WebGL' }).first()).toBeVisible()
  expect(con.errors.filter((e) => /pageerror/.test(e))).toEqual([])
})
