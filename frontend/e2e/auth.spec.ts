import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should render login page with email and password fields', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show login page elements', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('h1', { hasText: 'Iniciar sesión' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should show forgot password link', async ({ page }) => {
    await page.goto('/auth/login');
    const forgotLink = page.locator('button', { hasText: 'Olvidaste tu contraseña' });
    await expect(forgotLink).toBeVisible();
  });
});

test.describe('Register', () => {
  test('should render all form fields', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.getByLabel('Nombre completo')).toBeVisible();
    await expect(page.getByLabel('Correo')).toBeVisible();
    await expect(page.getByLabel('Empresa')).toBeVisible();
    await expect(page.getByLabel('Teléfono')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should have submit button', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('button', { hasText: 'Enviar solicitud' })).toBeVisible();
  });

});

test.describe('Forgot Password', () => {
  test('should render email field', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('should have submit and back buttons', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await expect(page.locator('button', { hasText: 'Enviar instrucciones' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Volver al inicio de sesión' })).toBeVisible();
  });
});
