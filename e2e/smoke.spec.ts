import { expect, test } from '@playwright/test'

test('loads the brand shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Spider' })).toBeVisible()
})
