import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should render login page with email and password fields', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('#email-input', { timeout: 10000 });
    await expect(page.locator('#email-input')).toBeVisible();
    await expect(page.locator('#password-input')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show title and social login', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('h2')).toContainText('Iniciar sesión');
    await expect(page.locator('.google-button')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/auth/login');
    await page.click('a[href="/auth/register"]');
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});
