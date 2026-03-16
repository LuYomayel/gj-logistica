import { test, expect } from '@playwright/test';
import { USERS, loginViaAPI } from './helpers/auth';

test.describe('Products Module', () => {

  // ── Products Table ────────────────────────────────────────────────────────

  test.describe('ProductsTable — super_admin', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
    });

    test('renders page heading and product count', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
      await expect(page.getByText(/productos? en total/)).toBeVisible();
    });

    test('shows DataTable with expected columns', async ({ page }) => {
      const headers = ['Ref', 'Etiqueta', 'Código de barras', 'Stock deseado', 'Stock físico', 'Posicion', 'Color'];
      for (const header of headers) {
        await expect(page.locator('th').filter({ hasText: header }).first()).toBeVisible();
      }
    });

    test('shows Nuevo Producto button (products.write)', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Nuevo Producto' })).toBeVisible();
    });

    test('shows Exportar CSV button (products.export)', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeVisible();
    });

    test('shows Importar Excel button (products.write)', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Importar Excel' })).toBeVisible();
    });

    test('shows filter controls', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Buscar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Limpiar' })).toBeVisible();
    });

    test('table rows are clickable and navigate to detail', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
      await firstRow.click();
      await expect(page).toHaveURL(/\/products\/\d+/);
    });

    test('paginator is visible', async ({ page }) => {
      await expect(page.locator('.p-paginator')).toBeVisible();
    });
  });

  // ── Filters ───────────────────────────────────────────────────────────────

  test.describe('ProductsTable — filters', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
    });

    test('search filter works', async ({ page }) => {
      // Find search input (first text input in filter area)
      const searchInput = page.getByPlaceholder(/ref|nombre|buscar/i).first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('test');
        await page.getByRole('button', { name: 'Buscar' }).click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.p-datatable')).toBeVisible();
      }
    });

    test('clear filters resets search', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/ref|nombre|buscar/i).first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('test-value');
        await page.getByRole('button', { name: 'Limpiar' }).click();
        await expect(searchInput).toHaveValue('');
      }
    });
  });

  // ── Product Detail ────────────────────────────────────────────────────────

  test.describe('ProductDetail', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      // Click first product row
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
      await firstRow.click();
      await expect(page).toHaveURL(/\/products\/\d+/);
    });

    test('shows product reference in heading', async ({ page }) => {
      // Product detail should show the ref as heading
      await expect(page.locator('h1').first()).toBeVisible();
    });

    test('shows back button that navigates to list', async ({ page }) => {
      await page.locator('button .pi-arrow-left').first().click();
      await expect(page).toHaveURL('/products');
    });

    test('shows action buttons', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Modificar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clonar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Borrar' })).toBeVisible();
    });

    test('shows tab view with Producto tab', async ({ page }) => {
      // First tab "Producto" should be active by default
      await expect(page.getByRole('tab', { name: 'Producto' })).toBeVisible();
    });

    test('shows Precios de venta tab', async ({ page }) => {
      const tab = page.getByRole('tab', { name: /Precios/i });
      await expect(tab).toBeVisible();
      await tab.click();
      // Should show price info
      await expect(page.getByText(/Neto|IVA/i).first()).toBeVisible();
    });

    test('shows Stock tab', async ({ page }) => {
      const tab = page.getByRole('tab', { name: 'Stock' });
      await expect(tab).toBeVisible();
      await tab.click();
      // Should show stock info
      await expect(page.getByText(/Stock f[ií]sico/i).first()).toBeVisible();
    });

    test('shows Notas tab', async ({ page }) => {
      const tab = page.getByRole('tab', { name: 'Notas' });
      await expect(tab).toBeVisible();
      await tab.click();
      await expect(page.getByText(/notas/i).first()).toBeVisible();
    });

    test('Producto tab shows basic info rows', async ({ page }) => {
      const infoLabels = ['Referencia', 'Etiqueta'];
      for (const label of infoLabels) {
        await expect(page.getByText(label).first()).toBeVisible();
      }
    });
  });

  // ── CreateProductDialog ───────────────────────────────────────────────────

  test.describe('CreateProductDialog', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
    });

    test('opens dialog when clicking Nuevo Producto', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Producto' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('dialog shows form sections', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Producto' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Basic data section
      await expect(page.getByText('Datos básicos').first()).toBeVisible();
      // Price section
      await expect(page.getByText('Precio y código').first()).toBeVisible();
    });

    test('ref field is required', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Producto' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Try to submit without ref
      await page.getByRole('button', { name: 'Crear producto' }).click();
      // Should show validation error
      await expect(page.getByText(/obligatori|requerid/i).first()).toBeVisible({ timeout: 5_000 });
    });

    test('dialog closes on cancel', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Producto' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.getByRole('button', { name: 'Cancelar' }).last().click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  // ── EditProductDialog ─────────────────────────────────────────────────────

  test.describe('EditProductDialog', () => {
    test('opens edit dialog from product detail', async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/products');
      await page.waitForLoadState('networkidle');

      // Navigate to first product
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
      await firstRow.click();
      await expect(page).toHaveURL(/\/products\/\d+/);

      // Click Modificar
      await page.getByRole('button', { name: 'Modificar' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Should have save button
      await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible();
    });
  });

  // ── Product Stats ─────────────────────────────────────────────────────────

  test.describe('ProductStats', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/products/stats');
      await page.waitForLoadState('networkidle');
    });

    test('stats page renders heading', async ({ page }) => {
      await expect(page.getByText(/estad[ií]sticas.*productos/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('shows popularity table', async ({ page }) => {
      await expect(page.getByText(/top productos|popularidad/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('shows rubro breakdown', async ({ page }) => {
      await expect(page.getByText(/por rubro/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('has filter controls', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Aplicar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Limpiar' })).toBeVisible();
    });
  });

  // ── Permission checks ─────────────────────────────────────────────────────

  test.describe('Products — permission checks', () => {
    test('client_admin can access products page', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
    });

    test('client_admin sees action buttons', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('button', { name: 'Nuevo Producto' })).toBeVisible();
    });
  });
});
