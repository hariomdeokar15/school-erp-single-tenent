# SchoolERP India — Production Monorepo Foundation

## Project Purpose

SchoolERP India is an automation-first, single-tenant ERP designed for **one Indian K-12 school** (~1,600 students). It serves office staff, admissions officers, accountants, teachers, parents, students, principal, and transport staff via a unified Web portal and Mobile application powered by a central NestJS API.

> [!IMPORTANT]
> This system is strictly single-tenant for one school. Multi-tenancy, cross-school analytics, and tenant middleware are intentionally excluded.

---

## Architecture Summary

```text
React 18 + Vite Web Portal        React Native + Expo Mobile Apps
             \                                  /
              \-------- HTTPS REST API --------/
                               |
                     NestJS Modular Monolith
                               |
            +------------------+------------------+
            |                  |                  |
      PostgreSQL 16         Redis 7           Private S3
      (TypeORM 0.3)        (BullMQ)         (Attachments)
```

---

## Required Tools & Environment

- **Node.js**: `v20 LTS` or higher
- **Package Manager**: `pnpm` (v8+) or `npx pnpm`
- **Container Runtime**: `Docker` & `Docker Compose`
- **Database**: PostgreSQL 16
- **Cache / Queue**: Redis 7

---

## Monorepo Layout

```text
schoolerp/
  apps/
    api/                   # NestJS 10 modular monolith
    web/                   # React 18 + Vite SPA
    mobile/                # React Native + Expo app
  packages/
    contracts/             # Shared DTOs, enums, roles, and API interfaces
    config/                # Shared ESLint, TypeScript, and Prettier rules
    i18n/                  # English, Hindi, Marathi dictionaries
    shared/                # Pure formatting and validation helpers
  docs/                    # Project documentation & ADR logs
  infra/                   # Infrastructure configuration placeholder
  docker-compose.yml       # Local PostgreSQL & Redis environment
  .env.example             # Safe environment variable template
  .gitleaks.toml           # Secret scanning rules
  CODEOWNERS               # Critical path review requirements
  pnpm-workspace.yaml      # Monorepo workspace configuration
```

---

## Local Setup Instructions

1. **Clone the Repository**

   ```bash
   git clone <repo-url>
   cd school-erp-single-tenent
   ```

2. **Copy Environment Template**

   ```bash
   cp .env.example .env
   ```

3. **Start Database & Redis**

   ```bash
   docker-compose up -d
   ```

4. **Install Dependencies**

   ```bash
   pnpm install --frozen-lockfile
   ```

5. **Run Database Migrations**

   ```bash
   pnpm --filter @schoolerp/api migration:run
   ```

6. **Start Applications**
   - **API Backend**: `pnpm --filter @schoolerp/api start:dev` (runs on `http://localhost:3000`)
   - **Web App**: `pnpm --filter @schoolerp/web dev` (runs on `http://localhost:3001`)
   - **Mobile App**: `pnpm --filter @schoolerp/mobile start`

---

## Available Commands

| Command                                         | Purpose                                    |
| ----------------------------------------------- | ------------------------------------------ |
| `pnpm run build`                                | Build all shared packages and applications |
| `pnpm run lint`                                 | Run ESLint across monorepo                 |
| `pnpm run typecheck`                            | Run TypeScript typecheck across monorepo   |
| `pnpm run test`                                 | Run automated tests across monorepo        |
| `pnpm run format`                               | Verify Prettier formatting                 |
| `pnpm --filter @schoolerp/api migration:run`    | Execute pending database migrations        |
| `pnpm --filter @schoolerp/api migration:revert` | Revert latest database migration           |

---

## Environment Variables

| Variable               | Default Value                                               | Description                                                 |
| ---------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| `NODE_ENV`             | `development`                                               | Operating environment (`development`, `production`, `test`) |
| `PORT`                 | `3000`                                                      | NestJS API port                                             |
| `DATABASE_URL`         | `postgresql://schoolerp:CHANGE_ME@localhost:5432/schoolerp` | PostgreSQL connection string                                |
| `REDIS_URL`            | `redis://localhost:6379`                                    | Redis connection string                                     |
| `JWT_PRIVATE_KEY`      | `<GENERATED_IN_SECRET_MANAGER>`                             | RSA/EC private key for JWT signing                          |
| `JWT_PUBLIC_KEY`       | `<GENERATED_IN_SECRET_MANAGER>`                             | RSA/EC public key for JWT verification                      |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3001`                                     | Allowed CORS origins                                        |
| `VITE_API_BASE_URL`    | `http://localhost:3000`                                     | Web application API endpoint                                |

---

## Security Policy & Branch Protection

- **No Secrets in Source Control**: Never commit `.env` files, API keys, tokens, or private keys.
- **CODEOWNERS**: Critical paths (`apps/api/src/auth`, `payments`, `admissions`, `files`, `database`, `infra`) require explicit approval from designated lead reviewers before merging into `main`.
- **Branch Protection Settings**:
  - Require pull request review before merging.
  - Require status checks to pass before merging (`ci/build-and-test`, `ci/security-scans`).
  - Require linear history; force pushes disabled.

---

## What is Intentionally NOT Implemented Yet in M0

- Real login, JWT issuance, OTP, or MFA (Module M2/M0 auth extension).
- Student, parent, or teacher business data models (Module M2 Academic/Masters).
- Admission applications, review, or document upload (Module M1).
- Fee structure, invoices, payments, or Razorpay integration (Module M3).
- Attendance marking or offline sync (Module M4).
- Communication, notices, push notifications, or SES (Module M5).
- Homework, Exams, or Transport tracking (Modules M6, M7, M8).
