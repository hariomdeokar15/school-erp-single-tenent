# SchoolERP India — Build Roadmap After Foundation Folder Structure

## Operating method

Each numbered item is a **small deliverable**, not a request to build an entire module. Follow this fixed sequence:

```text
Task assessment -> approved contract -> database/migration -> backend + tests
-> web/mobile in parallel -> integration -> staging/E2E -> review -> merge
```

Do not begin a later step while the current dependency is unresolved.

## Phase 0 — Foundation completion

| ID   | Task                              | Risk     | Main deliverable                                                                  |
| ---- | --------------------------------- | -------- | --------------------------------------------------------------------------------- |
| M0.1 | Repository hardening verification | Critical | Verify current structure, scripts, docs and no secrets                            |
| M0.2 | Environment/config validation     | Critical | Zod/Joi config, `.env.example`, dev/staging/prod separation                       |
| M0.3 | Database/TypeORM baseline         | Critical | Data source, migration workflow, AuditEvent table, test DB approach               |
| M0.4 | API platform baseline             | High     | validation pipe, safe errors, correlation IDs, health/db/redis endpoints, OpenAPI |
| M0.5 | React/Vite and Expo baseline      | Standard | API clients, health status, error/loading state, en/hi/mr switchers               |
| M0.6 | CI/CD safety gates                | Critical | lint/typecheck/tests/builds/Gitleaks/Semgrep/Trivy/Dependabot/CODEOWNERS          |
| M0.7 | Observability baseline            | High     | structured logs, Sentry placeholders, health/readiness, queue error strategy      |

**Phase gate:** local setup documented; API/web/mobile build; CI runs; health checks work; no secrets; all language skeletons work.

## Phase 1 — Identity, roles and academic masters

| ID   | Task                               | Risk     | Main deliverable                                                    |
| ---- | ---------------------------------- | -------- | ------------------------------------------------------------------- |
| M1.1 | User/role/permission data model    | Critical | migrations/entities/enums/audit foundation                          |
| M1.2 | Staff authentication               | Critical | Argon2id password/session/JWT RS256 service and tests               |
| M1.3 | Guardian OTP authentication        | Critical | rate-limited OTP flow, sessions and tests; no live SMS provider yet |
| M1.4 | RBAC guards/decorators             | Critical | role/action/object-scope enforcement and negative tests             |
| M1.5 | Academic-year/term contract        | High     | entities/DTOs/OpenAPI/migrations                                    |
| M1.6 | Class/section/subject backend      | High     | secured CRUD, audit, tests                                          |
| M1.7 | Teacher assignment backend         | High     | scope assignment and tests                                          |
| M1.8 | Academic masters web screens       | Standard | admin setup UI, en/hi/mr                                            |
| M1.9 | Academic masters mobile read views | Standard | safe mobile display if needed                                       |

**Phase gate:** staff roles work; authorized users can set up academic year/classes/sections/subjects; unauthorized roles are denied.

## Phase 2 — Student foundation and admissions

| ID    | Task                                      | Risk     | Main deliverable                                               |
| ----- | ----------------------------------------- | -------- | -------------------------------------------------------------- |
| M2.1  | Student/guardian/enrollment data model    | Critical | migrations, constraints, status lifecycle                      |
| M2.2  | Student/guardian secured backend          | High     | CRUD/scopes/audit/tests                                        |
| M2.3  | File storage abstraction                  | Critical | local/S3 adapter, private files, signed URLs, scan-state model |
| M2.4  | Admission application contract and schema | Critical | application/guardian/document/consent state model              |
| M2.5  | Public admission submission API           | Critical | validation, rate limits, consent, audit, tests                 |
| M2.6  | Admission document upload workflow        | Critical | permission/file checks, private storage, scan state            |
| M2.7  | Admission review and decision API         | High     | authorized review/waitlist/reject/approve                      |
| M2.8  | Approved application conversion           | Critical | idempotent transaction creates student+guardian+enrollment     |
| M2.9  | Admissions officer web screens            | High     | queue, review, safe document view                              |
| M2.10 | Parent mobile admission flow              | High     | form, draft/resume, upload/status                              |
| M2.11 | Admission E2E/staging test                | Critical | submit -> review -> approve -> exactly one enrollment          |

**Phase gate:** approved application reliably creates exactly one enrolled student; documents private; no duplicate conversion.

## Phase 3 — Fees and payments

| ID    | Task                                     | Risk     | Main deliverable                                     |
| ----- | ---------------------------------------- | -------- | ---------------------------------------------------- |
| M3.1  | Fee heads/plans data model               | Critical | money precision/constraints/migration                |
| M3.2  | Invoice/adjustment model and API         | Critical | transaction/audit/approval model                     |
| M3.3  | Invoice generation job                   | High     | idempotent queued generation and exception reporting |
| M3.4  | Parent invoice view APIs                 | High     | linked-child scope/pagination                        |
| M3.5  | Razorpay order creation                  | Critical | server-derived amount/order mapping/tests            |
| M3.6  | Razorpay webhook handler                 | Critical | raw signature/idempotency/transaction/replay tests   |
| M3.7  | Receipt generation and storage           | Critical | unique receipt + async PDF/private access            |
| M3.8  | Accountant web collection/reconciliation | High     | dashboards/exceptions/export access                  |
| M3.9  | Parent web/mobile payment flow           | Critical | checkout integration only; safe result handling      |
| M3.10 | Payment E2E/staging reconciliation       | Critical | order -> captured webhook -> one receipt -> audit    |

