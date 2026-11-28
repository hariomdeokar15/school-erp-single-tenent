 # M0 Module Implementation and Handoff Report

**Status:** Partially implemented; not complete for milestone sign-off or production use  
**Scope:** Authentication, sessions, access control, audit foundation, and the team handoff needed before domain modules depend on them  
**Audience:** Vaibhav, Hariom, Om, and future contributors  
**Last reviewed:** 2026-10-18

This report records the current M0 authentication/access-control baseline, what is still open, why it is open, and how to continue without creating conflicting implementations. It supplements [M0_AUTHENTICATION_AND_ACCESS_CONTROL.md](./M0_AUTHENTICATION_AND_ACCESS_CONTROL.md), which remains the implementation and API reference. It does not certify the code as secure or production-ready.

## 1. Executive status

The repository has an implemented server-side authentication and role/permission foundation: provisioned accounts, password hashing, access and refresh tokens, session checks and revocation, route guards, permission checks, rate limiting, audit writes, and owner bootstrap. Public self-registration is intentionally disabled; an authorized user provisions accounts.

The foundation is not complete as a milestone because the authentication behavior lacks dedicated automated tests, the team has not signed off on the initial role matrix, and staging/independent security review has not been evidenced. Some controls are intentionally deferred until the relevant product flows exist. In particular, object-level authorization cannot be completed before the student, guardian, class, and other domain relationships exist. Those controls must be implemented with each domain feature before its data is exposed.

CI currently runs formatting, lint, type checks, workspace tests, builds, mobile type checking, and security scans. The workflow was extended to validate migrations against PostgreSQL, build the API container without publishing it, and audit production dependencies. These new CI jobs are configured but have not yet been observed passing on GitHub Actions. The current test files do not constitute an authentication test suite.

## 2. Implemented work

The following describes the code present at the time of this report. It is a code inventory, not a claim that each behavior has passed automated security or integration tests.

### Authentication and account lifecycle

- Email/password login is implemented. Email is normalized for account lookup.
- Passwords are stored as Argon2id hashes; plaintext passwords are not stored.
- Access tokens use RS256 and have a 15-minute lifetime. A request also checks that the associated database session remains active.
- Refresh secrets are random; the database stores SHA-256 hashes. Refresh rotates the secret. Reuse of an old token revokes the session.
- Logout revokes the current session. Password change revokes all sessions for that account.
- Provisioned accounts are initially required to change their temporary password.
- Public self-registration is not exposed. User creation is permission-protected and applies additional restrictions to privileged roles.
- An interactive owner bootstrap command creates the first owner, protects against repeated owner bootstrap, hashes the password, and records an audit event. It refuses to accept a password through a non-interactive terminal.
- Account listing is paginated. Account updates can change role or status, revoke sessions when appropriate, and protect the final active owner.

### Request authentication and authorization

- Authentication and authorization guards are registered globally in the auth module.
- Anonymous access requires an explicit public-route marker. Login and refresh are explicitly public.
- Protected routes need an explicit authenticated or permission policy. Routes with no declared access policy are denied.
- Permission checks run on the server using the authenticated user's current roles/permissions.
- Accounts that must change a temporary password are restricted to the password-change route.
- The auth controller exposes login, refresh, current-user, logout, change-password, and protected user-management endpoints. See the API table in the M0 reference document for paths and methods.

### Abuse controls, audit, and storage behavior

- Login attempts are throttled through Redis using source IP and normalized account identifiers. The design fails closed when Redis is unavailable.
- Sensitive authentication, password, session, and account-management actions are recorded through the audit service.
- The audit migration and entity provide the append-only event foundation. Audit write failures are not silently ignored by the service.
- The mobile client stores the refresh token in Expo SecureStore and keeps the access token in memory. Web tokens are memory-only, so reloading/closing the tab requires signing in again.
- Local development may use ephemeral RSA keys when placeholders are configured. Production must provide a stable, matching key pair through the approved secret-management process.

