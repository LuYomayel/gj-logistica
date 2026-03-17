import { test, expect } from '@playwright/test';
import { USERS, loginViaAPI } from './helpers/auth';

test.describe('Warehouses, Inventories & Stock', () => {

  // ── Warehouses ────────────────────────────────────────────────────────────

  test.describe('WarehousesTable', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/warehouses');
      await page.waitForLoadState('networkidle');
    });

    test('renders page heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Almacenes' })).toBeVisible();
    });

    test('shows warehouse count', async ({ page }) => {
      await expect(page.getByText(/\d+ almacén/i)).toBeVisible();
    });

    test('shows table columns', async ({ page }) => {
      const headers = ['Nombre', 'Nombre corto', 'Ubicación', 'Estado'];
      for (const h of headers) {
        await expect(page.locator('th').filter({ hasText: h }).first()).toBeVisible();
      }
    });

    test('shows Nuevo Almacén button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Nuevo Almacén' })).toBeVisible();
    });

    test('row click navigates to detail', async ({ page }) => {
      const row = page.locator('table tbody tr').first();
      await row.waitFor({ state: 'visible', timeout: 10_000 });
      await row.click();
      await expect(page).toHaveURL(/\/warehouses\/\d+/);
    });
  });

  test.describe('WarehouseDetail', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/warehouses');
      await page.waitForLoadState('networkidle');
      const row = page.locator('table tbody tr').first();
      await row.waitFor({ state: 'visible', timeout: 10_000 });
      await row.click();
      await expect(page).toHaveURL(/\/warehouses\/\d+/);
    });

    test('shows warehouse name in heading', async ({ page }) => {
      await expect(page.locator('h1').first()).toBeVisible();
    });

    test('shows back button', async ({ page }) => {
      await page.locator('button .pi-arrow-left').first().click();
      await expect(page).toHaveURL('/warehouses');
    });

    test('shows info section', async ({ page }) => {
      await expect(page.getByText('Información del almacén')).toBeVisible();
    });

    test('shows stock statistics', async ({ page }) => {
      await expect(page.getByText('Estadísticas de stock')).toBeVisible();
    });

    test('shows Stock tab', async ({ page }) => {
      await expect(page.getByRole('tab', { name: /Stock/ })).toBeVisible();
    });

    test('shows Movimientos tab', async ({ page }) => {
      const tab = page.getByRole('tab', { name: 'Movimientos' });
      await expect(tab).toBeVisible();
      await tab.click();
      await page.waitForLoadState('networkidle');
    });

    test('shows Corrección Stock button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Corrección Stock' })).toBeVisible();
    });
  });

  // ── Inventories ───────────────────────────────────────────────────────────

  test.describe('InventoriesTable', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/inventories');
      await page.waitForLoadState('networkidle');
    });

    test('renders page heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Inventarios' })).toBeVisible();
    });

    test('shows inventory count', async ({ page }) => {
      await expect(page.getByText(/inventarios en total/)).toBeVisible();
    });

    test('shows table columns', async ({ page }) => {
      const headers = ['Referencia', 'Etiqueta', 'Almacén', 'Estado'];
      for (const h of headers) {
        await expect(page.locator('th').filter({ hasText: h }).first()).toBeVisible();
      }
    });

    test('shows Nuevo inventario button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Nuevo inventario' })).toBeVisible();
    });

    test('opens create dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo inventario' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.p-dialog-title').filter({ hasText: 'Nuevo inventario' })).toBeVisible();
    });

    test('create dialog has ref field and submit button', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo inventario' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByPlaceholder('INV2026-001')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Crear' })).toBeVisible();
    });
  });

  test.describe('InventoryDetail', () => {
    test('inventory detail page is accessible', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/inventories');
      await page.waitForLoadState('networkidle');

      // Wait for table to render and check for data rows (not empty message)
      await page.waitForTimeout(1000);
      const emptyMsg = page.getByText('No hay inventarios');
      if (await emptyMsg.isVisible().catch(() => false)) {
        test.skip();
        return;
      }

      const row = page.locator('table tbody tr').first();
      const hasRows = await row.isVisible({ timeout: 3_000 }).catch(() => false);
      if (!hasRows) {
        test.skip();
        return;
      }

      await row.click();
      await expect(page).toHaveURL(/\/inventories\/\d+/, { timeout: 5_000 });

      // Should show inventory ref heading
      await expect(page.locator('h1').first()).toBeVisible();
      // Should show lines section
      await expect(page.getByText(/Líneas del inventario/)).toBeVisible();
    });
  });

  // ── Stock at Date ─────────────────────────────────────────────────────────

  test.describe('StockAtDate', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/stock/at-date');
      await page.waitForLoadState('networkidle');
    });

    test('renders page heading', async ({ page }) => {
      await expect(page.getByText('Stock histórico a fecha')).toBeVisible();
    });

    test('shows subtitle', async ({ page }) => {
      await expect(page.getByText(/Consulta el stock/)).toBeVisible();
    });

    test('shows date filter and consult button', async ({ page }) => {
      await expect(page.getByText('Fecha de consulta')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Consultar' })).toBeVisible();
    });

    test('shows empty state before query', async ({ page }) => {
      await expect(page.getByText(/Seleccioná una fecha/)).toBeVisible();
    });
  });

  // ── Permissions ───────────────────────────────────────────────────────────

  test.describe('Permissions', () => {
    test('client_admin can access warehouses', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/warehouses');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Almacenes' })).toBeVisible();
    });

    test('client_admin can access inventories', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/inventories');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Inventarios' })).toBeVisible();
    });

    test('client_admin can access stock at date', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/stock/at-date');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Stock histórico a fecha')).toBeVisible();
    });
  });
});
