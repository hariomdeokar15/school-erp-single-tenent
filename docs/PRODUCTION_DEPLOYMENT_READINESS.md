# Production Deployment Readiness and Current Development Status

**Document status:** deployment checklist and status snapshot  
**Reviewed:** 24 November 2026  
**Current release status:** not approved for production deployment  
**Scope:** SchoolERP API/web deployment, with specific notes for account email verification and password recovery.

This document records the recovery work completed so far and the work that remains before a production launch. It is an operational checklist, not a claim that the application has passed a production security review. Complete and sign off each gate for the actual hosting environment and school deployment model.

## 1. Current development status

### Implemented in the working tree

- Email verification enrollment requires an authenticated user to re-enter the current password. Verification is sent only to the email already stored on that account.
- Forgot-password requests return a generic response. Recovery requires an active account with a verified email address.
- Reset and verification links use random one-time tokens. Only token hashes are stored in their token tables; links are short lived and checked against the account email version.
- A database trigger invalidates verification/reset state and queued link payloads when the account email changes.
- The encrypted PostgreSQL outbox stores recovery mail payloads under AES-256-GCM. A database polling worker uses row locks, leases, bounded retries, and cleanup. The local `test` transport stores messages in process memory and does not deliver them.
- Successful password reset revokes the account's sessions and queues a completion notice. Authenticated password changes also invalidate outstanding reset links.
- Live Brevo delivery is disabled unless explicitly configured and opted into. No provider was configured and no real message was sent as part of the work so far.
- Staff-assisted account recovery is out of scope and remains a separate task requiring its own policy and approval.
- The separate session-storage discrepancy remains open: the web client stores the refresh token and cached user in `sessionStorage`, while the access token is held in memory. This task did not redesign session storage.

### Verification evidence and open development work

- Previous local checks reported passing API/web typechecks, lint, builds, and unit tests. The API tests reported five test files and 14 passing tests; web and localization tests also passed. These were local checks, not a production-like acceptance run.
- On 24 November 2026, all six existing migrations were applied to a newly created, localhost-only disposable PostgreSQL database. The auth-recovery migration was then rolled back and reapplied successfully. That temporary database container was removed afterward. No shared or production database was used.
- Real PostgreSQL integration tests for concurrent redemption, transaction rollback, token invalidation, and session revocation have not yet been added and run.
- The complete browser flow (verify email → request reset → set password → sign in) has not yet been run end to end against a local API and non-delivering sink.
- Coverage still needs explicit verification for unknown/disabled accounts, rate limits, Redis failure, old access/refresh sessions, and authenticated password changes.
- Security scans and production/staging validation have not been completed for this deployment. Do not treat the prior build/unit-test results as a substitute.

### Development recovery-key startup error

The API error `The active email outbox encryption key is unavailable` means the key named by `EMAIL_OUTBOX_ACTIVE_KEY_VERSION` is missing from `EMAIL_OUTBOX_KEYS` or the settings are malformed. For local development, generate a 32-byte key and configure both settings in the root `.env` using the same key version. Keep `EMAIL_TRANSPORT=test` and `ALLOW_LIVE_EMAILS=false`. The root `.env.example` is a template; the API uses the actual root `.env`. Never use the local key in production.

## 2. Decide the school tenancy model before launch

The architecture documentation currently describes a modular monolith for **one school**, and the repository/workspace is named `school-erp-single-tenent`. Do not assume that running multiple copies or adding a school selector provides secure multi-school isolation. No multi-tenant production guarantee is made by this status document.

Choose and document one launch model before production work:

1. **Dedicated deployment per school:** separate application configuration, database, storage namespace/bucket, keys, and provider settings per school. This reduces cross-school data exposure risk but requires repeatable provisioning, upgrades, monitoring, and support for every installation.
2. **Shared multi-tenant service:** requires a reviewed tenant model and explicit tenant identity on every tenant-owned record and request path, server-enforced authorization and query scoping, tenant-aware background jobs and files, tenant isolation tests, onboarding/offboarding, per-tenant retention/export/deletion, and a migration plan. Consider database row-level security only as an additional defense, not as a substitute for application authorization. Do not sell or populate a shared service until this design and its tests are complete.

