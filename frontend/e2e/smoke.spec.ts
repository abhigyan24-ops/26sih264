import { test, expect } from '@playwright/test'

test('frontend root redirects to login or loads', async ({ page }) => {
  await page.goto('/')
  // Should redirect to /login or show title
  await expect(page).toHaveTitle(/CaseNexus|AICTE/i)
})
