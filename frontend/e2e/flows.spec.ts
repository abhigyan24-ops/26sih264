import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASELINE_PATH = path.resolve(__dirname, 'baseline', 'api-calls.json')
const SCREENSHOT_DIR = path.resolve(__dirname, '..', '..', 'docs', 'design', 'before')

// In-memory collector for API requests
const observedCalls: Record<string, Set<string>> = {
  login: new Set(),
  dashboard: new Set(),
  cases_list: new Set(),
  case_detail: new Set(),
  register_case: new Set(),
  overlaps: new Set(),
  alerts: new Set(),
  reports: new Set(),
  admin: new Set(),
}

function normalizeUrl(pathname: string): string {
  // Replace numeric IDs with :id (e.g. /api/cases/123 -> /api/cases/:id)
  return pathname.replace(/\/\d+(?=\/|$)/g, '/:id')
}

function attachCollector(page: any, flowName: string) {
  page.on('request', (req: any) => {
    try {
      const url = new URL(req.url())
      // Strictly backend API calls; ignore Vite ESM module requests
      if (url.pathname.startsWith('/api/') && !url.pathname.includes('/src/')) {
        const norm = `${req.method()} ${normalizeUrl(url.pathname)}`
        if (observedCalls[flowName]) {
          observedCalls[flowName].add(norm)
        }
      }
    } catch {}
  })
}

async function loginAsAdmin(page: any) {
  await page.goto('/login')
  await page.fill('input[placeholder*="officer username"]', 'admin')
  await page.fill('input[placeholder*="secure password"]', 'demo123')
  await page.click('button[type="submit"]')
  await page.waitForURL('http://localhost:5173/**')
  await page.waitForTimeout(500)
}

