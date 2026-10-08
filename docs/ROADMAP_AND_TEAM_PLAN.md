# SchoolERP Roadmap and Three-Member Work Plan

Status: Proposed planning baseline
Scope: One-school SchoolERP India MVP
Owners: Vaibhav, Hariom, and Om

This roadmap follows `00_README.md`, ADR-001, and `08_DELIVERY_TESTING_DEPLOYMENT.md`. It preserves the documented module order while allowing parallel work inside a milestone after contracts and dependencies are agreed. Dates and estimates remain TBD until the team sizes the work.

## Team ownership

Every module owner is responsible for its end-to-end vertical slice: API, its owned persistence changes, web/mobile integration as applicable, shared contracts/i18n, tests, documentation, and operational visibility. The platform owner coordinates integration but does not take over another owner's module implementation.

| Team member | Primary ownership | Main responsibilities |
| --- | --- | --- |
| **Vaibhav â€” Platform and finance** | M0 platform foundation; M3 fees/payments; shared CI/release integration | Workspace/build/runtime baseline, API-wide conventions, authentication and authorization foundation after approval, configuration, audit/error/health/queue patterns, finance and payment workflows, CI coordination, release readiness. |
| **Hariom â€” Academic lifecycle** | M2 academic/student masters; M1 admissions; M7 exams/report cards | Academic structures, student/guardian/enrollment lifecycle, admissions-to-enrollment conversion, assessment setup, marks, report-card workflow. |
| **Om â€” Daily school operations** | M4 attendance; M5 communication; M6 homework; M8 transport | Class attendance and sync, notices/notification workflows, assignments/submissions, transport routes/stops/assignments, relevant mobile-first workflows. |

These are ownership areas, not permission to implement critical changes without approval. Authentication/RBAC, admission conversion/consent, payment/refund/webhook, sensitive data migrations, file access, and production infrastructure require the explicit human approval described in `10_AI_CODING_RULES_MASTER.md`.

## Milestone roadmap

| Milestone | Work and owner | Depends on | Exit gate |
| --- | --- | --- | --- |
| **0. Plan and baseline** | All agree on backlog, user/permission matrix, domain vocabulary, integration rules, and acceptance criteria. Vaibhav leads repeatable install/build/typecheck/migration/CI setup; Hariom and Om document domain workflows and UI needs for their modules. | None | A clean developer setup and the existing health app can be built/run from written steps; known failures are recorded; CI checks have named owners. |
| **1. M0 platform foundation** | Vaibhav leads configuration, API conventions, correlation/error handling, health, audit, queue/feature-flag patterns, authentication/session/RBAC design and implementation. Hariom and Om review role/object scopes and integrate approved shared contracts into their client shells. | Milestone 0; explicit approval for critical auth/security work | Login/session lifecycle and server-side authorization have positive and negative tests; audit and safe-error conventions are usable by feature modules; English/Hindi/Marathi client shells work. |
| **2. M2 academic and student masters** | Hariom leads academic years/terms, classes/sections/subjects, teacher assignments, student/guardian, enrollment, status, promotion and archive. Vaibhav and Om integrate platform/API conventions and web/mobile flows. | M0 | Authorized staff can manage validated academic/student records; relationships and uniqueness are enforced; role/object-scope tests pass. |
| **3. M1 admissions** | Hariom leads draft/resume, guardian verification, document/consent records, review, decisions, and exactly-once conversion to student/guardian/enrollment. Vaibhav reviews transactions, audit, and authorization; Om integrates agreed family/staff UI and notifications hooks. | M0 and M2; explicit approval for consent, sensitive data, and conversion | Synthetic end-to-end admission flow passes; duplicate/retry and unauthorized cases are tested; conversion is transactional/idempotent; document access remains private. |
| **4. M3 fees and payments** | Vaibhav leads fee heads/plans, schedules, concessions, invoices, payment orders, verified webhooks, receipts, refunds/manual receipts, reconciliation, and reminders. Hariom and Om integrate student/admission and parent-facing contracts. | M0, M2, and M1 as needed; explicit approval for financial implementation | Amount is server-derived; money is fixed precision/integer paise; raw-body signature verification, event uniqueness, idempotency, transaction and replay/invalid-payment tests pass; finance audit trail is complete. |
| **5. M4 attendance** | Om leads daily/period sessions, all-present-then-exceptions, correction workflow, teacher assignment scope, offline queue/sync, absence alerts, and reports. Vaibhav and Hariom support API/data and roster integration. | M0 and M2 | A teacher can mark a normal class quickly; assignment scope, duplicates, corrections, offline retry, and parent visibility are tested. |
| **6. M5 communication and M6 homework** | Om leads notices, preferences, notification delivery/retries, assignments, attachments, visibility and submissions. Vaibhav and Hariom support provider/queue contracts and class/student relationships. | M0 and M2; M4 for attendance-triggered notices | Provider failures/retries are observable; recipients and file access are rechecked server-side; homework and notices respect class/guardian scope and language preferences. |
| **7. M7 exams/report cards and M8 transport** | Hariom leads assessments, grade scales, marks, approvals, queued PDF generation and publication. Om leads vehicles, drivers/attendants, routes/stops/capacity and student assignments. Vaibhav supports queues, private file delivery and fee linkage. | M0 and M2; M1/M3 where records or fee links are required | Marks and publication permissions are tested; PDFs are generated asynchronously and delivered privately; route capacity and student assignments are validated and auditable. |
| **8. Integrated hardening and release readiness** | All owners resolve integration defects and complete docs, monitoring, security review, accessibility/localization, performance checks, backups/restore rehearsal, migration plan, staging E2E, and release notes. Vaibhav coordinates gates; named human reviewers approve critical areas. | All MVP modules | CI/security gates pass; staging workflows and recovery plan are evidenced; critical findings are resolved or explicitly risk-accepted; named human release approver authorizes release. |

