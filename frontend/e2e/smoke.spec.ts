import { test, expect } from '@playwright/test'

test('frontend root redirects to login', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL('**/login')
  await expect(page.locator('input[placeholder*="officer username"]')).toBeVisible()
})

test('dev UI component gallery renders all primitives', async ({ page }) => {
  await page.goto('/__ui')
  await expect(page.locator('h1:has-text("Civic Ledger")')).toBeVisible()
  await expect(page.locator('text=Status Chips')).toBeVisible()
  await expect(page.locator('text=Ledger DataTable')).toBeVisible()
})
