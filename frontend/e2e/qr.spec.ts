import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('QR Generate - Form', () => {
  test('should render all form fields', async ({ page }) => {
    await page.goto('/qr/generate');
    await expect(page.getByPlaceholder('0.00')).toBeVisible();
    await expect(page.locator('#concepto')).toBeVisible();
    await expect(page.locator('input[type="datetime-local"]')).toBeVisible();
  });

  test('should have generate and history buttons', async ({ page }) => {
    await page.goto('/qr/generate');
    await expect(page.locator('button.pill')).toBeVisible();
    await expect(page.locator('button.link')).toBeVisible();
  });

  test('should switch between BOB and USD currency', async ({ page }) => {
    await page.goto('/qr/generate');
    const currencySelect = page.locator('select.field-currency');
    await expect(currencySelect).toHaveValue('BOB');
    await currencySelect.selectOption('USD');
    await expect(currencySelect).toHaveValue('USD');
    await currencySelect.selectOption('BOB');
    await expect(currencySelect).toHaveValue('BOB');
  });

  test('should toggle single use', async ({ page }) => {
    await page.goto('/qr/generate');
    const toggle = page.locator('button.toggle');
    await expect(toggle).toHaveClass(/active/);
    await toggle.click();
    await expect(toggle).not.toHaveClass(/active/);
    await toggle.click();
    await expect(toggle).toHaveClass(/active/);
  });

  test('should show validation error with empty amount', async ({ page }) => {
    await page.goto('/qr/generate');
    await page.locator('button.pill').click();
    await expect(page.locator('div.error')).toBeVisible();
    await expect(page.locator('div.error')).toContainText('monto válido');
  });

  test('should navigate to history page', async ({ page }) => {
    await page.goto('/qr/generate');
    await page.locator('button.link', { hasText: 'Historial' }).click();
    await expect(page).toHaveURL('/qr/history');
  });
});

test.describe('QR History', () => {
  test('should render history page', async ({ page }) => {
    await page.goto('/qr/history');
    await expect(page.locator('h1.pl-title')).toContainText('Historial');
  });
});

test.describe('QR Status', () => {
  test('should show error without qrId', async ({ page }) => {
    await page.goto('/qr/status');
    await expect(page.locator('div.error')).toBeVisible();
  });

  test('should show retry with invalid qrId', async ({ page }) => {
    await page.goto('/qr/status?id=invalid-qr-id');
    await expect(page.locator('button.link')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('QR Generate - Real API', () => {
  test('should generate QR with valid amount and redirect to status', async ({ page }) => {
    test.setTimeout(180000);

    await page.goto('/qr/generate');
    await page.getByPlaceholder('0.00').fill('50');
    await page.locator('#concepto').fill('Pago de prueba Playwright');

    // Click generate — POST to Baneco is slow (~5-30s)
    await page.locator('button.pill').click();

    // Wait for navigation to /qr/status?id=...
    await page.waitForURL(/\/qr\/status\?id=.+/, { timeout: 120000 });

    // Status page loaded, should see QR image
    await page.waitForSelector('img.qr-img', { timeout: 60000 });
    await expect(page.locator('img.qr-img')).toBeVisible();
    await expect(page.locator('h1.pl-title')).toContainText('QR');
  });
});