### CI and delivery checks

- Existing CI checks formatting, lint, TypeScript, workspace tests, builds, mobile type checking, and secret/static/filesystem security scans.
- Added CI jobs apply migrations to a clean PostgreSQL 16 service, build the API Docker image without pushing it, and run a production dependency audit.
- The CI migration check only proves that migrations apply to a clean database when that job passes. It does not prove rollback safety or staging compatibility.
- No deployment workflow is part of this M0 work; there is no deployment target yet.

## 3. Pending work and why it remains pending

| Priority | Pending item | Why it is pending / when it becomes necessary | Completion evidence |
| --- | --- | --- | --- |
| **M0 sign-off** | Add focused automated auth tests: successful/failed login, normalization, temporary-password restriction, access-token validation, logout, password change, refresh rotation/reuse, rate-limit behavior, user provisioning/update restrictions, final-owner protection, audit writes, and authorization denials. | Existing API tests cover health/config rather than auth lifecycle. Authentication is security-critical; reading the implementation or passing compilation is not behavioral evidence. | Unit and database-backed integration tests run in CI, including positive and negative cases. |
| **M0 sign-off** | Team review and approval of the role/permission matrix. | The current grants are explicitly initial defaults and broad for privileged roles. Feature work must not silently treat them as approved policy. | Dated decision or approved issue/ADR, with each role and permission reviewed by the team. |
| **Before protecting real domain data** | Object-level checks for parents, students, teachers, classes, subjects, and assigned records. | These domain entities and relationships do not yet exist. A role permission alone does not restrict which records a user can access. | Domain service/repository scope checks plus tests for own/assigned records and cross-user denial before the endpoint is exposed. |
| **Before persistent web sessions** | Select and implement an approved browser session design, including same-site HttpOnly cookies and CSRF controls if cookies are selected. | Current web tokens are memory-only. Persisting bearer tokens in browser storage would change the threat model; no storage choice should be improvised while implementing UI. | Architecture decision, threat review, implementation, and browser tests for login, refresh, logout, CSRF/session behavior. |
| **Before production account operations** | Design password reset and invitation delivery; decide whether temporary passwords remain acceptable for the operational workflow. | User creation currently distributes a temporary password out of band. Email/SMS/provider and recovery policies are not yet specified. | Approved recovery/invitation policy, expiring single-use token design, abuse limits, audit events, and tests. |
| **Before production privileged access** | Define and implement MFA or an approved identity provider for privileged staff, including enrollment and recovery. | MFA is not implemented and requires a product/security decision about factors, enrollment, recovery, and lockout behavior. | Approved policy and tested enrollment, challenge, recovery, revocation, and administrative recovery flows. |
| **Before production release** | Review migrations on staging and rehearse backup/restore plus rollback or forward-fix. | CI migration application to a clean database is useful but does not reproduce production data volume, current schema state, deployment ordering, or recovery. | Staging run record, backup/restore evidence, compatibility plan, and approved rollback/forward-fix steps. |
| **Before production release** | Independent security review of auth, session, authorization, audit, and secrets handling. | Critical authentication changes require a reviewer who did not author the implementation. No review result is recorded in the repository yet. | Findings recorded and resolved or explicitly accepted by the designated human reviewer. |
| **Before adding additional auth languages/UI** | Add localized client-facing auth messages in English, Hindi, and Marathi. | API foundations exist, but auth UI integration is not part of the current test baseline; user-facing strings must follow the project's i18n convention. | UI strings use shared i18n resources and each supported locale is checked. |

Do not add public registration merely to complete “login and registration.” For a school ERP, staff-provisioned accounts can remain the intended workflow. Public registration needs an explicit product decision and verification process before implementation.

## 4. Recommended work sequence