In either model, define who owns each school tenant, how a user can belong to one or more schools, how administrators are scoped, how support staff access is approved/audited, and how tenant-specific email domains, branding, language, and data retention work. Have the resulting design reviewed before implementing shared tenancy.

## 3. Required work before any production deployment

### A. Finish development acceptance

- Add and run real PostgreSQL integration tests for concurrent single-use token redemption, transaction rollback, email-change token/outbox invalidation, and revocation of existing sessions.
- Run the full browser workflow against local PostgreSQL and the non-delivering in-memory sink. Demonstrate that a verification message can be obtained only through an in-process development/test harness; there must be no public route or log output exposing the link.
- Exercise unknown, disabled, and unverified accounts and verify externally visible responses do not reveal account existence.
- Exercise account and layered IP/burst rate limits, including a Redis outage. Verify behavior is fail-closed or otherwise explicitly safe and documented; do not trust forwarded IP headers unless the deployment proxy chain is narrowly configured and verified.
- Test existing access and refresh sessions before/after password reset and authenticated password change. Confirm revoked refresh tokens cannot create new sessions and define/test how already-issued access tokens are rejected or expire within the intended window.
- Test worker concurrency, lease expiry/crash recovery, bounded retries, delayed messages that arrive after token expiry, payload erasure, key rotation, and duplicate provider sends. A duplicate email must never make a token redeemable twice.
- Run the full workspace CI gates: formatting, lint, typecheck, builds, unit/integration/E2E, API contract checks, migration review, and localization checks.
- Resolve or explicitly accept findings from code review and security scans. Review dependencies and lockfiles for known vulnerabilities; run secret scanning, SAST, and container/image scanning on the exact release artifacts.
- Review audit failure handling and transaction boundaries for success/failure events. Confirm sensitive values (passwords, raw tokens, full links, API keys, database URLs) never enter logs, traces, support tools, or analytics.

### B. Prepare production infrastructure

- Create separate development, staging, and production accounts/projects, networks, databases, Redis, object storage, secrets, email credentials, and monitoring. Do not reuse local/staging data or credentials in production.
- Use supported, patched, pinned runtime and database versions. Build immutable API and web artifacts in CI; deploy by artifact digest rather than rebuilding on a production host.
- Place the API and database on restricted networks. Expose only the required HTTPS entry point. Restrict database/Redis access to application and operations identities; require TLS where supported and strong authentication.
- Use managed PostgreSQL with encrypted storage, automated backups and point-in-time recovery if available. Define recovery point/time objectives and perform a restore drill before launch. Keep backups access-controlled and encrypted.
- Use a managed Redis or equivalent with authentication, network restrictions, persistence/availability settings appropriate to rate limits and other application work. Decide and test the behavior if Redis is unavailable.
- Configure HTTPS certificates, HSTS, security headers, restrictive CORS for the actual web origins, and a narrowly scoped reverse proxy/load balancer. The API currently sets Express `trust proxy=false`; if a proxy is used, implement and test an explicit trusted-proxy configuration before relying on client IPs for limits or audit events.
- Set production-only domains, API/web URLs, CORS allowlist, and `AUTH_FRONTEND_ORIGIN`. The frontend origin must be a fixed HTTPS origin in production; recovery links must not point to localhost or an untrusted host.
- Establish monitoring and alerting for API health/errors/latency, database capacity and failures, Redis failures, queue/outbox backlog and age, retry/expiry/failure counts, email provider quota/errors, authentication abuse, and backup/restore status. Ensure dashboards and alerts do not include secrets or recovery URLs.
- Define incident response owners and an on-call path. Document provider outage, key compromise/loss, credential rotation, data restore, tenant data exposure, and rollback procedures.

### C. Provision secrets and encryption keys

