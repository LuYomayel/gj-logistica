import { type Page, expect } from '@playwright/test';

// ── Test credentials ───────────────────────────────────────────────────────
// Must match users that exist in the DB.
export const USERS = {
  superAdmin: { username: 'comercial2', password: 'Temporal2026!' },
  clientAdmin: { username: 'admin_acme', password: 'Test2026!' },
  clientUser: { username: 'admin_stoller', password: 'Test2026!' },
} as const;

// ── Login via UI ───────────────────────────────────────────────────────────
export async function loginViaUI(
  page: Page,
  user: { username: string; password: string },
) {
  await page.goto('/login');
  await page.locator('#username').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('#username').fill(user.username);

  // PrimeReact Password wraps the real input inside a div#password
  const passwordInput = page.locator('#password input[type="password"], #password input').first();
  await passwordInput.waitFor({ state: 'visible' });
  // Use triple-click to select all (clears any prefilled content), then type
  await passwordInput.click({ clickCount: 3 });
  await page.keyboard.type(user.password);

  await page.locator('button[type="submit"]').click();
  // Wait for redirect to dashboard (login calls /auth/login + /auth/me, then navigates)
  await expect(page).toHaveURL('/', { timeout: 20_000 });
}

// ── Login via API (faster — injects token into localStorage) ──────────────
export async function loginViaAPI(
  page: Page,
  user: { username: string; password: string },
) {
  // 1. Get token from API
  const apiBase = 'http://localhost:3000/api';

  const loginRes = await page.request.post(`${apiBase}/auth/login`, {
    data: { username: user.username, password: user.password },
  });
  const loginBody = await loginRes.json();
  const token: string = loginBody.data?.accessToken ?? loginBody.accessToken;

  // 2. Get user profile with permissions
  const meRes = await page.request.get(`${apiBase}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meBody = await meRes.json();
  const me = meBody.data ?? meBody;

  const authUser = {
    id: me.id,
    username: me.username,
    firstName: me.firstName ?? null,
    lastName: me.lastName ?? null,
    email: me.email,
    isAdmin: me.isAdmin,
    userType: me.userType ?? 'client_user',
    tenantId: me.tenantId,
    permissions: me.permissions ?? [],
  };

  // 3. Inject into localStorage before navigating
  await page.goto('/login'); // need a page context to set localStorage
  await page.evaluate(
    ({ t, u }) => {
      localStorage.setItem('gj_token', t);
      localStorage.setItem('gj_user', JSON.stringify(u));
    },
    { t: token, u: authUser },
  );

  // 4. Navigate to home
  await page.goto('/');
  await expect(page).toHaveURL('/');
}

// ── Logout ─────────────────────────────────────────────────────────────────
export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('gj_token');
    localStorage.removeItem('gj_user');
  });
  await page.goto('/login');
}
