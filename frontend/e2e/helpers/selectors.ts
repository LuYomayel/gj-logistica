/**
 * Common selectors and helpers used across E2E tests.
 */
import { type Page, type Locator, expect } from '@playwright/test';

// ── Sidebar ────────────────────────────────────────────────────────────────
export function sidebar(page: Page): Locator {
  return page.locator('nav, aside').first();
}

export function sidebarLink(page: Page, text: string): Locator {
  return page.getByRole('link', { name: text });
}

// ── DataTable ──────────────────────────────────────────────────────────────
export function dataTable(page: Page): Locator {
  return page.locator('.p-datatable').first();
}

export function dataTableRows(page: Page): Locator {
  return page.locator('.p-datatable-tbody tr');
}

export async function waitForTableLoad(page: Page) {
  // Wait for spinner to disappear and rows to appear (or "no results" message)
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  // Give PrimeReact a moment to render
  await page.waitForTimeout(500);
}

// ── Toast ──────────────────────────────────────────────────────────────────
export async function expectToast(page: Page, textPattern: RegExp | string) {
  const toast = page.locator('.p-toast-message');
  await expect(toast.first()).toBeVisible({ timeout: 10_000 });
  if (typeof textPattern === 'string') {
    await expect(toast.first()).toContainText(textPattern);
  } else {
    await expect(toast.first()).toContainText(textPattern);
  }
}

// ── Dialog ─────────────────────────────────────────────────────────────────
export function dialog(page: Page): Locator {
  return page.locator('.p-dialog').first();
}

export async function expectDialogVisible(page: Page) {
  await expect(page.locator('.p-dialog')).toBeVisible({ timeout: 5_000 });
}

// ── Tabs ───────────────────────────────────────────────────────────────────
export function tabByName(page: Page, name: string): Locator {
  return page.locator('.p-tabview-nav li').filter({ hasText: name });
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────
export async function confirmDialogAccept(page: Page) {
  await page.locator('.p-confirm-dialog .p-confirm-dialog-accept, .p-dialog .p-confirm-dialog-accept').first().click();
}

export async function confirmDialogReject(page: Page) {
  await page.locator('.p-confirm-dialog .p-confirm-dialog-reject, .p-dialog .p-confirm-dialog-reject').first().click();
}
