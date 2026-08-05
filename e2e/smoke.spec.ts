import { expect, test } from '@playwright/test'

test('loads the brand shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /spider solitaire/i })).toBeAttached()
  await expect(page.getByRole('button', { name: /deal stock/i })).toBeVisible()
})
