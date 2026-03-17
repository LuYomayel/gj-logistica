import { test, expect } from '@playwright/test';
import { USERS, loginViaAPI } from './helpers/auth';

test.describe('Users Module', () => {

  test.describe('UsersTable — super_admin', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/users');
      await page.waitForLoadState('networkidle');
    });

    test('renders page heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Usuarios y Grupos' })).toBeVisible();
    });

    test('shows user count', async ({ page }) => {
      await expect(page.getByText(/usuarios en total/)).toBeVisible();
    });

    test('shows table columns', async ({ page }) => {
      const headers = ['Apellido', 'Nombre', 'Usuario', 'Email', 'Admin', 'Estado', 'Tipo'];
      for (const h of headers) {
        await expect(page.locator('th').filter({ hasText: h }).first()).toBeVisible();
      }
    });

    test('shows Nuevo Usuario button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Nuevo Usuario' })).toBeVisible();
    });

    test('table shows user data', async ({ page }) => {
      // At least one row should exist
      const firstRow = page.locator('table tbody tr').first();
      await expect(firstRow).toBeVisible();
    });

    test('shows status badges (Activo/Inactivo)', async ({ page }) => {
      // At least one active user should exist
      await expect(page.getByText('Activo').first()).toBeVisible();
    });

    test('shows user type badges', async ({ page }) => {
      // Should show at least one user type
      const types = ['Super Admin', 'Admin', 'Usuario'];
      const anyVisible = await Promise.any(
        types.map(t => page.getByText(t, { exact: true }).first().isVisible().then(v => v ? true : Promise.reject()))
      ).catch(() => false);
      expect(anyVisible).toBe(true);
    });
  });

  test.describe('CreateUserDialog', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/users');
      await page.waitForLoadState('networkidle');
    });

    test('opens create dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Usuario' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('dialog closes on cancel', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Usuario' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Cancelar' }).last().click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('Permissions', () => {
    test('client_admin can access users page', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/users');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Usuarios y Grupos' })).toBeVisible();
    });
  });
});