**Phase gate:** payment can be safely reconciled; no duplicate financial effects; receipt works.

## Phase 4 — Attendance and communication

| ID   | Task                              | Risk | Main deliverable                                     |
| ---- | --------------------------------- | ---- | ---------------------------------------------------- |
| M4.1 | Attendance session/record model   | High | constraints/statuses/migration                       |
| M4.2 | Teacher attendance API            | High | assignment scope, bulk validation, audit             |
| M4.3 | Teacher mobile attendance UI      | High | all-present/exceptions/loading/retry                 |
| M4.4 | Offline attendance queue/sync     | High | idempotency/conflict/retry tests                     |
| M4.5 | Attendance correction/report APIs | High | reason/permission/audit                              |
| M4.6 | Notification core/FCM adapter     | High | provider queue, minimal payloads, retry/failure logs |
| M4.7 | Absence alert job                 | High | preference/language/relationship checks              |
| M4.8 | Notice backend/web/mobile         | High | targeting/delivery/read status                       |
| M4.9 | Attendance/alert E2E tests        | High | mark absent -> correct guardian alert                |

**Phase gate:** teacher can reliably mark attendance; offline sync avoids duplicates; alerts go only to correct guardians.

## Phase 5 — Homework and exams

| ID    | Task                             | Risk     | Main deliverable                                       |
| ----- | -------------------------------- | -------- | ------------------------------------------------------ |
| M5.1  | Homework/assignment backend      | High     | teacher-scope, due dates, private attachments          |
| M5.2  | Homework web/mobile views        | Standard | teacher create, parent/student view/submission         |
| M5.3  | Submission upload workflow       | Critical | private files, validation, authorization               |
| M5.4  | Exam/assessment/grade model      | High     | migration/constraints/grade configuration              |
| M5.5  | Marks entry API                  | High     | teacher scope/validation/draft-submit flow             |
| M5.6  | Marks approval and audit         | Critical | return/approve/preserve history                        |
| M5.7  | Report-card calculation service  | High     | backend-only deterministic rules + unit tests          |
| M5.8  | Async PDF report-card generation | High     | queue/template version/storage                         |
| M5.9  | Publish/report access web/mobile | High     | authorized publish, parent only published linked child |
| M5.10 | Exams/report-card E2E            | Critical | entry -> approval -> PDF -> publish -> parent view     |

## Phase 6 — Transport

| ID   | Task                                  | Risk     | Main deliverable                                          |
| ---- | ------------------------------------- | -------- | --------------------------------------------------------- |
| M6.1 | Vehicle/route/stop schema and APIs    | High     | CRUD/scopes/constraints                                   |
| M6.2 | Student transport assignment          | High     | capacity/assignment/audit                                 |
| M6.3 | Transport web and parent mobile views | Standard | route/stop/assignment info                                |
| M6.4 | Transport fee integration             | Critical | explicit invoice rule only after finance review           |
| M6.5 | Optional GPS provider spike           | High     | ADR, privacy/security/provider test before implementation |

## Phase 7 — Hardening and release

| ID   | Task                                       | Risk     | Main deliverable                                         |
| ---- | ------------------------------------------ | -------- | -------------------------------------------------------- |
| M7.1 | Full RBAC/object-scope test suite          | Critical | automated authorization matrix tests                     |
| M7.2 | Load/performance test suite                | High     | attendance, payments, admissions, report-card peak tests |
| M7.3 | Accessibility/browser/device QA            | High     | web browser + Android/iOS matrix                         |
| M7.4 | Backup/restore and disaster-recovery drill | Critical | evidence-based restore exercise                          |
| M7.5 | Security assessment/penetration test       | Critical | findings/remediation plan                                |
| M7.6 | School data migration rehearsal            | Critical | synthetic/masked rehearsal, reconciliation and rollback  |
| M7.7 | Pilot release/staging UAT                  | High     | selected staff/parents, issue triage                     |
| M7.8 | Production release                         | Critical | checklist/approvals/monitoring/rollback                  |

## Parallel development rule

Backend and web/mobile may run in parallel only after the contract is agreed.

```text
1. Contract/DTO/OpenAPI approved
2. Backend entity/migration/API/tests implemented
3. Web + mobile build against approved contract mocks
4. API integration replaces mocks
5. E2E/staging verifies the complete flow
```

Never allow UI work to invent endpoint behavior or business rules. Never let backend silently break a published contract.
