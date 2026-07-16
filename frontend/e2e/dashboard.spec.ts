import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('Dashboard Home', () => {
  test('should show bottom navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav.bottom-nav')).toBeVisible();
    await expect(page.locator('.nav-item')).toHaveCount(4);
    await expect(page.locator('.nav-item-label')).toContainText(['Inicio', 'QR', 'Más', 'Yo']);
  });

  test('should show wallet balance card', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.balance-card')).toBeVisible();
    await expect(page.locator('.balance-label')).toContainText('Saldo disponible');
    await expect(page.locator('.balance-value')).toBeVisible();
    await expect(page.locator('.balance-type')).toBeVisible();
  });

  test('should show quick action buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.quick-actions')).toBeVisible();
    await expect(page.locator('button.qa-item')).toHaveCount(4);
    await expect(page.locator('.qa-label').first()).toContainText('Enviar');
    await expect(page.locator('.qa-label').last()).toContainText('Efectivo');
  });

  test('should show header greeting and avatar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.header-greeting')).toBeVisible();
    await expect(page.locator('.header-name')).toBeVisible();
    await expect(page.locator('.avatar-btn')).toBeVisible();
  });

  test('should show recent transactions section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.section-title')).toContainText('Últimos movimientos');
    await expect(page.locator('.see-all-btn')).toBeVisible();
  });

  test('should navigate to profile via avatar', async ({ page }) => {
    await page.goto('/');
    await page.locator('.avatar-btn').click();
    await expect(page).toHaveURL('/profile');
  });

  test('should navigate via bottom nav', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-item-label', { hasText: 'QR' }).click();
    await expect(page).toHaveURL('/qr');
    await page.locator('.nav-item-label', { hasText: 'Yo' }).click();
    await expect(page).toHaveURL('/profile');
    await page.locator('.nav-item-label', { hasText: 'Inicio' }).click();
    await expect(page).toHaveURL('/');
  });
});
