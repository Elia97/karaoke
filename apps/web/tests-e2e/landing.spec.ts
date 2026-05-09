import { expect, test } from '@playwright/test'

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h1', { timeout: 30_000 })
  })

  test('renders welcome content with both CTAs', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Karaoke')
    await expect(page.getByText(/sono partecipante/i)).toBeVisible()
    await expect(page.getByText(/sono il dj/i)).toBeVisible()
  })

  test('"Sono partecipante" naviga a /join', async ({ page }) => {
    await page.getByText(/sono partecipante/i).click()
    await expect(page).toHaveURL(/\/join$/)
    await expect(page.locator('h1')).toContainText(/unisciti/i)
  })

  test('"Sono il DJ" naviga sotto /host (l\'auth guard porta a /host/login solo con server up)', async ({
    page,
  }) => {
    await page.getByText(/sono il dj/i).click()
    await expect(page).toHaveURL(/\/host/)
  })
})
