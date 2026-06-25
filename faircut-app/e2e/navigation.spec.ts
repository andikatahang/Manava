import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Superadmin' }).click()
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL('/dashboard')
})

const routes = [
  ['/recruitment', 'Recruitment'],
  ['/projects', 'Projects'],
  ['/contracts', 'Contracts'],
  ['/payments', 'Escrow'],
  ['/attendance', 'Attendance'],
  ['/performance', 'Performance'],
  ['/disputes', 'Disputes'],
  ['/deliverables', 'Deliverable'],
  ['/audit', 'Audit'],
  ['/chat', 'Chat'],
  ['/ess', 'Self'],
  ['/offboarding', 'Offboarding'],
  ['/settings', 'Settings'],
] as const

for (const [path, heading] of routes) {
  test(`${path} page loads`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('header')).toContainText(heading)
  })
}
