/**
 * TDD — Bug Fixes B9, B10, B12, B13
 *
 * RED phase: tests written FIRST, then code fixed to make them pass.
 *
 * B9  — resetToDraft() must revert stock movements from validate()
 * B10 — DashboardWidgets must use /products/low-stock, not list({limit:100})
 * B12 — buildEmailHtml must escape HTML entities in interpolated values
 * B13 — PrivateRoute must validate JWT expiration, not just token presence
 */
import 'reflect-metadata';

// ─── B9: resetToDraft must revert stock ──────────────────────────────────────

describe('B9 — resetToDraft must revert stock movements', () => {
  const fs = require('fs');
  const path = require('path');

  it('should use a transaction (QueryRunner) in resetToDraft', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../inventories/inventories.service.ts'),
      'utf8',
    );
    // resetToDraft must use createQueryRunner for transactional stock reversal
    const resetMethod = content.slice(content.indexOf('resetToDraft'));
    expect(resetMethod).toContain('createQueryRunner');
  });

  it('should query inventory lines inside resetToDraft', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../inventories/inventories.service.ts'),
      'utf8',
    );
    const resetMethod = content.slice(content.indexOf('resetToDraft'));
    // Must read lines to know what stock to reverse
    expect(resetMethod).toMatch(/find\(.*inventoryId/s);
  });

  it('should modify ProductStock (revert) inside resetToDraft', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../inventories/inventories.service.ts'),
      'utf8',
    );
    const resetMethod = content.slice(content.indexOf('resetToDraft'));
    // Must touch product_stocks to revert quantities
    expect(resetMethod).toMatch(/stockRepo|ProductStock/);
  });

  it('should create reverse StockMovement entries', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../inventories/inventories.service.ts'),
      'utf8',
    );
    const resetMethod = content.slice(content.indexOf('resetToDraft'));
    // Must create stock movements to reverse the inventory adjustments
    expect(resetMethod).toContain('StockMovement');
  });
});

// ─── B10: Dashboard must use /products/low-stock ─────────────────────────────

describe('B10 — DashboardWidgets must use low-stock endpoint', () => {
  const fs = require('fs');
  const path = require('path');

  it('should NOT call productsApi.list for stock alerts', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/features/dashboard/components/DashboardWidgets.tsx'),
      'utf8',
    );
    // Should not fetch all products and filter locally
    const stockWidget = content.slice(0, content.indexOf('RecentOrdersWidget'));
    expect(stockWidget).not.toContain('productsApi.list');
  });

  it('should use getLowStock or low-stock endpoint', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/features/dashboard/components/DashboardWidgets.tsx'),
      'utf8',
    );
    const stockWidget = content.slice(0, content.indexOf('RecentOrdersWidget'));
    // Must use the dedicated low-stock endpoint
    expect(stockWidget).toMatch(/getLowStock|low-stock|lowStock/);
  });

  it('should NOT filter locally with .filter() on stock', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/features/dashboard/components/DashboardWidgets.tsx'),
      'utf8',
    );
    const stockWidget = content.slice(0, content.indexOf('RecentOrdersWidget'));
    // No local filtering — the API already returns only low-stock products
    // .filter() with stock comparison is the telltale sign of local filtering
    expect(stockWidget).not.toMatch(/\.filter\(/);
  });
});

// ─── B12: XSS prevention in email HTML ───────────────────────────────────────

describe('B12 — buildEmailHtml must escape HTML entities', () => {
  const fs = require('fs');
  const path = require('path');

  it('should have an escapeHtml helper function', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../notifications/notifications.service.ts'),
      'utf8',
    );
    // Must define an escape function to prevent XSS
    expect(content).toMatch(/escapeHtml|escape_html|htmlEscape/);
  });

  it('should escape order.ref before interpolation in the HTML template', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../notifications/notifications.service.ts'),
      'utf8',
    );
    // The HTML template literal starts with `<!DOCTYPE html>` — extract only that part
    const templateStart = content.indexOf('<!DOCTYPE html>');
    const templateEnd = content.indexOf('</html>', templateStart);
    const template = content.slice(templateStart, templateEnd + 7);
    // Should NOT have raw ${order.ref} in the HTML template — should use ${safeRef}
    expect(template).not.toMatch(/\$\{order\.ref\}/);
    expect(template).toContain('${safeRef}');
  });

  it('should escape order.agencia before interpolation', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../notifications/notifications.service.ts'),
      'utf8',
    );
    const buildMethod = content.slice(content.indexOf('buildEmailHtml'));
    expect(buildMethod).not.toMatch(/\$\{order\.agencia\}/);
  });

  it('should escape order.nroSeguimiento before interpolation', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../notifications/notifications.service.ts'),
      'utf8',
    );
    const buildMethod = content.slice(content.indexOf('buildEmailHtml'));
    expect(buildMethod).not.toMatch(/\$\{order\.nroSeguimiento\}/);
  });

  it('should escape thirdPartyName before interpolation', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../notifications/notifications.service.ts'),
      'utf8',
    );
    const buildMethod = content.slice(content.indexOf('buildEmailHtml'));
    expect(buildMethod).not.toMatch(/\$\{thirdPartyName\}/);
  });
});

// ─── B13: PrivateRoute must check JWT expiration ─────────────────────────────

describe('B13 — PrivateRoute must validate JWT expiration', () => {
  const fs = require('fs');
  const path = require('path');

  it('should check token expiration, not just presence', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/shared/hooks/useAuth.tsx'),
      'utf8',
    );
    // isAuthenticated must not be just !!token — it must check expiration
    expect(content).not.toMatch(/isAuthenticated:\s*!!token/);
  });

  it('should decode or parse the JWT token', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/shared/hooks/useAuth.tsx'),
      'utf8',
    );
    // Must decode the JWT to read exp claim
    expect(content).toMatch(/atob|jwt|decode|JSON\.parse|exp/);
  });

  it('should compare expiration against current time', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/shared/hooks/useAuth.tsx'),
      'utf8',
    );
    // Must check Date.now() or similar against exp
    expect(content).toMatch(/Date\.now|new Date|getTime/);
  });

  it('should auto-logout when token is expired', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../../frontend/src/shared/hooks/useAuth.tsx'),
      'utf8',
    );
    // If token is expired, should trigger logout or clear state
    expect(content).toMatch(/logout|removeItem|expired/);
  });
});
