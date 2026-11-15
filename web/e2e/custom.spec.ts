import { expect, test } from '@playwright/test'

test.describe('Búsqueda personalizada (formulario)', () => {
  test('vacío: el CTA está deshabilitado y la vista previa lo explica', async ({ page }) => {
    await page.goto('/#personalizado')
    await expect(page.getByRole('heading', { name: 'Armá tu búsqueda' })).toBeVisible()
    await expect(page.getByText('0 de 7')).toBeVisible()
    await expect(page.getByRole('button', { name: /Ver las 20 zonas/ })).toBeDisabled()
    await expect(page.getByText('Elegí al menos una variable de la lista.')).toBeVisible()
  })

  test('válido: elegir variables arma pesos que suman 100 % y muestra 5 mejores', async ({ page }) => {
    await page.goto('/#personalizado')
    await page.getByRole('button', { name: 'Rover', exact: true }).click()
    await expect(page.getByText('3 de 7')).toBeVisible()
    const pesos = page.getByRole('complementary', { name: 'Vista previa' }).getByText(/^\d+%$/)
    await expect(pesos).toHaveCount(3)
    const suma = (await pesos.allTextContents()).reduce((s, t) => s + Number(t.replace('%', '')), 0)
    expect(suma).toBeGreaterThanOrEqual(99)
    expect(suma).toBeLessThanOrEqual(101)
    await expect(page.getByRole('complementary', { name: 'Vista previa' }).getByRole('listitem')).toHaveCount(5)
    await page.getByRole('button', { name: /Ver las 20 zonas/ }).click()
    await expect(page).toHaveURL(/#explorar$/)
    await expect(page.getByText('Búsqueda personalizada · 3 variables')).toBeVisible()
    await expect(page.getByRole('slider')).toHaveCount(3)
  })

  test('cambiar importancia y limpiar', async ({ page }) => {
    await page.goto('/#personalizado')
    await page.getByRole('button', { name: /^Pendiente/ }).click()
    const grupo = page.getByRole('group', { name: 'Importancia de Pendiente' })
    await expect(grupo.getByRole('button', { name: 'Media' })).toHaveAttribute('aria-pressed', 'true')
    await grupo.getByRole('button', { name: 'Alta' }).click()
    await expect(grupo.getByRole('button', { name: 'Alta' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Limpiar' }).click()
    await expect(page.getByText('0 de 7')).toBeVisible()
  })
})
