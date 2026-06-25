import { test, expect } from '@playwright/test'

const roles = ['Superadmin', 'Admin Manager', 'Editor', 'Client', 'Mediator', 'Finance'] as const

async function selectRole(page: import('@playwright/test').Page, role: string) {
  // Click the role card button (contains the role label as a p child)
  await page.locator('button[type="button"]').filter({ hasText: role }).first().click()
  await page.getByRole('button', { name: new RegExp(`sign in as .+`, 'i') }).click()
}

test('login page renders role selector', async ({ page }) => {
  await page.goto('/login')
  for (const role of roles) {
    await expect(page.locator('button').filter({ hasText: role }).first()).toBeVisible()
  }
})

test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/login')
})

for (const role of roles) {
  test(`${role} can log in and reach dashboard`, async ({ page }) => {
    await page.goto('/login')
    await selectRole(page, role)
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('main')).toBeVisible()
  })
}
