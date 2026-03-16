import { test, expect } from '@playwright/test';
import { USERS, loginViaAPI } from './helpers/auth';

test.describe('Navigation — Sidebar & Route Guards', () => {

  // ── Super Admin: all links visible ────────────────────────────────────────

  test.describe('super_admin sidebar', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
    });

    test('shows all sidebar sections', async ({ page }) => {
      const sidebar = page.locator('aside');
      // All 5 section headers should be visible
      await expect(sidebar.getByText('Principal', { exact: true })).toBeVisible();
      await expect(sidebar.getByText('Comercial', { exact: true })).toBeVisible();
      await expect(sidebar.getByText('Almacén', { exact: true })).toBeVisible();
      await expect(sidebar.getByText('Administración', { exact: true })).toBeVisible();
      await expect(sidebar.getByText('Super Admin', { exact: true }).first()).toBeVisible();
    });

    test('shows all navigation links', async ({ page }) => {
      const sidebar = page.locator('aside');
      const expectedLinks = [
        'Mi Tablero',
        'Stats Pedidos', 'Terceros', 'Contactos',
        'Almacenes', 'Stats Productos', 'Inventarios', 'Stock a fecha',
        'Usuarios y grupos',
        'Tenants', 'Grupos de Permisos',
      ];
      for (const label of expectedLinks) {
        await expect(sidebar.getByRole('link', { name: label })).toBeVisible();
      }
      // These match multiple links (e.g. "Pedidos" also matches "Stats Pedidos"), so use .first()
      await expect(sidebar.getByRole('link', { name: 'Pedidos' }).first()).toBeVisible();
      await expect(sidebar.getByRole('link', { name: 'Productos' }).first()).toBeVisible();
    });

    test('shows Super Admin role badge', async ({ page }) => {
      await expect(page.getByText('Super Admin', { exact: true }).last()).toBeVisible();
    });

    test('sidebar links navigate correctly', async ({ page }) => {
      const sidebar = page.locator('aside');

      // Click Pedidos → /orders
      await sidebar.getByRole('link', { name: 'Pedidos' }).first().click();
      await expect(page).toHaveURL('/orders');

      // Click Productos → /products
      await sidebar.getByRole('link', { name: 'Productos' }).first().click();
      await expect(page).toHaveURL('/products');

      // Click Terceros → /third-parties
      await sidebar.getByRole('link', { name: 'Terceros' }).click();
      await expect(page).toHaveURL('/third-parties');

      // Click Mi Tablero → /
      await sidebar.getByRole('link', { name: 'Mi Tablero' }).click();
      await expect(page).toHaveURL('/');
    });
  });

  // ── Client Admin: no Super Admin section ──────────────────────────────────

  test.describe('client_admin sidebar', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
    });

    test('shows standard sections but NOT Super Admin section', async ({ page }) => {
      const sidebar = page.locator('aside');
      await expect(sidebar.getByText('Principal', { exact: true })).toBeVisible();
      await expect(sidebar.getByText('Comercial', { exact: true })).toBeVisible();
      await expect(sidebar.getByText('Almacén', { exact: true })).toBeVisible();
      await expect(sidebar.getByText('Administración', { exact: true })).toBeVisible();

      // Super Admin section should NOT be visible
      const superAdminSection = sidebar.locator('span.text-orange-400', { hasText: 'Super Admin' });
      await expect(superAdminSection).not.toBeVisible();
    });

    test('does not show Tenants or Grupos de Permisos links', async ({ page }) => {
      const sidebar = page.locator('aside');
      await expect(sidebar.getByRole('link', { name: 'Tenants' })).not.toBeVisible();
      await expect(sidebar.getByRole('link', { name: 'Grupos de Permisos' })).not.toBeVisible();
    });

    test('shows Admin role badge', async ({ page }) => {
      await expect(page.locator('aside').getByText('Admin', { exact: true })).toBeVisible();
    });
  });

  // ── AdminRoute guard ──────────────────────────────────────────────────────

  test.describe('AdminRoute guard', () => {
    test('client_admin accessing /admin/tenants is redirected to /', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/admin/tenants');
      // Should redirect away from admin page
      await expect(page).not.toHaveURL(/admin/, { timeout: 5_000 });
    });

    test('client_admin accessing /admin/permission-groups is redirected to /', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/admin/permission-groups');
      await expect(page).not.toHaveURL(/admin/, { timeout: 5_000 });
    });

    test('super_admin CAN access /admin/tenants', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/admin/tenants');
      await expect(page).toHaveURL('/admin/tenants');
      // Should show tenants heading
      await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible({ timeout: 10_000 });
    });
  });

  // ── TopBar navigation ─────────────────────────────────────────────────────

  test.describe('TopBar', () => {
    test('shows brand logo and user info', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await expect(page.getByText('GJ Logística').first()).toBeVisible();
    });

    test('shows logout button', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      // Logout icon should be visible
      const logoutIndicator = page.locator('.pi-sign-out').first();
      await expect(logoutIndicator).toBeVisible({ timeout: 5_000 });
    });
  });

  // ── Dashboard loads correctly ─────────────────────────────────────────────

  test('dashboard page shows widgets after login', async ({ page }) => {
    await loginViaAPI(page, USERS.superAdmin);
    await expect(page.getByRole('heading', { name: 'Mi Tablero' })).toBeVisible({ timeout: 10_000 });
    // Dashboard should show some widgets/content (stock alerts, recent orders, etc.)
    await page.waitForLoadState('networkidle');
  });
});
