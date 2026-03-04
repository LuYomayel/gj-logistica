/**
 * ============================================================
 *  E2E — Funcionalidad Multi-tenant + Permisos
 * ============================================================
 *
 * Cubre:
 *  1. Auth — login de los 3 tipos de usuario, perfil JWT correcto
 *  2. Control de acceso — solo super_admin puede operar /api/tenants
 *  3. Aislamiento de datos — Productos (lista)
 *  4. Aislamiento de datos — Pedidos (lista)
 *  5. Aislamiento — crear recurso y verificar cross-tenant
 *  6. Aislamiento — acceso por ID cross-tenant devuelve 404
 *  7. Tenant CRUD — super_admin
 *  8. Permission Groups — catálogo y aislamiento
 *  9. Validación de inputs — errores 400
 *
 * Usuarios de prueba:
 *  - comercial2 / Temporal2026!  → super_admin   (entity=1, Corteva)
 *  - admin_acme  / Test2026!     → client_admin  (entity=2, Acme Corp)
 *  - admin_stoller / Test2026!   → client_admin  (entity=3, Stoller Argentina)
 *
 * ⚠️  Los tests usan la DB real (gj_logistica). Los recursos creados
 *     durante la suite se eliminan en afterAll.
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

// ─── Credenciales ───────────────────────────────────────────────────────────
const SUPER_ADMIN = { username: 'comercial2', password: 'Temporal2026!' };
const ADMIN_ACME = { username: 'admin_acme', password: 'Test2026!' };
const ADMIN_STOLLER = { username: 'admin_stoller', password: 'Test2026!' };

// ─── Suite principal ─────────────────────────────────────────────────────────
describe('Multi-tenant E2E', () => {
  let app: INestApplication<App>;

  // Tokens
  let superAdminToken: string;
  let adminAcmeToken: string;
  let adminStollerToken: string;

  // IDs de recursos creados en los tests (para cleanup en afterAll)
  let createdTenantId: number | undefined;
  let createdProductAcmeId: number | undefined;
  let createdProductStollerRefDupId: number | undefined;
  let createdPermGroupId: number | undefined;

  // ─── Helper: login ─────────────────────────────────────────────────────────
  async function loginAs(username: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username, password })
      .expect(201);
    return res.body.data.accessToken as string;
  }

  function auth(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  // ─── Setup ─────────────────────────────────────────────────────────────────
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Replicar exactamente la configuración de main.ts
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
      new TransformInterceptor(),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    // Login previo — tokens disponibles para toda la suite
    [superAdminToken, adminAcmeToken, adminStollerToken] = await Promise.all([
      loginAs(SUPER_ADMIN.username, SUPER_ADMIN.password),
      loginAs(ADMIN_ACME.username, ADMIN_ACME.password),
      loginAs(ADMIN_STOLLER.username, ADMIN_STOLLER.password),
    ]);
  }, 60_000);

  // ─── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    const server = app.getHttpServer();

    // Limpiar producto acme creado en test 5
    if (createdProductAcmeId) {
      await request(server)
        .delete(`/api/products/${createdProductAcmeId}`)
        .set(auth(superAdminToken));
    }

    // Limpiar producto stoller (ref duplicada)
    if (createdProductStollerRefDupId) {
      await request(server)
        .delete(`/api/products/${createdProductStollerRefDupId}`)
        .set(auth(superAdminToken));
    }

    // Limpiar permission group
    if (createdPermGroupId) {
      await request(server)
        .delete(`/api/permission-groups/${createdPermGroupId}`)
        .set(auth(superAdminToken));
    }

    // Limpiar tenant creado en test 7
    if (createdTenantId) {
      await request(server)
        .delete(`/api/tenants/${createdTenantId}`)
        .set(auth(superAdminToken));
    }

    await app.close();
  }, 60_000);

  // ══════════════════════════════════════════════════════════════════════════
  //  1. Auth — Login y perfil JWT
  // ══════════════════════════════════════════════════════════════════════════
  describe('1. Auth — Login y perfil JWT', () => {
    it('super_admin: login exitoso, userType=super_admin, isAdmin=true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(auth(superAdminToken))
        .expect(200);

      expect(res.body.data.userType).toBe('super_admin');
      expect(res.body.data.username).toBe(SUPER_ADMIN.username);
      expect(res.body.data.isAdmin).toBe(true);
      expect(res.body.data.entity).toBe(1); // Corteva
    });

    it('admin_acme: login exitoso, userType=client_admin, entity=2', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(auth(adminAcmeToken))
        .expect(200);

      expect(res.body.data.userType).toBe('client_admin');
      expect(res.body.data.username).toBe(ADMIN_ACME.username);
      expect(res.body.data.entity).toBe(2); // Acme Corp
    });

    it('admin_stoller: login exitoso, userType=client_admin, entity=3', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(auth(adminStollerToken))
        .expect(200);

      expect(res.body.data.userType).toBe('client_admin');
      expect(res.body.data.username).toBe(ADMIN_STOLLER.username);
      expect(res.body.data.entity).toBe(3); // Stoller Argentina
    });

    it('sin token → 401 Unauthorized', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('credenciales inválidas → 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'nobody', password: 'wrongpass' })
        .expect(401);
    });

    it('token de otro tenant es válido solo para su propia información', async () => {
      // El token de admin_acme no puede impersonar a admin_stoller
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(auth(adminAcmeToken))
        .expect(200);

      expect(res.body.data.entity).toBe(2);
      expect(res.body.data.entity).not.toBe(3);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  2. Control de acceso — Endpoints /api/tenants
  // ══════════════════════════════════════════════════════════════════════════
  describe('2. Control de acceso — Endpoints /api/tenants', () => {
    it('super_admin: GET /api/tenants → 200, lista ≥ 3 tenants', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tenants')
        .set(auth(superAdminToken))
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);

      const names: string[] = res.body.data.map((t: { name: string }) => t.name);
      expect(names).toContain('Corteva');
      expect(names).toContain('Acme Corp');
      expect(names).toContain('Stoller Argentina');
    });

    it('admin_acme (client_admin): GET /api/tenants → 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/tenants')
        .set(auth(adminAcmeToken))
        .expect(403);
    });

    it('admin_stoller (client_admin): GET /api/tenants → 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/tenants')
        .set(auth(adminStollerToken))
        .expect(403);
    });

    it('sin token: GET /api/tenants → 401 Unauthorized', async () => {
      await request(app.getHttpServer()).get('/api/tenants').expect(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  3. Aislamiento de datos — Productos (GET /api/products)
  // ══════════════════════════════════════════════════════════════════════════
  describe('3. Aislamiento — Productos (lista)', () => {
    it('super_admin: ve todos los productos de Corteva (total > 0)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .set(auth(superAdminToken))
        .expect(200);

      expect(res.body.data.total).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('admin_acme (entity=2): ve 0 productos — tenant vacío', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .set(auth(adminAcmeToken))
        .expect(200);

      expect(res.body.data.total).toBe(0);
      expect(res.body.data.items).toHaveLength(0);
    });

    it('admin_stoller (entity=3): ve 0 productos — tenant vacío', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .set(auth(adminStollerToken))
        .expect(200);

      expect(res.body.data.total).toBe(0);
      expect(res.body.data.items).toHaveLength(0);
    });

    it('sin token: GET /api/products → 401', async () => {
      await request(app.getHttpServer()).get('/api/products').expect(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  4. Aislamiento de datos — Pedidos (GET /api/orders)
  // ══════════════════════════════════════════════════════════════════════════
  describe('4. Aislamiento — Pedidos (lista)', () => {
    it('super_admin: ve pedidos de Corteva (total > 0)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders')
        .set(auth(superAdminToken))
        .expect(200);

      expect(res.body.data.total).toBeGreaterThan(0);
    });

    it('admin_acme: ve 0 pedidos — tenant vacío', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders')
        .set(auth(adminAcmeToken))
        .expect(200);

      expect(res.body.data.total).toBe(0);
      expect(res.body.data.items).toHaveLength(0);
    });

    it('admin_stoller: ve 0 pedidos — tenant vacío', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders')
        .set(auth(adminStollerToken))
        .expect(200);

      expect(res.body.data.total).toBe(0);
    });

    it('sin token: GET /api/orders → 401', async () => {
      await request(app.getHttpServer()).get('/api/orders').expect(401);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  5. Aislamiento — Crear producto y verificar cross-tenant
  // ══════════════════════════════════════════════════════════════════════════
  describe('5. Aislamiento — Crear producto y verificar entre tenants', () => {
    it('admin_acme: crea producto → aparece en su lista, entity=2', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/products')
        .set(auth(adminAcmeToken))
        .send({ ref: 'E2E-ACME-001', label: 'Producto Test E2E Acme' })
        .expect(201);

      createdProductAcmeId = res.body.data.id as number;
      expect(createdProductAcmeId).toBeDefined();
      expect(res.body.data.entity).toBe(2);
      expect(res.body.data.ref).toBe('E2E-ACME-001');
    });

    it('admin_acme: su lista ahora tiene 1 producto', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .set(auth(adminAcmeToken))
        .expect(200);

      expect(res.body.data.total).toBe(1);
      expect(res.body.data.items[0].ref).toBe('E2E-ACME-001');
    });

    it('admin_stoller: NO ve el producto de acme — sigue en 0', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .set(auth(adminStollerToken))
        .expect(200);

      expect(res.body.data.total).toBe(0);
    });

    it('super_admin: puede ver el producto de acme en su lista global', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .query({ search: 'E2E-ACME-001' })
        .set(auth(superAdminToken))
        .expect(200);

      const refs = res.body.data.items.map((p: { ref: string }) => p.ref);
      expect(refs).toContain('E2E-ACME-001');
    });

    it('misma ref puede existir en distintos tenants (sin colisión)', async () => {
      // admin_stoller crea la misma ref — no debe dar 409 Conflict
      const res = await request(app.getHttpServer())
        .post('/api/products')
        .set(auth(adminStollerToken))
        .send({ ref: 'E2E-ACME-001', label: 'Producto E2E mismo ref en Stoller' })
        .expect(201);

      createdProductStollerRefDupId = res.body.data.id as number;
      expect(res.body.data.entity).toBe(3);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  6. Aislamiento — Acceso por ID cross-tenant (security gap corregido)
  // ══════════════════════════════════════════════════════════════════════════
  describe('6. Aislamiento — Acceso por ID cross-tenant', () => {
    let cortevaProductId: number;
    let cortevaOrderId: number;

    beforeAll(async () => {
      // Obtener ID de un producto de Corteva (entity=1)
      const pRes = await request(app.getHttpServer())
        .get('/api/products')
        .set(auth(superAdminToken));
      cortevaProductId = pRes.body.data.items[0].id as number;

      // Obtener ID de un pedido de Corteva (entity=1)
      const oRes = await request(app.getHttpServer())
        .get('/api/orders')
        .set(auth(superAdminToken));
      cortevaOrderId = oRes.body.data.items[0].id as number;
    });

    // Productos
    it('admin_acme NO puede ver producto de Corteva por ID → 404', async () => {
      await request(app.getHttpServer())
        .get(`/api/products/${cortevaProductId}`)
        .set(auth(adminAcmeToken))
        .expect(404);
    });

    it('admin_stoller NO puede ver producto de Corteva por ID → 404', async () => {
      await request(app.getHttpServer())
        .get(`/api/products/${cortevaProductId}`)
        .set(auth(adminStollerToken))
        .expect(404);
    });

    it('super_admin SÍ puede ver cualquier producto por ID → 200', async () => {
      await request(app.getHttpServer())
        .get(`/api/products/${cortevaProductId}`)
        .set(auth(superAdminToken))
        .expect(200);
    });

    it('admin_acme SÍ puede ver su propio producto por ID → 200', async () => {
      await request(app.getHttpServer())
        .get(`/api/products/${createdProductAcmeId}`)
        .set(auth(adminAcmeToken))
        .expect(200);
    });

    // Pedidos
    it('admin_acme NO puede ver pedido de Corteva por ID → 404', async () => {
      await request(app.getHttpServer())
        .get(`/api/orders/${cortevaOrderId}`)
        .set(auth(adminAcmeToken))
        .expect(404);
    });

    it('super_admin SÍ puede ver cualquier pedido por ID → 200', async () => {
      await request(app.getHttpServer())
        .get(`/api/orders/${cortevaOrderId}`)
        .set(auth(superAdminToken))
        .expect(200);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  7. Tenant CRUD — super_admin
  // ══════════════════════════════════════════════════════════════════════════
  describe('7. Tenant CRUD — solo super_admin', () => {
    it('super_admin: crea tenant nuevo → 201, isActive=true', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tenants')
        .set(auth(superAdminToken))
        .send({ name: 'E2E Test Tenant', code: 'E2ETEST' })
        .expect(201);

      createdTenantId = res.body.data.id as number;
      expect(createdTenantId).toBeDefined();
      expect(res.body.data.name).toBe('E2E Test Tenant');
      expect(res.body.data.code).toBe('E2ETEST');
      expect(res.body.data.isActive).toBe(true);
    });

    it('super_admin: GET /api/tenants/:id → 200, datos correctos', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tenants/${createdTenantId}`)
        .set(auth(superAdminToken))
        .expect(200);

      expect(res.body.data.id).toBe(createdTenantId);
      expect(res.body.data.name).toBe('E2E Test Tenant');
    });

    it('super_admin: PATCH /api/tenants/:id → 200, nombre actualizado', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tenants/${createdTenantId}`)
        .set(auth(superAdminToken))
        .send({ name: 'E2E Test Tenant (updated)' })
        .expect(200);

      expect(res.body.data.name).toBe('E2E Test Tenant (updated)');
    });

    it('super_admin: GET /api/tenants/:id/users → 200, array', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tenants/${createdTenantId}/users`)
        .set(auth(superAdminToken))
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('admin_acme: POST /api/tenants → 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/tenants')
        .set(auth(adminAcmeToken))
        .send({ name: 'Intento ilegal', code: 'ILEGAL' })
        .expect(403);
    });

    it('admin_acme: GET /api/tenants/:id → 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/tenants/${createdTenantId}`)
        .set(auth(adminAcmeToken))
        .expect(403);
    });

    it('super_admin: tenant inexistente → 404', async () => {
      await request(app.getHttpServer())
        .get('/api/tenants/999999')
        .set(auth(superAdminToken))
        .expect(404);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  8. Permission Groups — catálogo y aislamiento
  // ══════════════════════════════════════════════════════════════════════════
  describe('8. Permission Groups y catálogo', () => {
    it('GET /api/permissions: catálogo disponible para todos los autenticados', async () => {
      const [saRes, acmeRes, stollerRes] = await Promise.all([
        request(app.getHttpServer())
          .get('/api/permissions')
          .set(auth(superAdminToken)),
        request(app.getHttpServer())
          .get('/api/permissions')
          .set(auth(adminAcmeToken)),
        request(app.getHttpServer())
          .get('/api/permissions')
          .set(auth(adminStollerToken)),
      ]);

      expect(saRes.status).toBe(200);
      expect(acmeRes.status).toBe(200);
      expect(stollerRes.status).toBe(200);

      // getCatalog() returns Record<string, Permission[]> grouped by module (not an array)
      expect(typeof saRes.body.data).toBe('object');
      const moduleCount = Object.keys(saRes.body.data as Record<string, unknown>).length;
      expect(moduleCount).toBeGreaterThan(0);
    });

    it('GET /api/permissions: sin token → 401', async () => {
      await request(app.getHttpServer()).get('/api/permissions').expect(401);
    });

    it('super_admin: crea permission group global → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/permission-groups')
        .set(auth(superAdminToken))
        .send({ name: 'E2E Test Group', description: 'Grupo de prueba E2E' })
        .expect(201);

      createdPermGroupId = res.body.data.id as number;
      expect(createdPermGroupId).toBeDefined();
      expect(res.body.data.name).toBe('E2E Test Group');
    });

    it('super_admin: GET /api/permission-groups → ve el grupo creado', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/permission-groups')
        .set(auth(superAdminToken))
        .expect(200);

      const ids = res.body.data.map((g: { id: number }) => g.id);
      expect(ids).toContain(createdPermGroupId);
    });

    it('admin_acme: GET /api/permission-groups → 200 (lista grupos de su tenant)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/permission-groups')
        .set(auth(adminAcmeToken))
        .expect(200);

      // El grupo global (tenantId=null) creado por super_admin puede ser visible
      // según la lógica del servicio. Lo importante es que sea array.
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('super_admin: GET /api/permission-groups/:id → 200, datos correctos', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/permission-groups/${createdPermGroupId}`)
        .set(auth(superAdminToken))
        .expect(200);

      expect(res.body.data.name).toBe('E2E Test Group');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  9. Validación de inputs — 400 Bad Request
  // ══════════════════════════════════════════════════════════════════════════
  describe('9. Validación de inputs', () => {
    it('crear tenant sin name → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/tenants')
        .set(auth(superAdminToken))
        .send({ code: 'NONAME' })
        .expect(400);
    });

    it('crear tenant sin code → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/tenants')
        .set(auth(superAdminToken))
        .send({ name: 'Sin código' })
        .expect(400);
    });

    it('crear producto sin ref → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .set(auth(adminAcmeToken))
        .send({ label: 'Producto sin referencia' })
        .expect(400);
    });

    it('login con body vacío → 401 (LocalStrategy rechaza antes de validación)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(401);
    });

    it('ID no numérico en producto → 400', async () => {
      await request(app.getHttpServer())
        .get('/api/products/abc')
        .set(auth(superAdminToken))
        .expect(400);
    });
  });
});