- Generate separate high-entropy production JWT signing keys and outbox encryption keys. Use a secret manager/KMS and workload identity where possible; restrict secret access to the API process and authorized operators.
- Do not use `.env.example` values, development `.env` files, local test keys, sample database credentials, or secrets copied from another school/environment.
- Set `EMAIL_OUTBOX_ACTIVE_KEY_VERSION` and `EMAIL_OUTBOX_KEYS` so the active version exactly matches a valid canonical Base64 encoding of 32 random bytes. Keep keys out of source control, build output, support bundles, and ordinary logs.
- Define key backup, access review, rotation, and retirement procedures. During rotation, deploy old and new keys together, switch the active version, verify old outbox rows remain readable, and remove an old key only after all payloads encrypted with it have been erased or re-encrypted. Test recovery from a lost/compromised key.
- Use separate keys per environment and, for a shared multi-tenant product, decide whether each school requires a separate data-encryption key and how cryptographic erasure is performed.
- Rotate all default/development credentials and remove secrets from deployment definitions. Confirm secret scanning is clean before release.

### D. Configure transactional email deliberately

- Keep `EMAIL_TRANSPORT=test` in local development. It is an in-process, non-delivering sink and its messages disappear when the API process stops. It is not an operator inbox and must not be exposed via an unauthenticated API endpoint or logs.
- Before live delivery, manually activate the chosen provider and configure a verified sender and authenticated domain. Verify DNS and sender ownership, domain alignment, bounce handling, suppression, provider account security, quota, and account recovery contacts.
- For the currently preferred Brevo Free option, verify the current free quota and transactional email activation directly in the provider account before launch; do not rely on a historical quota estimate. Keep paid usage disabled unless separately approved.
- Review provider handling of message logs and previews. Set the shortest suitable retention, disable storage of previews containing recovery links, and disable open/click tracking for sensitive recovery messages. The current code's provider behavior and configuration must be rechecked against the selected account and provider API before enabling it.
- Configure production secrets for the provider API key and sender. Keep `ALLOW_LIVE_EMAILS=false` until configuration, security review, staging tests, and explicit release approval are complete. The `BREVO_SENSITIVE_RETENTION_CONFIRMED` setting is an operator attestation, not proof that account settings were actually reviewed.
- Test only with designated test accounts and explicit approval. Confirm generic responses, link expiry, link redemption, delayed delivery after expiry, and provider failure behavior. Monitor provider acceptance and actual delivery/bounce outcomes separately; an accepted API request does not guarantee inbox delivery.

### E. Verify database migrations and rollback

- Rehearse all pending migrations against a fresh disposable database and a sanitized copy representative of production. Review generated SQL and migration code, locking, runtime, indexes, constraints, trigger behavior, and compatibility with the currently deployed application version.
- For each release, take/verify a recoverable backup and confirm the restore path. Record the expected migration duration, lock impact, rollback method, and person responsible.
- Apply migrations as a controlled release step using a least-privilege migration identity. Keep TypeORM `synchronize` disabled. Do not run a destructive rollback against production as an experiment; prefer a forward corrective migration where data has been written.
- Deploy in an expand/migrate/contract sequence when schema changes need compatibility across old/new application versions. Verify application health and critical read/write paths after each migration step.
- Preserve migration logs and record the exact release, migration version, backup reference, operator, and outcome without recording secrets or personal data.

### F. Validate privacy, legal, and school operations

- Map personal data, including children’s records, identifiers, guardian contact data, documents, authentication data, audit trails, and backups. Document purpose, access, retention, deletion, export, correction, and data-subject request workflows.
- Obtain qualified legal/privacy review for each target jurisdiction and the school’s role/responsibilities before processing student data. Confirm notices, required guardian consent/verification, vendor contracts, data residency/transfer terms, breach response, retention, and school-specific obligations with counsel; this checklist is not legal advice.
- Define school onboarding, authorized administrator verification, staff onboarding/offboarding, role review, support access approvals, and customer data export/termination procedures.
- MFA for privileged staff is not implemented according to the current auth documentation. Decide whether it is a launch blocker; implement and test MFA or an approved identity provider before production if required by the risk assessment.
- Define a separate approved policy and workflow for staff-assisted account recovery before offering it. It is not part of the current implementation.

