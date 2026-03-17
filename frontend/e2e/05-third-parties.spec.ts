import { test, expect } from '@playwright/test';
import { USERS, loginViaAPI } from './helpers/auth';

test.describe('Third Parties Module', () => {

  test.describe('ThirdPartiesTable', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/third-parties');
      await page.waitForLoadState('networkidle');
    });

    test('renders page heading and count', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Terceros' })).toBeVisible();
      await expect(page.getByText(/terceros en total/)).toBeVisible();
    });

    test('shows expected table columns', async ({ page }) => {
      const headers = ['Nombre', 'Código Cliente', 'CUIT', 'Email', 'Teléfono', 'Ciudad', 'Estado'];
      for (const h of headers) {
        await expect(page.locator('th').filter({ hasText: h }).first()).toBeVisible();
      }
    });

    test('shows Nuevo Tercero button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Nuevo Tercero' })).toBeVisible();
    });

    test('shows search and filter controls', async ({ page }) => {
      await expect(page.getByPlaceholder('Buscar...')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Buscar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Limpiar' })).toBeVisible();
    });

    test('rows navigate to detail on click', async ({ page }) => {
      const row = page.locator('table tbody tr').first();
      await row.waitFor({ state: 'visible', timeout: 10_000 });
      await row.click();
      await expect(page).toHaveURL(/\/third-parties\/\d+/);
    });

    test('paginator is visible', async ({ page }) => {
      await expect(page.locator('.p-paginator')).toBeVisible();
    });
  });

  test.describe('ThirdPartyDetail', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/third-parties');
      await page.waitForLoadState('networkidle');
      const row = page.locator('table tbody tr').first();
      await row.waitFor({ state: 'visible', timeout: 10_000 });
      await row.click();
      await expect(page).toHaveURL(/\/third-parties\/\d+/);
    });

    test('shows third party name in heading', async ({ page }) => {
      await expect(page.locator('h1').first()).toBeVisible();
    });

    test('shows back button', async ({ page }) => {
      await page.locator('button .pi-arrow-left').first().click();
      await expect(page).toHaveURL('/third-parties');
    });

    test('shows Editar and Desactivar buttons', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Desactivar' })).toBeVisible();
    });

    test('shows Información tab with data sections', async ({ page }) => {
      await expect(page.getByRole('tab', { name: 'Información' })).toBeVisible();
      await expect(page.getByText('Datos principales')).toBeVisible();
      await expect(page.getByText('Dirección').first()).toBeVisible();
    });

    test('shows Contactos tab', async ({ page }) => {
      const tab = page.getByRole('tab', { name: /Contactos/ });
      await expect(tab).toBeVisible();
      await tab.click();
      // Should show contacts content (either table or empty message)
      await page.waitForLoadState('networkidle');
    });

    test('shows info row labels', async ({ page }) => {
      const labels = ['Nombre', 'CUIT', 'Email', 'Teléfono'];
      for (const label of labels) {
        await expect(page.getByText(label).first()).toBeVisible();
      }
    });
  });

  test.describe('ThirdPartyFormDialog', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/third-parties');
      await page.waitForLoadState('networkidle');
    });

    test('opens create dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Tercero' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.p-dialog-title').filter({ hasText: 'Nuevo Tercero' })).toBeVisible();
    });

    test('dialog shows form sections', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Tercero' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Datos principales').first()).toBeVisible();
      await expect(page.getByText('Contacto').first()).toBeVisible();
    });

    test('dialog has submit and cancel buttons', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Tercero' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Crear tercero' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancelar' }).last()).toBeVisible();
    });

    test('dialog closes on cancel', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Tercero' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Cancelar' }).last().click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('edit dialog opens from detail', async ({ page }) => {
      const row = page.locator('table tbody tr').first();
      await row.waitFor({ state: 'visible', timeout: 10_000 });
      await row.click();
      await expect(page).toHaveURL(/\/third-parties\/\d+/);

      await page.getByRole('button', { name: 'Editar' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.p-dialog-title').filter({ hasText: 'Editar Tercero' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible();
    });
  });

  test.describe('Permissions', () => {
    test('client_admin can access third parties', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/third-parties');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Terceros' })).toBeVisible();
    });
  });
});
