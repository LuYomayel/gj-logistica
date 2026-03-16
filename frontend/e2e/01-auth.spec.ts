import { test, expect } from '@playwright/test';
import { USERS, loginViaUI, loginViaAPI, logout } from './helpers/auth';

test.describe('Auth — Login / Logout / Route protection', () => {

  // ── Login exitoso ──────────────────────────────────────────────────────────

  test('login via UI with valid credentials redirects to dashboard', async ({ page }) => {
    await loginViaUI(page, USERS.superAdmin);
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Mi Tablero' })).toBeVisible({ timeout: 10_000 });
  });

  test('login via API helper works and lands on dashboard', async ({ page }) => {
    await loginViaAPI(page, USERS.superAdmin);
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Mi Tablero' })).toBeVisible({ timeout: 10_000 });
  });

  test('login stores token and user in localStorage', async ({ page }) => {
    await loginViaUI(page, USERS.superAdmin);

    const token = await page.evaluate(() => localStorage.getItem('gj_token'));
    const userStr = await page.evaluate(() => localStorage.getItem('gj_user'));

    expect(token).toBeTruthy();
    expect(token!.startsWith('eyJ')).toBe(true);

    expect(userStr).toBeTruthy();
    const user = JSON.parse(userStr!);
    expect(user.username).toBe(USERS.superAdmin.username);
    expect(user.userType).toBe('super_admin');
    expect(Array.isArray(user.permissions)).toBe(true);
  });

  // ── Login fallido ──────────────────────────────────────────────────────────

  test('login with invalid credentials returns 401 and stays on login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('#username').fill('nonexistent');

    const pwInput = page.locator('#password input[type="password"], #password input').first();
    await pwInput.waitFor({ state: 'visible' });
    await pwInput.click({ clickCount: 3 });
    await page.keyboard.type('wrongpassword');

    // Intercept the login API call
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/auth/login'),
      { timeout: 15_000 },
    );

    await page.locator('button[type="submit"]').click();
    const resp = await responsePromise;

    // Backend returns 401 for invalid credentials
    expect(resp.status()).toBe(401);

    // Should remain on login page (the 401 interceptor redirects to /login)
    await expect(page).toHaveURL(/login/, { timeout: 5_000 });
  });

  test('login with empty fields shows validation errors', async ({ page }) => {
    await page.goto('/login');
    await page.locator('button[type="submit"]').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText('El usuario es requerido')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('La contraseña es requerida')).toBeVisible();
  });

  // ── Rutas protegidas sin auth ─────────────────────────────────────────────

  test('accessing / without auth redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
  });

  test('accessing /orders without auth redirects to /login', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
  });

  test('accessing /products without auth redirects to /login', async ({ page }) => {
    await page.goto('/products');
    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
  });

  test('accessing /admin/tenants without auth redirects to /login', async ({ page }) => {
    await page.goto('/admin/tenants');
    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
  });

  // ── Logout ────────────────────────────────────────────────────────────────

  test('logout clears session and redirects to login', async ({ page }) => {
    await loginViaAPI(page, USERS.superAdmin);
    await expect(page).toHaveURL('/');

    // Click logout button (pi-sign-out icon or text)
    const logoutIcon = page.locator('.pi-sign-out').first();
    const logoutBtn = page.locator('button').filter({ hasText: /salir|logout|cerrar/i }).first();

    if (await logoutIcon.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutIcon.click();
    } else if (await logoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutBtn.click();
    } else {
      await logout(page);
    }

    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
    const token = await page.evaluate(() => localStorage.getItem('gj_token'));
    expect(token).toBeNull();
  });

  // ── Diferentes tipos de usuario ───────────────────────────────────────────

  test('client_admin can login successfully', async ({ page }) => {
    await loginViaAPI(page, USERS.clientAdmin);
    await expect(page).toHaveURL('/');

    const userStr = await page.evaluate(() => localStorage.getItem('gj_user'));
    const user = JSON.parse(userStr!);
    expect(user.userType).toBe('client_admin');
  });

  test('client_admin (stoller) can login successfully', async ({ page }) => {
    await loginViaAPI(page, USERS.clientUser);
    await expect(page).toHaveURL('/');

    const userStr = await page.evaluate(() => localStorage.getItem('gj_user'));
    const user = JSON.parse(userStr!);
    expect(user.userType).toBe('client_admin');
  });
});
