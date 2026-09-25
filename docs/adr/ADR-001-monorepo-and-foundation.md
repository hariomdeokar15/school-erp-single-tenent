# ADR-001 — Production Monorepo and M0 Foundation Architecture

Status: Accepted  
Date: 2026-09-24  
Owner: Tech Lead & Architecture Approver

## Context

SchoolERP India is an ERP operating system designed for a single Indian K-12 school (~1,600 students). The application serves web clients (React 18 + Vite), mobile clients (React Native + Expo), and external services (PostgreSQL, Redis, BullMQ). We need a maintainable, secure foundation that shares data contracts and i18n dictionaries between frontend clients and the backend API while guaranteeing strict single-tenant boundaries and production-grade security defaults.

## Decision

1. **Repository Structure**: Use a `pnpm` workspace monorepo containing `apps/api`, `apps/web`, `apps/mobile`, and shared `packages/` (`contracts`, `config`, `i18n`, `shared`).
2. **Backend**: NestJS 10 modular monolith running Node.js 20 LTS with TypeORM 0.3, PostgreSQL 16, and Redis 7. All business logic remains strictly in NestJS.
3. **Web Frontend**: React 18 SPA bundled with Vite, styled with Tailwind CSS, using React Router and TanStack Query. Next.js and server components are explicitly forbidden.
4. **Mobile Frontend**: React Native + Expo (SDK 50/51) with Expo Router for Android and iOS.
5. **Localization**: Dual-platform i18n supporting English (`en`), Hindi (`hi`), and Marathi (`mr`) from day one using shared JSON dictionaries in `@schoolerp/i18n`.
6. **Single-Tenancy**: The application serves one school only. No multi-tenant schemas, RLS, tenant middleware, or school selectors will be added.

## Alternatives Considered

- **Multi-tenant SaaS architecture**: Rejected because product requirements specifically target one school with low maintenance overhead and zero risk of cross-tenant data leaks.
- **Next.js App Router for Web**: Rejected due to unnecessary server rendering complexity for an internal school portal and to prevent duplication of backend business logic across Next.js API routes and NestJS.
- **Separate Web & Mobile Backends (BFF)**: Rejected; a single NestJS API handles both web and mobile presentation clients cleanly.

## Consequences

- **Positive**: Single codebase for shared DTO contracts, enums, types, and translations; fast local development loop with `pnpm` and `docker-compose`; consistent security controls enforced at API layer.
- **Negative**: Monorepo build setup requires careful dependency boundaries and workspace configuration.

## Security and Privacy Impact

- Secrets are kept out of source code via strict `.gitignore`, Gitleaks CI scanning, and `.env.example` placeholders.
- Global exception filter prevents stack trace leaks.
- Helmet security headers and CORS restrictions applied by default.
- Append-only `AuditEvent` entity created to record future audit trails.

## Validation and Review Date

- Initial Validation: 2026-09-24 (Passed M0.1 release criteria)
- Next Scheduled Review: Prior to M2 Academic Masters release.
