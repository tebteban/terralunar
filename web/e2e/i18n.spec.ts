import {expect, test} from '@playwright/test'

// D-031: la app arranca en inglés y el botón EN | ES está en todas las pantallas.
test.use({storageState: {cookies: [], origins: []}})

test('starts in English and switches to Spanish and back', async ({page}) => {
  await page.goto('/')
  const toggle = page.getByRole('group', {name: 'Language / Idioma'})
  await expect(toggle).toBeVisible()
  await expect(toggle.getByRole('button', {name: 'EN'})).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('What do you want to explore?')).toBeVisible()
  await toggle.getByRole('button', {name: 'ES'}).click()
  await expect(page.getByText('¿Qué querés explorar?')).toBeVisible()
  await page.reload()
  await expect(page.getByText('¿Qué querés explorar?')).toBeVisible() // la elección se recuerda
  await page.getByRole('group', {name: 'Language / Idioma'}).getByRole('button', {name: 'EN'}).click()
  await expect(page.getByText('What do you want to explore?')).toBeVisible()
})

test('the toggle is also inside the search dialog', async ({page}) => {
  await page.goto('/#personalizado')
  const dialog = page.locator('dialog[open]')
  await expect(dialog.getByRole('heading', {name: 'Compare mission environments'})).toBeVisible()
  await dialog.getByRole('group', {name: 'Language / Idioma'}).getByRole('button', {name: 'ES'}).click()
  await expect(dialog.getByRole('heading', {name: 'Comparar entornos de misión'})).toBeVisible()
})
