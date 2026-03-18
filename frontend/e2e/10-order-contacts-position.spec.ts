import { test, expect } from '@playwright/test';
import { USERS, loginViaAPI } from './helpers/auth';

test.describe('Order Detail — Position column & Contact features', () => {

  // ── Position column in order lines ──────────────────────────────────────

  test.describe('Position column in order lines', () => {
    test('super_admin sees Posición column in order lines', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // Navigate to first order
      const firstRow = page.locator('table tbody tr').first();
      const hasRows = await firstRow.isVisible().catch(() => false);
      if (!hasRows) { test.skip(); return; }
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);
      await page.waitForLoadState('networkidle');

      // Check for Posición column header in lines table
      const linesSection = page.locator('.p-datatable').first();
      await expect(linesSection.locator('th').filter({ hasText: 'Posición' })).toBeVisible();
    });

    test('client_admin does NOT see Posición column in order lines', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const firstRow = page.locator('table tbody tr').first();
      const hasRows = await firstRow.isVisible().catch(() => false);
      if (!hasRows) { test.skip(); return; }
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);
      await page.waitForLoadState('networkidle');

      const linesSection = page.locator('.p-datatable').first();
      await expect(linesSection.locator('th').filter({ hasText: 'Posición' })).not.toBeVisible();
    });
  });

  // ── Product info dialog from order lines ────────────────────────────────

  test.describe('Product info dialog in order lines', () => {
    test('clicking product ref opens product info dialog', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // Find an order with lines
      const firstRow = page.locator('table tbody tr').first();
      const hasRows = await firstRow.isVisible().catch(() => false);
      if (!hasRows) { test.skip(); return; }
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);
      await page.waitForLoadState('networkidle');

      // Find a clickable product ref in the lines table
      const productLink = page.locator('.p-datatable button.text-blue-600').first();
      const hasProductLink = await productLink.isVisible().catch(() => false);
      if (!hasProductLink) { test.skip(); return; }

      await productLink.click();
      // Should open a dialog with product info
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText('Ficha del Producto')).toBeVisible();
      // Should show product info fields
      await expect(page.getByText('Referencia').first()).toBeVisible();
      await expect(page.getByText('Etiqueta').first()).toBeVisible();
    });
  });

  // ── Order contacts panel ────────────────────────────────────────────────

  test.describe('Order contacts panel', () => {
    test('order detail shows contacts section', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const firstRow = page.locator('table tbody tr').first();
      const hasRows = await firstRow.isVisible().catch(() => false);
      if (!hasRows) { test.skip(); return; }
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);
      await page.waitForLoadState('networkidle');

      // Should show contact section heading
      await expect(page.getByText('Contacto del pedido')).toBeVisible();
    });

    test('draft order shows contact assignment controls', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // Filter for draft orders (status = 0)
      const statusDropdown = page.locator('.p-dropdown').first();
      await statusDropdown.click();
      await page.locator('.p-dropdown-panel .p-dropdown-item')
        .filter({ hasText: 'Borrador' }).click();
      await page.getByRole('button', { name: 'Buscar' }).click();
      await page.waitForLoadState('networkidle');

      const firstRow = page.locator('table tbody tr').first();
      const hasRows = await firstRow.isVisible().catch(() => false);
      if (!hasRows) { test.skip(); return; }
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);
      await page.waitForLoadState('networkidle');

      // Should show "Agregar contacto" input
      await expect(page.getByText('Agregar contacto')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Asignar' })).toBeVisible();
    });

    test('validated order does NOT show contact assignment controls', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // Filter for validated orders (status = 1)
      const statusDropdown = page.locator('.p-dropdown').first();
      await statusDropdown.click();
      await page.locator('.p-dropdown-panel .p-dropdown-item')
        .filter({ hasText: 'Validado' }).click();
      await page.getByRole('button', { name: 'Buscar' }).click();
      await page.waitForLoadState('networkidle');

      const firstRow = page.locator('table tbody tr').first();
      const hasRows = await firstRow.isVisible().catch(() => false);
      if (!hasRows) { test.skip(); return; }
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);
      await page.waitForLoadState('networkidle');

      // Should NOT show assignment controls (order is not draft)
      await expect(page.getByText('Agregar contacto')).not.toBeVisible();
    });
  });

  // ── Print contact card button (superAdmin only) ─────────────────────────

  test.describe('Print contact card button', () => {
    test('super_admin sees "Imprimir contacto" button on validated order with contact', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // Filter for validated/dispatched orders
      const statusDropdown = page.locator('.p-dropdown').first();
      await statusDropdown.click();
      await page.locator('.p-dropdown-panel .p-dropdown-item')
        .filter({ hasText: 'Validado' }).click();
      await page.getByRole('button', { name: 'Buscar' }).click();
      await page.waitForLoadState('networkidle');

      const firstRow = page.locator('table tbody tr').first();
      const hasRows = await firstRow.isVisible().catch(() => false);
      if (!hasRows) { test.skip(); return; }
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);
      await page.waitForLoadState('networkidle');

      // The button only appears if order has contacts assigned
      // Check if there are contacts; if so, button should be visible
      const hasContact = await page.locator('text=Contacto del pedido')
        .locator('..').locator('.text-sm.font-medium.text-gray-800')
        .first().isVisible().catch(() => false);

      if (hasContact) {
        await expect(page.getByRole('button', { name: 'Imprimir contacto' })).toBeVisible();
      } else {
        // No contact assigned — button should NOT appear
        await expect(page.getByRole('button', { name: 'Imprimir contacto' })).not.toBeVisible();
      }
    });

    test('client_admin does NOT see "Imprimir contacto" button (not superAdmin)', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // Filter for validated orders
      const statusDropdown = page.locator('.p-dropdown').first();
      await statusDropdown.click();
      await page.locator('.p-dropdown-panel .p-dropdown-item')
        .filter({ hasText: 'Validado' }).click();
      await page.getByRole('button', { name: 'Buscar' }).click();
      await page.waitForLoadState('networkidle');

      const firstRow = page.locator('table tbody tr').first();
      const hasRows = await firstRow.isVisible().catch(() => false);
      if (!hasRows) { test.skip(); return; }
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);
      await page.waitForLoadState('networkidle');

      // client_admin should NEVER see the print contact button
      await expect(page.getByRole('button', { name: 'Imprimir contacto' })).not.toBeVisible();
    });

    test('draft order does NOT show "Imprimir contacto" button (status < 1)', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const statusDropdown = page.locator('.p-dropdown').first();
      await statusDropdown.click();
      await page.locator('.p-dropdown-panel .p-dropdown-item')
        .filter({ hasText: 'Borrador' }).click();
      await page.getByRole('button', { name: 'Buscar' }).click();
      await page.waitForLoadState('networkidle');

      const firstRow = page.locator('table tbody tr').first();
      const hasRows = await firstRow.isVisible().catch(() => false);
      if (!hasRows) { test.skip(); return; }
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);
      await page.waitForLoadState('networkidle');

      // Draft orders should NOT show the print button regardless of contacts
      await expect(page.getByRole('button', { name: 'Imprimir contacto' })).not.toBeVisible();
    });
  });

  // ── Hidden fields verification ──────────────────────────────────────────

  test.describe('Order detail — hidden price/tracking fields', () => {
    test('order detail does NOT show price columns', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const firstRow = page.locator('table tbody tr').first();
      const hasRows = await firstRow.isVisible().catch(() => false);
      if (!hasRows) { test.skip(); return; }
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);
      await page.waitForLoadState('networkidle');

      // Should NOT show price-related columns
      const headers = page.locator('.p-datatable th');
      await expect(headers.filter({ hasText: 'P.U. (neto)' })).not.toBeVisible();
      await expect(headers.filter({ hasText: 'Total Neto' })).not.toBeVisible();
      await expect(headers.filter({ hasText: 'Desc.%' })).not.toBeVisible();
    });

    test('order detail does NOT show tracking fields', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const firstRow = page.locator('table tbody tr').first();
      const hasRows = await firstRow.isVisible().catch(() => false);
      if (!hasRows) { test.skip(); return; }
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Nro. seguimiento')).not.toBeVisible();
      await expect(page.getByText('Agencia').first()).not.toBeVisible();
    });

    test('orders table does NOT show price/tracking columns', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const headers = page.locator('th');
      await expect(headers.filter({ hasText: 'Monto (neto)' })).not.toBeVisible();
      await expect(headers.filter({ hasText: 'Nro. seguimiento' })).not.toBeVisible();
      await expect(headers.filter({ hasText: 'Agencia' })).not.toBeVisible();
    });
  });
});
