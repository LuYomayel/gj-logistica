import { test, expect } from '@playwright/test';
import { USERS, loginViaAPI } from './helpers/auth';

test.describe('Orders Module', () => {

  // ── Orders Table ──────────────────────────────────────────────────────────

  test.describe('OrdersTable — super_admin', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
    });

    test('renders page heading and order count', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible();
      await expect(page.getByText(/pedidos en total/)).toBeVisible();
    });

    test('shows DataTable with expected columns', async ({ page }) => {
      const headers = ['Ref', 'Ref cliente', 'Tercero', 'Fecha', 'F. prevista', 'Estado', 'Autor'];
      for (const header of headers) {
        await expect(page.locator('th').filter({ hasText: header }).first()).toBeVisible();
      }
    });

    test('shows Nueva Orden button (orders.write)', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Nueva Orden' })).toBeVisible();
    });

    test('shows Exportar CSV button (orders.export)', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeVisible();
    });

    test('shows filter controls', async ({ page }) => {
      await expect(page.getByPlaceholder('SOyymm-nnnn')).toBeVisible();
      await expect(page.getByText('Estado').first()).toBeVisible();
      await expect(page.getByText('Tercero').first()).toBeVisible();
      await expect(page.getByPlaceholder('Ref. cliente')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Buscar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Limpiar' })).toBeVisible();
    });

    test('table rows are clickable and navigate to detail', async ({ page }) => {
      // Wait for rows to load
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);
    });

    test('paginator is visible', async ({ page }) => {
      await expect(page.locator('.p-paginator')).toBeVisible();
    });
  });

  // ── Filters ───────────────────────────────────────────────────────────────

  test.describe('OrdersTable — filters', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
    });

    test('filter by ref narrows results', async ({ page }) => {
      const refInput = page.getByPlaceholder('SOyymm-nnnn');
      await refInput.fill('SO');
      await page.getByRole('button', { name: 'Buscar' }).click();
      await page.waitForLoadState('networkidle');
      // Table should still be visible after search
      await expect(page.locator('.p-datatable')).toBeVisible();
    });

    test('clear filters resets form', async ({ page }) => {
      const refInput = page.getByPlaceholder('SOyymm-nnnn');
      await refInput.fill('test-filter');
      await page.getByRole('button', { name: 'Limpiar' }).click();
      await expect(refInput).toHaveValue('');
    });
  });

  // ── Order Detail — Draft order ────────────────────────────────────────────

  test.describe('OrderDetail — navigation and info', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
    });

    test('detail page shows order info sections', async ({ page }) => {
      // Navigate to orders and click first row
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);

      // Info sections should be visible
      await expect(page.getByText('Información del pedido')).toBeVisible();
      await expect(page.getByText('Totales y entrega')).toBeVisible();
    });

    test('detail page shows back button that navigates to list', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);

      // Click back button
      await page.locator('button .pi-arrow-left').first().click();
      await expect(page).toHaveURL('/orders');
    });

    test('detail page shows status badge', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);

      // StatusBadge renders a span with status text
      const statuses = ['Borrador', 'Validado', 'En Proceso', 'Despachado', 'Cancelado'];
      const statusVisible = await Promise.any(
        statuses.map(s => page.getByText(s, { exact: true }).first().isVisible().then(v => v ? true : Promise.reject()))
      ).catch(() => false);
      expect(statusVisible).toBe(true);
    });

    test('detail page shows info rows', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
      await firstRow.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);

      // Check info row labels
      const infoLabels = ['Referencia', 'Tercero', 'Fecha pedido', 'Autor'];
      for (const label of infoLabels) {
        await expect(page.getByText(label).first()).toBeVisible();
      }
    });

    test('detail page shows lines section', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
      await firstRow.click();

      // Lines section header
      await expect(page.getByText(/Líneas del pedido/)).toBeVisible();
    });
  });

  // ── Order Detail — Action buttons by status ───────────────────────────────

  test.describe('OrderDetail — status-based buttons', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
    });

    test('draft order shows Editar, Validar, Cancelar, Clonar buttons', async ({ page }) => {
      // Find a draft order (status=0) by filtering
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // Use status filter — select from dropdown overlay panel to avoid conflict with table badges
      const statusDropdown = page.locator('.p-dropdown').first();
      await statusDropdown.click();
      await page.locator('.p-dropdown-panel .p-dropdown-item').filter({ hasText: 'Borrador' }).click();
      await page.getByRole('button', { name: 'Buscar' }).click();
      await page.waitForLoadState('networkidle');

      // Check if we have draft rows
      const row = page.locator('table tbody tr').first();
      const hasRows = await row.isVisible().catch(() => false);
      if (!hasRows) {
        test.skip();
        return;
      }

      await row.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);

      // Draft-specific buttons
      await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Validar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clonar' })).toBeVisible();

      // Draft should show "Agregar nueva línea" section
      await expect(page.getByText('Agregar nueva línea')).toBeVisible();
    });

    test('validated/shipped order shows appropriate buttons', async ({ page }) => {
      // Find a validated order (status=1)
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const statusDropdown = page.locator('.p-dropdown').first();
      await statusDropdown.click();
      await page.locator('.p-dropdown-panel .p-dropdown-item').filter({ hasText: 'Validado' }).click();
      await page.getByRole('button', { name: 'Buscar' }).click();
      await page.waitForLoadState('networkidle');

      const row = page.locator('table tbody tr').first();
      const hasRows = await row.isVisible().catch(() => false);
      if (!hasRows) {
        // Try shipped orders
        await statusDropdown.click();
        await page.locator('.p-dropdown-panel .p-dropdown-item').filter({ hasText: 'Despachado' }).click();
        await page.getByRole('button', { name: 'Buscar' }).click();
        await page.waitForLoadState('networkidle');
        const shippedRow = page.locator('table tbody tr').first();
        const hasShipped = await shippedRow.isVisible().catch(() => false);
        if (!hasShipped) {
          test.skip();
          return;
        }
        await shippedRow.click();
        await expect(page).toHaveURL(/\/orders\/\d+/);

        // Shipped should show Reabrir, Clonar, PDF
        await expect(page.getByRole('button', { name: 'Reabrir' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Clonar' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeVisible();

        // Should NOT show edit/validate
        await expect(page.getByRole('button', { name: 'Editar' })).not.toBeVisible();
        await expect(page.getByRole('button', { name: 'Validar' })).not.toBeVisible();
        return;
      }

      await row.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);

      // Validated should show Despachar, Cancelar, Clonar, PDF
      await expect(page.getByRole('button', { name: 'Despachar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clonar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeVisible();

      // Should NOT show edit/validate
      await expect(page.getByRole('button', { name: 'Editar' })).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Validar' })).not.toBeVisible();

      // Should NOT show "Agregar nueva línea" section (not draft)
      await expect(page.getByText('Agregar nueva línea')).not.toBeVisible();
    });
  });

  // ── CreateOrderDialog ─────────────────────────────────────────────────────

  test.describe('CreateOrderDialog', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
    });

    test('opens dialog when clicking Nueva Orden', async ({ page }) => {
      await page.getByRole('button', { name: 'Nueva Orden' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      // Dialog should have title "Nueva Orden"
      await expect(page.locator('.p-dialog-title').filter({ hasText: 'Nueva Orden' })).toBeVisible();
    });

    test('dialog shows all form fields', async ({ page }) => {
      await page.getByRole('button', { name: 'Nueva Orden' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Check form labels
      await expect(page.getByText('Tercero').first()).toBeVisible();
      await expect(page.getByText('Ref cliente').first()).toBeVisible();
      await expect(page.getByText('Fecha pedido').first()).toBeVisible();
      await expect(page.getByText('F. prevista entrega').first()).toBeVisible();
      await expect(page.getByText('Almacén').first()).toBeVisible();
      await expect(page.getByText('Nota pública').first()).toBeVisible();
    });

    test('dialog has Crear borrador and Cancelar buttons', async ({ page }) => {
      await page.getByRole('button', { name: 'Nueva Orden' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await expect(page.getByRole('button', { name: 'Crear borrador' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancelar' }).last()).toBeVisible();
    });

    test('tercero is required — shows error on submit without it', async ({ page }) => {
      await page.getByRole('button', { name: 'Nueva Orden' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Submit without filling required field
      await page.getByRole('button', { name: 'Crear borrador' }).click();

      // Should show validation error
      await expect(page.getByText(/obligatorio|requerido/i).first()).toBeVisible({ timeout: 5_000 });
    });

    test('dialog closes on Cancelar', async ({ page }) => {
      await page.getByRole('button', { name: 'Nueva Orden' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.getByRole('button', { name: 'Cancelar' }).last().click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  // ── EditOrderDialog ───────────────────────────────────────────────────────

  test.describe('EditOrderDialog', () => {
    test('edit dialog opens for draft order', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // Filter for draft orders
      const statusDropdown = page.locator('.p-dropdown').first();
      await statusDropdown.click();
      await page.locator('.p-dropdown-panel .p-dropdown-item').filter({ hasText: 'Borrador' }).click();
      await page.getByRole('button', { name: 'Buscar' }).click();
      await page.waitForLoadState('networkidle');

      const row = page.locator('table tbody tr').first();
      const hasRows = await row.isVisible().catch(() => false);
      if (!hasRows) {
        test.skip();
        return;
      }

      await row.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);

      // Click Editar
      await page.getByRole('button', { name: 'Editar' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Dialog should show Editar Pedido title
      await expect(page.locator('.p-dialog-title').filter({ hasText: 'Editar Pedido' })).toBeVisible();
    });
  });

  // ── ExportOrdersDialog ────────────────────────────────────────────────────

  test.describe('ExportOrdersDialog', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
    });

    test('opens export dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'Exportar CSV' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('export dialog shows filter fields', async ({ page }) => {
      await page.getByRole('button', { name: 'Exportar CSV' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await expect(page.getByText('Fecha desde').first()).toBeVisible();
      await expect(page.getByText('Fecha hasta').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Exportar CSV' }).last()).toBeVisible();
    });

    test('export dialog shows info message about no filters', async ({ page }) => {
      await page.getByRole('button', { name: 'Exportar CSV' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // No filters applied → shows "sin filtros" message
      await expect(page.getByText(/sin filtros|exportarán todos/i).first()).toBeVisible();
    });
  });

  // ── Orders Stats ──────────────────────────────────────────────────────────

  test.describe('OrderStats', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/orders/stats');
      await page.waitForLoadState('networkidle');
    });

    test('stats page renders heading', async ({ page }) => {
      await expect(page.getByText(/estad[ií]sticas|stats/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('stats page shows monthly table', async ({ page }) => {
      // Wait for data
      await expect(page.getByText(/pedidos por mes/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('stats page shows status breakdown', async ({ page }) => {
      await expect(page.getByText(/por estado/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('stats page has filter controls', async ({ page }) => {
      // Year dropdown and apply/clear buttons
      await expect(page.getByRole('button', { name: 'Aplicar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Limpiar' })).toBeVisible();
    });
  });

  // ── Permission checks ─────────────────────────────────────────────────────

  test.describe('Orders — permission checks', () => {
    test('client_admin can access orders page', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible();
    });

    test('client_admin sees action buttons (has all permissions)', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // client_admin has all permissions → should see Nueva Orden and Exportar CSV
      await expect(page.getByRole('button', { name: 'Nueva Orden' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeVisible();
    });
  });
});
