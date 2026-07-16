import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('Profile', () => {
  test('should show profile title', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('h2.profile-name')).toBeVisible();
  });

  test('should show personal info button', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('button', { hasText: 'Información personal' })).toBeVisible();
  });

  test('should show logout button', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('button', { hasText: 'Cerrar sesión' })).toBeVisible();
  });
});
