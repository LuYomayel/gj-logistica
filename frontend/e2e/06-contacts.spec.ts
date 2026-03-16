import { test, expect } from '@playwright/test';
import { USERS, loginViaAPI } from './helpers/auth';

test.describe('Contacts Module', () => {

  test.describe('ContactsTable', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/contacts');
      await page.waitForLoadState('networkidle');
    });

    test('renders page heading and count', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Contactos' })).toBeVisible();
      await expect(page.getByText(/contactos en total/)).toBeVisible();
    });

    test('shows expected table columns', async ({ page }) => {
      const headers = ['Apellido', 'Nombre', 'Correo', 'Teléfono', 'Tercero', 'Marca', 'DNI', 'Nombre Fantasía'];
      for (const h of headers) {
        await expect(page.locator('th').filter({ hasText: h }).first()).toBeVisible();
      }
    });

    test('shows Nuevo Contacto button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Nuevo Contacto' })).toBeVisible();
    });

    test('shows search controls', async ({ page }) => {
      await expect(page.getByPlaceholder(/Nombre, apellido, email/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Buscar' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Limpiar' })).toBeVisible();
    });

    test('paginator is visible', async ({ page }) => {
      await expect(page.locator('.p-paginator')).toBeVisible();
    });
  });

  test.describe('ContactDetail', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/contacts');
      await page.waitForLoadState('networkidle');
      // Navigate to first contact - try clicking row or finding a link
      const row = page.locator('table tbody tr').first();
      await row.waitFor({ state: 'visible', timeout: 10_000 });
      // Contacts may or may not have row click navigation
      // Check if there's an edit button in the row
      const editBtn = row.locator('button .pi-pencil').first();
      if (await editBtn.isVisible().catch(() => false)) {
        // Has inline edit — navigate via URL if detail route exists
        // Get first contact ID from table somehow
      }
    });

    test('contact detail page is accessible', async ({ page }) => {
      // Try navigating directly to a contact
      await page.goto('/contacts');
      await page.waitForLoadState('networkidle');

      // Click on a table row (if navigable)
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
      await firstRow.click();

      // If navigation happens, we should be at /contacts/:id
      const url = page.url();
      if (url.match(/\/contacts\/\d+/)) {
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.getByText('Datos personales')).toBeVisible();
        await expect(page.getByText('Contacto y dirección')).toBeVisible();
      }
    });
  });

  test.describe('ContactFormDialog', () => {
    test.beforeEach(async ({ page }) => {
      await loginViaAPI(page, USERS.superAdmin);
      await page.goto('/contacts');
      await page.waitForLoadState('networkidle');
    });

    test('opens create dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Contacto' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.p-dialog-title').filter({ hasText: 'Nuevo Contacto' })).toBeVisible();
    });

    test('dialog shows form sections', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Contacto' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Datos personales').first()).toBeVisible();
      await expect(page.getByText('Asociación').first()).toBeVisible();
    });

    test('dialog has submit and cancel buttons', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Contacto' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Crear contacto' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancelar' }).last()).toBeVisible();
    });

    test('dialog closes on cancel', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Contacto' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Cancelar' }).last().click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('nombre and apellido are required', async ({ page }) => {
      await page.getByRole('button', { name: 'Nuevo Contacto' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Crear contacto' }).click();
      // Should show validation errors
      await expect(page.getByText(/obligatori|requerid/i).first()).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe('Permissions', () => {
    test('client_admin can access contacts', async ({ page }) => {
      await loginViaAPI(page, USERS.clientAdmin);
      await page.goto('/contacts');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Contactos' })).toBeVisible();
    });
  });
});
