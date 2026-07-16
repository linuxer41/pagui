import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('Transfers Index', () => {
  test('should show title and action cards', async ({ page }) => {
    await page.goto('/transfers');
    await expect(page.locator('h1.pl-title')).toContainText('Transferencias');
    await expect(page.locator('button.menu-item', { hasText: 'Transferir ahora' }).first()).toBeVisible();
    await expect(page.locator('button.menu-item', { hasText: 'Pago compartido' }).first()).toBeVisible();
    await expect(page.locator('button.menu-item', { hasText: 'Historial' }).first()).toBeVisible();
  });
});

test.describe('P2P Transfer', () => {
  test('should render form fields', async ({ page }) => {
    await page.goto('/transfers/p2p');
    await expect(page.getByLabel('Billetera destino')).toBeVisible();
    await expect(page.getByPlaceholder('0.00')).toBeVisible();
    await expect(page.getByLabel('Descripción (opcional)')).toBeVisible();
  });

  test('should have submit button', async ({ page }) => {
    await page.goto('/transfers/p2p');
    await expect(page.locator('button', { hasText: 'Enviar transferencia' })).toBeVisible();
  });
});
