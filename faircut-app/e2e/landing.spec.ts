import { test, expect } from '@playwright/test'

test('landing page loads with hero headline', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('h1')).toContainText('Fair')
})

test('landing page has Get Started link that goes to login', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /get started/i }).first().click()
  await expect(page).toHaveURL('/login')
})
