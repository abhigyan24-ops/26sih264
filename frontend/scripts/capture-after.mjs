// CaseNexus Civic Ledger 'After' Screenshots Generator (Task F09)
// Run with: node scripts/capture-after.mjs

import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUT_DIR = path.resolve(__dirname, '..', '..', 'docs', 'design', 'after')
fs.mkdirSync(OUT_DIR, { recursive: true })

const viewports = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
]

async function run() {
  console.log('='.repeat(70))
  console.log("CAPTURING 'AFTER' SCREENSHOTS (Civic Ledger Design)")
  console.log('='.repeat(70))

  const browser = await chromium.launch({ channel: 'chrome', headless: true })

  for (const vp of viewports) {
    console.log(`\nCapturing viewport: ${vp.name} (${vp.width}x${vp.height})...`)
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await context.newPage()

    // 1. Login
    await page.goto('http://localhost:5173/login')
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(OUT_DIR, `login-${vp.name}.png`), fullPage: true })
    console.log(`✔ Saved login-${vp.name}.png`)

    // Perform Login
    await page.fill('input[placeholder*="officer username"]', 'admin')
    await page.fill('input[placeholder*="secure password"]', 'demo123')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:5173/')
    await page.waitForTimeout(600)

    // 2. Dashboard
    await page.screenshot({ path: path.join(OUT_DIR, `dashboard-${vp.name}.png`), fullPage: true })
    console.log(`✔ Saved dashboard-${vp.name}.png`)

    // 3. Cases
    await page.goto('http://localhost:5173/cases')
    await page.waitForSelector('table')
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(OUT_DIR, `cases-${vp.name}.png`), fullPage: true })
    console.log(`✔ Saved cases-${vp.name}.png`)

    // 4. Case Detail
    const firstCase = page.locator('table tbody tr a').first()
    if (await firstCase.isVisible()) {
      await firstCase.click()
      await page.waitForTimeout(800)
      await page.screenshot({ path: path.join(OUT_DIR, `case-detail-${vp.name}.png`), fullPage: true })
      console.log(`✔ Saved case-detail-${vp.name}.png`)
    }

    // 5. Register Case Dialog
    await page.goto('http://localhost:5173/cases')
    await page.waitForSelector('table')
    const registerBtn = page.locator('button:has-text("Register Case")').first()
    if (await registerBtn.isVisible()) {
      await registerBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(OUT_DIR, `register-case-${vp.name}.png`) })
      console.log(`✔ Saved register-case-${vp.name}.png`)
      const closeBtn = page.locator('button[aria-label="Close dialog"], button:has-text("Cancel")').first()
      if (await closeBtn.isVisible()) await closeBtn.click()
    }

    // 6. Overlaps
    await page.goto('http://localhost:5173/overlaps')
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(OUT_DIR, `overlaps-${vp.name}.png`), fullPage: true })
    console.log(`✔ Saved overlaps-${vp.name}.png`)

    // 7. Alerts
    await page.goto('http://localhost:5173/alerts')
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(OUT_DIR, `alerts-${vp.name}.png`), fullPage: true })
    console.log(`✔ Saved alerts-${vp.name}.png`)

    // 8. Reports
    await page.goto('http://localhost:5173/reports')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(OUT_DIR, `reports-${vp.name}.png`), fullPage: true })
    console.log(`✔ Saved reports-${vp.name}.png`)

    // 9. Admin
    await page.goto('http://localhost:5173/admin')
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(OUT_DIR, `admin-${vp.name}.png`), fullPage: true })
    console.log(`✔ Saved admin-${vp.name}.png`)

    await context.close()
  }

  await browser.close()
  console.log('\nAll 18 after screenshots saved to docs/design/after/ successfully.')
  console.log('='.repeat(70))
}

run().catch((err) => {
  console.error('Error capturing after screenshots:', err)
  process.exit(1)
})
