import { test as setup } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill('admin@pagui.com');
  await page.locator('input[type="password"]').fill('admin123');
  await page.locator('button', { hasText: 'Iniciar sesión' }).click();
  await page.waitForURL('/');
  await page.context().storageState({ path: authFile });
});