## 4. Staging release checklist

- Deploy the exact candidate artifacts to staging with production-like network controls and separate credentials.
- Apply migrations to staging after backup and rehearsal. Verify schema, indexes, triggers, and rollback/forward-repair instructions.
- Run smoke, regression, authorization/tenant-isolation, browser/mobile, load, accessibility/localization, and security tests. Include concurrent login/recovery and worker restart/failure scenarios.
- Validate sender configuration and email deliverability using approved test recipients; verify messages do not leak through logs, provider previews, analytics, or support dashboards.
- Check alerts, dashboards, audit events, backup/restore, rate limits, trusted proxy behavior, and rollback using the actual staged deployment topology.
- Record unresolved risks, owners, due dates, and explicit acceptance from product, security, operations, and school/customer stakeholders.

## 5. Production deployment sequence

1. Confirm the tenancy architecture and release scope are approved for the customer(s) being onboarded.
2. Confirm the release gate: test and scan evidence, resolved/accepted risks, approved privacy/vendor review, verified backups, tested rollback, monitoring, and named on-call/incident owners.
3. Freeze and identify the reviewed source revision and immutable artifact digests. Verify secret scanning on the exact artifacts and repository revision.
4. Provision isolated production resources and secrets. Validate configuration without printing secret values. Keep live email off until the explicit mail-activation gate.
5. Take a final backup and verify it. Run the approved migration plan using the migration identity.
6. Deploy the API and web artifacts using the approved gradual/canary process if supported. Keep feature flags and live email disabled initially where possible.
7. Run production smoke tests using controlled accounts and non-sensitive data. Verify HTTPS, CORS, sign-in, authorization, database connectivity, Redis behavior, audit events, worker health, and error/latency alerts.
8. Enable real email only after provider setup is complete, provider settings and sender are rechecked, staging delivery passed, and a named approver explicitly authorizes the production test/send. Start with designated recipients and monitor delivery, bounces, quota, errors, and outbox state.
9. On any release-gate failure, stop rollout; follow the tested rollback or forward-fix plan. Do not improvise destructive data rollback.
10. Record deployment version, migration, approvals, test results, configuration version (not secret values), outcome, and follow-up tasks.

## 6. Post-deployment operations

- Monitor error budgets, authentication abuse, outbox backlog/age/failures, delivery/bounces, database/Redis capacity, backup health, certificate expiry, and provider quota.
- Reconcile provider events with accepted messages while preserving privacy. Investigate delayed links and advise users to request a new link after expiry.
- Review privileged access, school membership/tenant scope, service accounts, keys, and provider credentials on a defined schedule and after staff changes/incidents.
- Test restore, key rotation, outbox cleanup, migration recovery, and incident response periodically. Keep evidence of the test and remediate gaps.
- Patch supported dependencies and images through reviewed CI. Run secret, dependency, SAST, and image scans on each release and after material changes.
- Review retention/deletion and vendor settings on schedule. Handle school/customer requests and incidents under the approved contractual and jurisdictional process.

## 7. Explicit non-approval status

As of this document date, the user approved local-development implementation using the non-delivering sink and specified that provider setup and activation remain manual prerequisites. Production deployment, real email sending, paid usage, and staff-assisted recovery are not approved by that local-development approval. Obtain separate explicit approval for any production deployment or real-email test after the gates above are complete.


# connect to email for forget password functionality
To send real recovery emails, you’ll need to:
- Set up a transactional email provider account. The code currently supports Brevo.
- Verify a sender address or domain with the provider and create an API key.
- Configure the API and frontend URLs, email transport, sender details, and the outbox encryption key in the environment.
- Explicitly enable live sending after those settings are ready.