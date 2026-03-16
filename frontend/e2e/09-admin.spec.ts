import { test, expect } from '@playwright/test';
import { USERS, loginViaAPI } from './helpers/auth';

test.describe('Admin Module (Super Admin Only)', () => {

  // ── Tenants ───────────────────────────────────────────────────────────────

  test.describe('Tenants — super_admin', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/admin/tenants');
      await page.waitForLoadState('networkidle');
    });

    test('renders Tenants heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible();
    });

    test('shows tenant count', async ({ page }) => {
      await expect(page.getByText(/tenants? registrados/)).toBeVisible();
    });

    test('shows Nuevo Tenant button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Nuevo Tenant' })).toBeVisible();
    });

    test('shows table with tenant data', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await expect(firstRow).toBeVisible();
    });

    test('opens create dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Tenant' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  });

  // ── Permission Groups ─────────────────────────────────────────────────────

  test.describe('Permission Groups — super_admin', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/admin/permission-groups');
      await page.waitForLoadState('networkidle');
    });

    test('renders Permission Groups heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Grupos de Permisos/ })).toBeVisible();
    });

    test('shows table with group data', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await expect(firstRow).toBeVisible();
    });
  });

  // ── Access Control ────────────────────────────────────────────────────────

  test.describe('Access Control', () => {
    test('client_admin is redirected from /admin/tenants', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/admin/tenants');
      await expect(page).not.toHaveURL(/admin/, { timeout: 5_000 });
    });

    test('client_admin is redirected from /admin/permission-groups', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/admin/permission-groups');
      await expect(page).not.toHaveURL(/admin/, { timeout: 5_000 });
    });
  });
});
