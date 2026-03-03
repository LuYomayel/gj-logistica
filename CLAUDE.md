# Dolibarr Migration Project — Claude Rules

## Project Overview
Migration of Dolibarr 18.0.0 ERP to NestJS + ReactJS + TypeScript + MySQL.
Company: "Deposito" (Argentina, ARS).

## Repository Structure
```
dolibarr/
├── backend/    — NestJS API (port 3000)
├── frontend/   — React + Vite (port 5173)
└── dolibarr-migracion-analisis.md  — Full analysis doc
```

## Stack
- **Backend:** NestJS 10+, TypeORM, MySQL 8, TypeScript (strict), Jest
- **Frontend:** React 18+, TypeScript (strict), Vite, TanStack Query, React Router v6, Tailwind CSS, PrimeReact, Axios

---

## BACKEND RULES (NestJS)

### Architecture
- Follow **NestJS modular architecture**: one folder per feature (`auth/`, `users/`, `orders/`, etc.)
- Each module has: `module.ts`, `controller.ts`, `service.ts`, `dto/`, and entity imported from `entities/`
- All entities live in `src/entities/` with `.entity.ts` suffix
- All DTOs use `class-validator` decorators; always validate input
- Use `@nestjs/config` with `.env` for all configuration — never hardcode secrets

### TypeORM
- `synchronize: false` always — use TypeORM migrations only
- Migrations live in `src/database/migrations/`
- Use `DataSource` from `data-source.ts` for migration CLI
- Use `QueryRunner` with explicit transactions for any operation that touches multiple tables (especially order validation)
- Foreign keys as plain integer columns + explicit `@ManyToOne` / `@OneToMany` relations

### Auth & Security
- JWT-based auth with `@nestjs/passport` + `passport-jwt`
- Passwords hashed with `bcryptjs` (salt rounds: 12)
- RBAC via `RolesGuard` + `@Roles()` decorator — never expose admin endpoints without guard
- Always apply `JwtAuthGuard` globally or per-controller; use `@Public()` decorator for open routes

### Business Logic Rules
- **Order validation** is a transactional operation: check stock → decrement stock → create movements → update order → commit — all inside one `QueryRunner` transaction
- Stock must never go negative — throw `BadRequestException` and rollback if it would
- Order ref format: `SOyymm-nnnn` — use `order_sequences` table with row lock, not MAX()+1 query
- Email notifications (ORDER_VALIDATE, ORDER_CLOSE) are sent AFTER transaction commit, non-blocking

### Testing
- **MANDATORY:** Every module must have Jest unit tests in `*.spec.ts` files
- Test services with mocked repositories (`jest.fn()`)
- Tests must pass before moving to the next roadmap phase
- Run with `npm run test` from `backend/`

### Code Style
- Use `async/await` — never callbacks or `.then()` chains
- Always type return values of service methods
- DTOs: `Create*Dto`, `Update*Dto`, `Filter*Dto` pattern
- HTTP response: use `class-transformer` + `TransformInterceptor` for consistent shape
- Errors: throw NestJS built-in exceptions (`BadRequestException`, `NotFoundException`, etc.)

---

## FRONTEND RULES (React)

### Architecture
- Feature-based folder structure: `src/features/<feature>/`
- Each feature has: `components/`, `hooks/`, `api/`, `types/`
- Shared code in `src/shared/` (components, hooks, utils, types)
- Pages in `src/pages/` — just compose feature components

### Components
- Use **PrimeReact** for all standard UI: `DataTable`, `InputText`, `Dropdown`, `Dialog`, `Button`, `Calendar`, `Toast`, etc.
- Use **Tailwind CSS** for layout, spacing, responsive design, and custom styling
- Never build custom table, modal, or input components from scratch when PrimeReact has one
- Always wrap PrimeReact components with Tailwind for layout context

### Data Fetching
- Use **TanStack Query** (`useQuery`, `useMutation`) for all server state
- API calls via Axios with a shared `apiClient` instance (base URL from env, JWT interceptor)
- Query keys follow pattern: `['resource', id?, filters?]`
- Handle loading/error states explicitly in every list/detail component

### Routing
- React Router v6 with `<BrowserRouter>` + `<Routes>`
- Protected routes via `<PrivateRoute>` wrapper that checks JWT
- Route structure mirrors the screens defined in the analysis doc

### Forms
- Use **react-hook-form** for all forms
- Combine with PrimeReact inputs via `Controller` wrapper
- Validate on submit; show inline errors below each field

### Types
- Strict TypeScript — no `any`
- Define response types matching backend DTOs in `src/shared/types/`
- Use `interface` for objects, `type` for unions/aliases

### Code Style
- Functional components only — no class components
- Custom hooks for reusable logic — prefix with `use`
- Named exports for components; default export for page components
- Keep components small; extract sub-components when a component exceeds ~150 lines

---

## DATABASE RULES

- MySQL 8 with UTC+0 storage (display in America/Argentina/Buenos_Aires)
- All monetary fields: `DECIMAL(24,8)` — never `FLOAT` for money
- Extra fields from Dolibarr are **regular columns** in the main table — not EAV, not JSON
- After loading migration data: always run `ALTER TABLE ... AUTO_INCREMENT = <next>` to avoid PK collisions

---

## ROADMAP PHASES (current progress tracked here)
- [x] **Phase 1** — Backend Core: Auth, Users, Groups, Third Parties, Contacts + Tests ✅ 33/33 tests
- [ ] **Phase 2** — Products, Warehouses, Stock, Orders (validation logic) + Tests
- [ ] **Phase 3** — ETL: migrate data from Dolibarr MySQL
- [ ] **Phase 4** — Frontend React: all screens
- [ ] **Phase 5** — e2e tests, Swagger, Docker, Deploy

**Gate rule:** Do NOT start the next phase until all Jest tests for the current phase pass.