Milestone sequencing follows the product docs. Later milestones may be prepared in parallel (design, contracts, test plans) but must not ship against unstable upstream contracts or bypass the dependency exit gates.

## Integration rules for all three members

1. **One ticket, one module owner.** Agree on an owner and reviewer before implementation. Do not have two members edit the same module or migration concurrently.
2. **Contract first.** Agree on DTOs, endpoint behavior, error codes, permissions, pagination, and i18n keys before clients integrate. Put shared types in `@schoolerp/contracts`; API remains the source of business rules.
3. **Module boundaries.** Each module owns its tables/repositories and exposes another module's data only through an agreed service/event/contract. Cross-module writes require an explicit transaction design.
4. **Migration ownership.** The module owner writes and documents its migration. A second reviewer checks constraints, data sensitivity, backward compatibility, and rollback/forward-fix before merge. Never use production schema synchronization.
5. **Small pull requests.** Branch from the agreed integration branch; keep PRs focused; include acceptance criteria, migration notes, screenshots or API examples using synthetic data, checks actually run, and known risks. No direct pushes to protected branches.
6. **Shared conventions.** Use agreed naming, error/correlation format, audit metadata, loading/error/empty/retry/forbidden states, en/hi/mr translations, and API pagination. Do not introduce dependencies/frameworks without review.
7. **Review critical work.** The module owner cannot be the only reviewer for critical auth, payments, privacy, migration, file, or infrastructure work. Obtain the required explicit approval before coding and designated review before merge.
8. **Integration cadence.** Integrate small changes frequently through CI. Resolve contract changes with affected owners before merging; do not leave long-lived branches with private API assumptions.
9. **Synthetic data only.** Never put real children/family data, credentials, identity documents, OTPs, or payment payloads into prompts, fixtures, screenshots, logs, or PRs.
10. **Definition of done.** A feature includes API, relevant web/mobile clients, positive and negative tests, localization, documentation, audit/security controls, monitoring, and observed failure/retry behavior. A happy-path demo alone is not completion.

## First team meeting outputs

- Confirm each owner/reviewer assignment.
- Name the product owner, security/privacy reviewer, database reviewer, and human release approver; one person may hold multiple roles if qualified.
- Confirm target school workflows, supported devices, language defaults, data retention/consent policy, and MVP exclusions.
- Size Milestone 0 and record known baseline issues before feature implementation.
- Create a prioritized backlog with one module/acceptance outcome per ticket and explicit dependencies.
- Record decisions that change ADR-001 or sensitive policy as proposed ADRs/change requests before implementation.

## Source of truth

This plan assigns team ownership; it does not replace requirements or approvals. Refer to:

- `00_README.md` for scope and official module order.
- `02_MODULE_REQUIREMENTS_AND_WORKFLOWS.md` for module workflows and cross-module acceptance.
- `04_DATA_MODEL_AND_DATABASE_RULES.md` and `05_API_AND_INTEGRATION_CONTRACTS.md` for persistence and API rules.
- `06_SECURITY_PRIVACY_COMPLIANCE.md` and `10_AI_CODING_RULES_MASTER.md` for security, privacy, critical-task approval, and AI workflow.
- `08_DELIVERY_TESTING_DEPLOYMENT.md`, `09_REPORTS_AUTOMATION_AND_OPERATIONS.md`, and `11_PROJECT_TRACKING_AND_GOVERNANCE.md` for CI, operations, release and change-control gates.