1. **Freeze the shared auth contract.** Review endpoint payloads, error behavior, role names, permissions, and session behavior. Record decisions before web/mobile clients depend on them.
2. **Review role policy.** Vaibhav coordinates; Hariom and Om review access needs for their workflows. Approve the initial matrix and explicitly mark any permission that remains provisional.
3. **Add auth tests around the existing implementation.** Build tests against the public AuthService/controller/guard behavior. Use synthetic accounts and isolated test DB/Redis; do not weaken production controls to simplify test setup.
4. **Wire tests into CI.** Keep unit tests fast and add a dedicated PostgreSQL/Redis-backed integration test job only where the tests require those services. Keep secrets and real data out of CI fixtures.
5. **Integrate the login and account-provisioning UX.** Implement the chosen web session behavior and mobile secure storage behavior from the agreed contract. Do not introduce a new token persistence strategy independently in each client.
6. **For each domain module, add object scope with its data model.** The domain owner must protect service queries and test cross-record denial before exposing that module's API.
7. **Complete pre-release reviews.** Run the CI workflow, review all findings, rehearse migrations/recovery on staging, and obtain independent security approval before production use.

## 5. Developer handoff: areas to read and protect

Before changing authentication or authorization, read:

- `docs/AI_PROJECT_CONTEXT.md` and `docs/10_AI_CODING_RULES_MASTER.md` for architecture, critical-change controls, and completion evidence.
- `docs/06_SECURITY_PRIVACY_COMPLIANCE.md` and `docs/04_DATA_MODEL_AND_DATABASE_RULES.md` for privacy, access, and migration constraints.
- `docs/05_API_AND_INTEGRATION_CONTRACTS.md` for API contracts.
- `docs/M0_AUTHENTICATION_AND_ACCESS_CONTROL.md` for current route behavior, role defaults, and bootstrap steps.
- The auth, audit, configuration, and migration code listed below.

### Security invariants: do not casually change

- Never trust a role, permission, actor ID, or object scope supplied by a client. Derive identity and permissions from the validated server-side session.
- Do not mark a route public to make a client integration work. Every route needs an intentional public, authenticated, or permission-required policy.
- Do not remove the global guards or allow routes without an explicit policy.
- Do not store refresh tokens in plaintext. Keep access tokens short-lived and preserve server-side revocation semantics unless an approved design changes them.
- Do not log passwords, access/refresh tokens, private keys, or sensitive personal data. Audit metadata must be deliberately minimized.
- Do not silently swallow audit-write failures for sensitive operations.
- Do not weaken Redis fail-closed login throttling without an explicit security decision and compensating control.
- Do not enable TypeORM schema synchronization. Schema changes require reviewed migrations.
- Keep privileged-role provisioning rules and final-owner protection covered by tests when changing account management.
- Do not claim authentication is production-ready based solely on CI green status. Staging, security review, recovery, operational secrets, and human release approval remain separate gates.

### Files and likely change ownership

Agree on one owner per task before editing. The table is a coordination aid, not permission to change critical behavior without review.

| Area | Main files | Coordination note |
| --- | --- | --- |
| Auth endpoints and DTOs | `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/dto/*` | Coordinate API contract changes with web/mobile before merge. |
| Passwords, tokens, sessions, users | `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/entities/*` | Critical security/data change; one author, independent reviewer, tests required. |
| Route policy | `apps/api/src/auth/auth.decorators.ts`, `auth.guard.ts`, `authorization.guard.ts`, `auth.module.ts` | Shared API-wide behavior. Do not have separate feature branches modify guards concurrently. |
| Permission vocabulary and defaults | `apps/api/src/auth/auth.permissions.ts`, shared permission contracts under `packages/contracts` | Agree on names and policy before changing API and clients; avoid duplicate permission enums. |
| Rate limiting/config | `apps/api/src/auth/auth-rate-limit.service.ts`, `apps/api/src/config/*`, `.env.example` | Never commit `.env` or secrets. Coordinate Redis/key behavior with platform owner. |
| Audit | `apps/api/src/audit/*`, audit migration | Append-only and privacy-sensitive. Avoid changing audit schema or event names without review. |
| Database migrations | `apps/api/src/database/migrations/*`, `data-source.ts` | Each migration has one author and one database reviewer. Never edit an already shared migration; add a forward migration. |
| Web/mobile session clients | `apps/web/*`, `apps/mobile/*` | Agree on session contract first. Avoid simultaneous changes to shared auth client types without contract ownership. |
| CI | `.github/workflows/ci.yml`, workspace scripts | Coordinate additions to avoid duplicate service setup and inconsistent Node/pnpm versions. |
| M0 reference docs | `docs/M0_AUTHENTICATION_AND_ACCESS_CONTROL.md`, this report | Update implementation status when code changes; distinguish implemented, tested, and reviewed. |

