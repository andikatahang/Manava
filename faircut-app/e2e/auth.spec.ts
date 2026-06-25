import { test, expect } from '@playwright/test'

const roles = [
  'Superadmin',
  'Admin Manager',
  'Editor',
  'Client',
  'Mediator',
  'Finance',
] as const

test('login page renders role selector', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  for (const role of roles) {
    await expect(page.getByRole('button', { name: role })).toBeVisible()
  }
})

test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/login')
})

for (const role of roles) {
  test(`${role} can log in and reach dashboard`, async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: role }).click()
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('main')).toBeVisible()
  })
}
