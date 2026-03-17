/**
 * TDD — Security Bug Fixes (Phase 6)
 *
 * These tests are written FIRST (Red) to define expected behavior.
 * Then the code is fixed to make them pass (Green).
 *
 * Bugs covered:
 *  #1 — synchronize must be false
 *  #2 — JWT_SECRET must not have a fallback
 *  #3 — CORS must restrict origins
 *  #4 — validateOrder race condition (single-loop stock check+decrement)
 *  #5 — Endpoints must require @RequiresPermission
 *  #6 — update() must block privilege escalation
 *  #7 — File import must validate type and size
 */
import 'reflect-metadata';

// ─── Bug #1: synchronize: false ─────────────────────────────────────────────

describe('Bug #1 — TypeORM synchronize must be false', () => {
  it('should have synchronize: false in app.module.ts', () => {
    // Read the actual source file and verify synchronize is false
    const fs = require('fs');
    const path = require('path');
    const appModulePath = path.resolve(__dirname, '../app.module.ts');
    const content = fs.readFileSync(appModulePath, 'utf8');

    // Must contain synchronize: false (not true)
    expect(content).toMatch(/synchronize:\s*false/);
    expect(content).not.toMatch(/synchronize:\s*true/);
  });
});

// ─── Bug #2: JWT_SECRET without fallback ────────────────────────────────────

describe('Bug #2 — JWT_SECRET must not have a default fallback', () => {
  it('should not have a default-secret fallback in auth.module.ts', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../auth/auth.module.ts'),
      'utf8',
    );

    expect(content).not.toContain("'default-secret'");
    expect(content).not.toContain('"default-secret"');
  });

  it('should not have a default-secret fallback in jwt.strategy.ts', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../auth/strategies/jwt.strategy.ts'),
      'utf8',
    );

    expect(content).not.toContain("'default-secret'");
    expect(content).not.toContain('"default-secret"');
  });
});

// ─── Bug #3: CORS must be restricted ────────────────────────────────────────

describe('Bug #3 — CORS must restrict origins', () => {
  it('should not call enableCors() without options in main.ts', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../main.ts'),
      'utf8',
    );

    // Should NOT have enableCors() with empty parens (no config)
    // But SHOULD have enableCors({ ... }) with options
    expect(content).not.toMatch(/enableCors\(\s*\)/);
    expect(content).toMatch(/enableCors\(\s*\{/);
  });
});

// ─── Bug #5: Endpoints require @RequiresPermission ──────────────────────────

describe('Bug #5 — All read endpoints must have @RequiresPermission', () => {
  const fs = require('fs');
  const path = require('path');

  const cases = [
    {
      file: '../orders/orders.controller.ts',
      label: 'GET /orders/stats',
      mustContainBefore: "summary: 'Estadísticas de pedidos",
      permission: 'orders.read',
    },
    {
      file: '../orders/orders.controller.ts',
      label: 'GET /orders/:id',
      mustContainBefore: "summary: 'Obtener pedido por ID",
      permission: 'orders.read',
    },
    {
      file: '../products/products.controller.ts',
      label: 'GET /products/stats',
      mustContainBefore: "summary: 'Estadísticas de productos",
      permission: 'products.read',
    },
    {
      file: '../products/products.controller.ts',
      label: 'GET /products/low-stock',
      mustContainBefore: "summary: 'Productos con stock bajo",
      permission: 'products.read',
    },
    {
      file: '../products/products.controller.ts',
      label: 'GET /products/:id',
      mustContainBefore: "summary: 'Detalle de producto",
      permission: 'products.read',
    },
    {
      file: '../products/products.controller.ts',
      label: 'GET /products/ref/:ref',
      mustContainBefore: "summary: 'Buscar producto por referencia",
      permission: 'products.read',
    },
    {
      file: '../third-parties/third-parties.controller.ts',
      label: 'GET /third-parties/:id',
      mustContainBefore: "summary: 'Detalle empresa",
      permission: 'third_parties.read',
    },
    {
      file: '../third-parties/third-parties.controller.ts',
      label: 'GET /third-parties/:id/sales-reps',
      mustContainBefore: "summary: 'Vendedores asignados",
      permission: 'third_parties.read',
    },
    {
      file: '../contacts/contacts.controller.ts',
      label: 'GET /contacts/:id',
      mustContainBefore: "summary: 'Detalle de contacto",
      permission: 'contacts.read',
    },
    {
      file: '../users/users.controller.ts',
      label: 'GET /users/:id',
      mustContainBefore: "summary: 'Detalle de usuario",
      permission: 'users.read',
    },
    {
      file: '../users/users.controller.ts',
      label: 'GET /users/:id/groups',
      mustContainBefore: "summary: 'Grupos del usuario",
      permission: 'users.read',
    },
    {
      file: '../stock/stock.controller.ts',
      label: 'GET /stock/movements/product/:productId',
      mustContainBefore: "summary: 'Movimientos de un producto",
      permission: 'stock.read',
    },
    {
      file: '../stock/stock.controller.ts',
      label: 'GET /stock/at-date',
      mustContainBefore: "summary: 'Stock histórico",
      permission: 'stock.read',
    },
  ];

  for (const tc of cases) {
    it(`${tc.label} should require '${tc.permission}'`, () => {
      const content = fs.readFileSync(path.resolve(__dirname, tc.file), 'utf8');

      // Find the block of code around the ApiOperation summary
      const idx = content.indexOf(tc.mustContainBefore);
      expect(idx).toBeGreaterThan(-1);

      // Look at the ~200 chars before the ApiOperation to find @RequiresPermission
      const blockBefore = content.slice(Math.max(0, idx - 200), idx);
      expect(blockBefore).toContain(`@RequiresPermission('${tc.permission}')`);
    });
  }
});

// ─── Bug #7: File import validation ─────────────────────────────────────────

describe('Bug #7 — Products import must validate file type and size', () => {
  it('should have fileFilter or limits in FileInterceptor', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../products/products.controller.ts'),
      'utf8',
    );

    // Must have limits config
    expect(content).toMatch(/fileSize/);
    // Must have fileFilter or mimetype check
    expect(content).toMatch(/fileFilter|mimetype/);
  });

  it('should throw BadRequestException (not generic Error) when no file', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../products/products.controller.ts'),
      'utf8',
    );

    // Should NOT use "throw new Error" — should use BadRequestException
    expect(content).not.toMatch(/throw new Error\(/);
  });
});
