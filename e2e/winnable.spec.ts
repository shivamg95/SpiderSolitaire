import { expect, type Page, test } from '@playwright/test'

/**
 * The safety net, end to end.
 *
 * The solver's verdicts are unit-tested; what needs a browser is the chrome
 * around them, so these tests state a verdict through the test bridge
 * (src/features/testing/bridge.ts) and check that the warning, the rescue panel
 * and the rewind all behave on a real board.
 */

interface SpiderBridge {
  play: (encoded: string) => number
  moveCount: () => number
  board: () => string
  setWinnability: (state: string) => void
  setRescuePlan: (plan: { index: number; movesBack: number } | null) => void
  stopWatcher: () => void
}

declare global {
  interface Window {
    __spider: SpiderBridge
  }
}

async function boot(page: Page, search = ''): Promise<void> {
  await page.goto(`/${search}`)
  await expect(page.getByRole('button', { name: /deal stock/i })).toBeVisible()
  await page.waitForFunction(() => typeof window.__spider !== 'undefined')
}

test('a fresh deal carries the verified badge', async ({ page }) => {
  await boot(page)
  await expect(page.getByLabel(/verified winnable/i).first()).toBeAttached()
})

test('a shared deal makes no winnability claim', async ({ page }) => {
  // Seed 0 is not in the pool, so the badge would be a promise the app cannot keep.
  await boot(page, '?seed=0&d=4')
  await expect(page.getByLabel(/verified winnable/i)).toHaveCount(0)
})

test('warns about the move that killed the deal, and undoes it', async ({ page }) => {
  await boot(page)
  await page.evaluate(() => {
    window.__spider.stopWatcher()
  })
  const before = await page.evaluate(() => window.__spider.board())
  await page.evaluate(() => window.__spider.play('.'))
  await page.evaluate(() => {
    window.__spider.setWinnability('lost')
  })

  // The side rail has an Undo of its own, so take the banner's.
  const banner = page.getByRole('status').filter({ hasText: /unwinnable/i })
  await expect(banner).toBeVisible()
  await banner.getByRole('button', { name: 'Undo' }).click()

  // Back at the deal, so nothing the player did can be to blame any more.
  await expect(banner).toBeHidden()
  expect(await page.evaluate(() => window.__spider.board())).toBe(before)
})

test('rescue rewinds to the position it offered', async ({ page }) => {
  await boot(page)
  await page.evaluate(() => {
    window.__spider.stopWatcher()
  })
  const dealt = await page.evaluate(() => window.__spider.board())
  await page.evaluate(() => window.__spider.play('.'))
  await page.evaluate(() => {
    window.__spider.setWinnability('lost')
  })

  await page.getByRole('button', { name: 'Rescue' }).click()
  const dialog = page.getByRole('dialog', { name: /rescue this deal/i })
  await expect(dialog).toBeVisible()

  // The real search runs in the solver worker; wait for it to report before
  // naming the position to rewind to, or its answer would overwrite ours.
  await expect(dialog.getByText(/searching/i)).toBeHidden({ timeout: 30_000 })
  await page.evaluate(() => {
    window.__spider.setRescuePlan({ index: 0, movesBack: 1 })
  })
  await page.getByRole('button', { name: /rewind 1 move/i }).click()

  await expect(page.getByRole('dialog', { name: /rescue this deal/i })).toBeHidden()
  expect(await page.evaluate(() => window.__spider.moveCount())).toBe(0)
  expect(await page.evaluate(() => window.__spider.board())).toBe(dealt)
})
