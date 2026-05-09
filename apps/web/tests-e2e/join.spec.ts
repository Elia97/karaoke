import { expect, test } from '@playwright/test'

test.describe('Join form', () => {
  test('rifiuta codice non valido', async ({ page }) => {
    await page.goto('/join')
    await page.getByPlaceholder('ABC123').fill('XX')
    await page.getByPlaceholder('Marco_99').fill('Marco')
    await page.getByRole('button', { name: /entra/i }).click()
    await expect(page.getByText(/codice non valido/i)).toBeVisible()
  })

  test('rifiuta nickname non valido', async ({ page }) => {
    await page.goto('/join')
    await page.getByPlaceholder('ABC123').fill('ABC123')
    await page.getByPlaceholder('Marco_99').fill('a')
    await page.getByRole('button', { name: /entra/i }).click()
    await expect(page.getByText(/nickname non valido/i)).toBeVisible()
  })

  test('preserva il codice da query param', async ({ page }) => {
    await page.goto('/join?code=ABC123')
    await expect(page.getByPlaceholder('ABC123')).toHaveValue('ABC123')
  })
})
