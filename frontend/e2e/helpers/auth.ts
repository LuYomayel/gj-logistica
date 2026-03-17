import { type Page, expect } from '@playwright/test';

// ── Test credentials ───────────────────────────────────────────────────────
// Loaded from environment variables — set them in .env or CI secrets.
// E.g.: E2E_SUPER_ADMIN_USER=comercial2  E2E_SUPER_ADMIN_PASS=***
export const USERS = {
  superAdmin: {
    username: process.env.E2E_SUPER_ADMIN_USER ?? 'comercial2',
    password: process.env.E2E_SUPER_ADMIN_PASS ?? '',
  },
  clientAdmin: {
    username: process.env.E2E_CLIENT_ADMIN_USER ?? 'admin_acme',
    password: process.env.E2E_CLIENT_ADMIN_PASS ?? '',
  },
  clientUser: {
    username: process.env.E2E_CLIENT_USER_USER ?? 'admin_stoller',
    password: process.env.E2E_CLIENT_USER_PASS ?? '',
  },
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