## 6. Conflict-safe team workflow

1. **Create a narrowly scoped issue or task** with one owner, one reviewer, acceptance criteria, and named files/modules. Avoid a shared “finish all auth” task.
2. **Use separate branches and small PRs.** Do not edit the same auth service, guard, migration, and CI file from multiple branches at once.
3. **Sequence shared contracts first.** Permission names, response DTOs, token/session shape, and route policy are API contracts; merge and communicate these before parallel web/mobile work.
4. **Assign a single migration owner.** Reserve the next migration timestamp together. If a migration has been shared or merged, correct it with a new migration, not by rewriting history.
5. **Keep domain authorization with the domain owner.** The auth foundation provides identity and coarse permissions; each domain owner implements and tests record-level scope in that domain's service.
6. **Avoid broad refactors during feature work.** If a shared refactor is needed, give it a separate PR and wait for it to merge before rebasing feature branches.
7. **PR description must state:** changed contract/files, migration impact, tests actually run, authorization cases covered, localization impact, risks, and human reviewers needed.
8. **Merge only after required checks and review.** CI passing is necessary but does not replace the required human security/database review for critical changes.
9. **Update this report and the M0 reference together** when behavior or status changes, so developers do not follow stale instructions.

### Suggested ownership for M0 follow-up

- **Vaibhav (platform/auth owner):** coordinate the auth contract, CI integration, service/guard test plan, and completion status.
- **Hariom and Om (module/client reviewers):** review role/permission needs for their workflows; identify the smallest permissions each feature needs; avoid independently changing shared guard behavior.
- **Independent reviewer:** review auth/session/migration changes and verify negative authorization tests. The author should not be the only reviewer.

The team should confirm these assignments in the task tracker before work begins. A person may implement a change and another may review it; module ownership does not waive review requirements.

## 7. M0 completion checklist

Mark an item complete only when its evidence exists; do not infer completion from code presence alone.

- [ ] Role/permission matrix reviewed and approved by the team.
- [ ] Auth service, session rotation/reuse, logout, password change, provisioning, rate limiting, audit, and guard denial tests added and passing in CI.
- [ ] API contract is documented and web/mobile clients use it consistently.
- [ ] Browser session-storage design is approved before persistent web login is shipped.
- [ ] Domain object-scope checks are implemented and tested before each domain endpoint exposes sensitive records.
- [ ] MFA and account recovery/invitation decisions are recorded; required production flows are implemented and tested.
- [ ] PostgreSQL migrations apply in CI; staging forward/rollback or forward-fix and backup/restore rehearsal are evidenced.
- [ ] Independent security and database reviews are complete; findings are resolved or explicitly risk-accepted.
- [ ] No secrets or real student/family data are used in source, tests, logs, or CI.
- [ ] CI, staging, monitoring, secret management, and release approval gates are satisfied before anyone calls the system production-ready.

## 8. Current conclusion

**M0 status: partially implemented.** The repository contains substantial authentication and access-control code, but the milestone is not complete until the test, policy-review, and staging/security-review evidence is present. MFA, recovery, and browser session persistence can be phased with the product flows, but must be decided and completed before the corresponding production use. Object scope is a per-domain release gate, not something to postpone until after domain data is exposed.
