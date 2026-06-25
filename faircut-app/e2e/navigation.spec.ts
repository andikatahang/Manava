import { test, expect } from '@playwright/test'

async function loginAs(page: import('@playwright/test').Page, role: string) {
  await page.goto('/login')
  await page.locator('button[type="button"]').filter({ hasText: role }).first().click()
  await page.getByRole('button', { name: new RegExp(`sign in as .+`, 'i') }).click()
  await expect(page).toHaveURL('/dashboard')
}

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'Superadmin')
})

const routes: [string, string][] = [
  ['/recruitment', 'Recruitment'],
  ['/projects', 'Projects'],
  ['/contracts', 'Contracts'],
  ['/payments', 'Escrow'],
  ['/attendance', 'Attendance'],
  ['/performance', 'Performance'],
  ['/disputes', 'Dispute'],
  ['/deliverables', 'Deliverable'],
  ['/audit', 'Audit'],
  ['/chat', 'Chat'],
  ['/ess', 'Self'],
  ['/offboarding', 'Offboarding'],
  ['/settings', 'Settings'],
]

for (const [path, heading] of routes) {
  test(`${path} page loads`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('header')).toContainText(heading)
  })
}