test.describe.serial('CaseNexus Flow Contract & Baseline Suite', () => {
  test.beforeAll(() => {
    fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true })
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  })

  test('01 - Login Flow & Screenshots', async ({ page }) => {
    attachCollector(page, 'login')
    await page.goto('/login')

    const isMobile = page.viewportSize()?.width! < 500
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `login-${isMobile ? 'mobile' : 'desktop'}.png`),
      fullPage: true,
    })

    // Fill credentials for demo admin
    await page.fill('input[placeholder*="officer username"]', 'admin')
    await page.fill('input[placeholder*="secure password"]', 'demo123')
    await page.click('button[type="submit"]')

    await page.waitForURL('http://localhost:5173/**')
    await expect(page.locator('h1, header, aside').first()).toBeVisible()
    await page.waitForTimeout(1000)
  })

  test('02 - Dashboard Flow & Screenshots', async ({ page }) => {
    await loginAsAdmin(page)
    attachCollector(page, 'dashboard')

    await page.goto('/')
    await page.waitForTimeout(1000)

    const isMobile = page.viewportSize()?.width! < 500
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `dashboard-${isMobile ? 'mobile' : 'desktop'}.png`),
      fullPage: true,
    })
  })

  test('03 - Cases List & Filter Flow', async ({ page }) => {
    await loginAsAdmin(page)
    attachCollector(page, 'cases_list')

    await page.goto('/cases')
    await page.waitForSelector('table')
    await page.waitForTimeout(800)

    const isMobile = page.viewportSize()?.width! < 500
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `cases-${isMobile ? 'mobile' : 'desktop'}.png`),
      fullPage: true,
    })

    const searchInput = page.locator('input[placeholder*="Search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('hostel')
      await page.waitForTimeout(600)
    }
  })

  test('04 - Case Detail Flow', async ({ page }) => {
    await loginAsAdmin(page)
    attachCollector(page, 'case_detail')

    await page.goto('/cases/1')
    await page.waitForTimeout(1200)

    const isMobile = page.viewportSize()?.width! < 500
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `case-detail-${isMobile ? 'mobile' : 'desktop'}.png`),
      fullPage: true,
    })
  })

  test('05 - Register Case Dialog Flow', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/cases')
    await page.waitForSelector('table')

    attachCollector(page, 'register_case')

    const registerBtn = page.locator('button:has-text("Register Case")').first()
    if (await registerBtn.isVisible()) {
      await registerBtn.click()
      await page.waitForTimeout(500)

      const instInput = page.locator('input[placeholder*="college name"]').first()
      if (await instInput.isVisible()) {
        await instInput.fill('Netaji Subhas')
        await page.waitForTimeout(800)
      }

      const isMobile = page.viewportSize()?.width! < 500
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `register-case-${isMobile ? 'mobile' : 'desktop'}.png`),
      })

      const closeBtn = page.locator('button:has-text("Cancel"), button[aria-label="Close"]').first()
      if (await closeBtn.isVisible()) {
        await closeBtn.click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('06 - Overlap Review Flow', async ({ page }) => {
    await loginAsAdmin(page)
    attachCollector(page, 'overlaps')

    await page.goto('/overlaps')
    await page.waitForTimeout(1200)

    const isMobile = page.viewportSize()?.width! < 500
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `overlaps-${isMobile ? 'mobile' : 'desktop'}.png`),
      fullPage: true,
    })
  })

  test('07 - Alerts Flow', async ({ page }) => {
    await loginAsAdmin(page)
    attachCollector(page, 'alerts')

    await page.goto('/alerts')
    await page.waitForTimeout(1200)

    const isMobile = page.viewportSize()?.width! < 500
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `alerts-${isMobile ? 'mobile' : 'desktop'}.png`),
      fullPage: true,
    })
  })

  test('08 - Reports Flow', async ({ page }) => {
    await loginAsAdmin(page)
    attachCollector(page, 'reports')

    await page.goto('/reports')
    await page.waitForTimeout(1500)

    const isMobile = page.viewportSize()?.width! < 500
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `reports-${isMobile ? 'mobile' : 'desktop'}.png`),
      fullPage: true,
    })
  })

  test('09 - Admin Governance Flow', async ({ page }) => {
    await loginAsAdmin(page)
    attachCollector(page, 'admin')

    await page.goto('/admin')
    await page.waitForTimeout(1200)

    const isMobile = page.viewportSize()?.width! < 500
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `admin-${isMobile ? 'mobile' : 'desktop'}.png`),
      fullPage: true,
    })
  })

  test('10 - Offline Isolation Test (No External CDN/Requests)', async ({ page }) => {
    let externalAttempted = false
    await page.route('**/*', (route) => {
      const url = route.request().url()
      const isLocal =
        url.startsWith('http://localhost') ||
        url.startsWith('http://127.0.0.1') ||
        url.startsWith('data:') ||
        url.startsWith('blob:')
      if (!isLocal) {
        externalAttempted = true
        route.abort()
      } else {
        route.continue()
      }
    })

    await page.goto('/login')
    await page.fill('input[placeholder*="officer username"]', 'admin')
    await page.fill('input[placeholder*="secure password"]', 'demo123')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:5173/**')

    await page.goto('/cases')
    await page.waitForSelector('table')
    expect(externalAttempted).toBe(false)
  })

  test('11 - Reduced Motion Test', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/login')
    await page.fill('input[placeholder*="officer username"]', 'admin')
    await page.fill('input[placeholder*="secure password"]', 'demo123')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:5173/**')
    await expect(page.locator('body')).toBeVisible()
  })

  test.afterAll(() => {
    const isBaselineUpdate =
      process.env.UPDATE_BASELINE === '1' || !fs.existsSync(BASELINE_PATH)

    const serializable: Record<string, string[]> = {}
    for (const [flow, calls] of Object.entries(observedCalls)) {
      serializable[flow] = Array.from(calls).sort()
    }

    if (isBaselineUpdate) {
      let existing: Record<string, string[]> = {}
      if (fs.existsSync(BASELINE_PATH)) {
        try {
          existing = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'))
        } catch {}
      }
      const merged: Record<string, string[]> = {}
      const allKeys = Array.from(
        new Set([...Object.keys(existing), ...Object.keys(serializable)])
      )
      for (const k of allKeys) {
        merged[k] = Array.from(
          new Set([...(existing[k] || []), ...(serializable[k] || [])])
        ).sort()
      }
      fs.writeFileSync(BASELINE_PATH, JSON.stringify(merged, null, 2), 'utf-8')
      console.log('Recorded/updated baseline API calls in', BASELINE_PATH)
    } else {
      const baseline: Record<string, string[]> = JSON.parse(
        fs.readFileSync(BASELINE_PATH, 'utf-8')
      )
      console.log('Comparing executed calls against baseline...')
      for (const [flow, current] of Object.entries(serializable)) {
        const expected = baseline[flow] || []
        for (const call of expected) {
          expect(current).toContain(call)
        }
      }
    }
  })
})
