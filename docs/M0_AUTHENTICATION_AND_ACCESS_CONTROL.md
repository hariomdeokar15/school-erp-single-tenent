# M0 Authentication and Access Control

## Implemented baseline

- Provisioned email/password accounts; public registration is disabled.
- Passwords are hashed with Argon2id. Account lookup is case-insensitive by normalizing email.
- RS256 access tokens last 15 minutes. Each request checks the token's active database session, so logout, password changes, and session revocation take effect immediately.
- Refresh tokens are random secrets; only SHA-256 hashes are stored. Refresh rotates the secret. Reuse of an old refresh token revokes that session.
- Login attempts are throttled in Redis by source IP and normalized account identifier. Login fails closed when Redis is unavailable.
- Temporary passwords must be changed before accessing any other protected route.
- Roles and permissions are checked by global API guards. Protected routes without an explicit `@Authenticated()` or `@RequirePermissions(...)` policy are denied. Health, login, and refresh routes are explicitly public.
- Sensitive login, session, password, account-provisioning events are sent to the append-only audit service.
- Mobile stores only the refresh token in Expo SecureStore; the access token remains in memory. Web tokens remain in memory and are lost when the tab reloads or closes.

## Current role defaults

These are initial broad M0 grants for review. A permission is not a substitute for object scope: module services must constrain records to linked children, assigned classes/subjects, or the user's own records.

| Role                    | Initial permissions                                     |
| ----------------------- | ------------------------------------------------------- |
| Owner, principal, admin | All currently defined permissions                       |
| Admissions officer      | Admission read/write and student read/write             |
| Accountant              | Fee read/write                                          |
| Teacher                 | Academic read, student read, attendance read/write      |
| Parent                  | Student read, attendance read, fee read                 |
| Student                 | Academic read, own student record read, attendance read |
| Transport manager       | Student read, transport read/write                      |

Only an owner can provision owner, principal, or admin accounts. Other account creation requires `user:manage`.

The M2 student record read permission is relationship-scoped in the API: a student account can read only its own linked record, a parent account can read only linked children, and a teacher account can read only students in currently assigned sections/subjects. A role permission by itself does not grant school-wide student access.

## API

- `POST /api/v1/auth/login` — email/password; returns access token, refresh token, and role/permission summary.
- `POST /api/v1/auth/refresh` — consumes and rotates a refresh token.
- `GET /api/v1/auth/me` — current authenticated account.
- `POST /api/v1/auth/logout` — revokes the current session.
- `POST /api/v1/auth/change-password` — validates the current password, updates the Argon2id hash, and revokes every session.
- `POST /api/v1/auth/recovery-email/verification` — authenticated; rechecks the current password and sends a single-use verification link to the stored account email.
- `POST /api/v1/auth/verify-email` — public; consumes the email-version-bound verification link.
- `POST /api/v1/auth/forgot-password` — public; generic response for unknown, disabled, unverified, and eligible accounts.
- `POST /api/v1/auth/reset-password` — public; consumes a single-use link and transactionally updates the password, revokes sessions, and invalidates other reset links.
- `POST /api/v1/auth/users` — provisions an account with a cryptographically generated temporary password returned once in the creation response; the user must change it at first sign-in. User-chosen passwords require at least 8 characters.
- `GET /api/v1/auth/users?page=1&pageSize=25` — paginated account list for users with `user:manage`.
- `PATCH /api/v1/auth/users/:id` — changes a user's role or active status; role changes and account disabling revoke active sessions. The final active owner cannot be removed or disabled.

Use `@Public()` only for intentionally anonymous routes, `@Authenticated()` for signed-in routes with no extra permission, and `@RequirePermissions(...)` for protected operations.

## Initial owner setup

1. Start PostgreSQL and Redis and configure the local API environment. Do not commit `.env` or copy production secrets into development.
2. Apply migrations from the API workspace: `corepack pnpm --filter @schoolerp/api migration:run`.
3. Provision the first owner interactively: `corepack pnpm --filter @schoolerp/api bootstrap:owner`. The script generates a temporary password, displays it once in the terminal, and forces a password change at first sign-in. Run it in a private terminal, not a recorded/shared session.
4. Start the API and sign in through the web or mobile app.

Local development can generate an ephemeral RSA key pair when the example placeholders are present; restarting the API invalidates access tokens, but users can sign in again. Production requires a stable, matching RSA PEM key pair in the secret manager.

## Review and completion gaps

- Review the role matrix with Vaibhav, Hariom, and Om before adding business endpoints; narrow grants as needed.
- MFA for privileged staff is not implemented. Add TOTP or an approved identity provider and define enrollment/recovery before production use.
- Password recovery requires a verified account email. Existing accounts are unverified until the signed-in user reauthenticates and confirms a link sent to the stored email; no existing address is bulk-marked verified. Staff-assisted recovery is a separate unapproved task.
- Auth recovery emails use an encrypted database outbox and the local non-delivering sink by default. Live Brevo sending remains disabled until manual provider setup and explicit approval. The outbox key is server-only; generate a key with `openssl rand -base64 32`, store it in `EMAIL_OUTBOX_KEYS` as `{"local-v1":"<generated-base64-key>"}`, and set `EMAIL_OUTBOX_ACTIVE_KEY_VERSION=local-v1`. Keep the key stable across restarts and retain old versions while matching rows remain.
- The auth outbox uses a PostgreSQL polling worker rather than BullMQ dispatch: it claims rows with `FOR UPDATE SKIP LOCKED`, uses 90-second processing leases, retries transient failures at most five times, and recovers expired leases. The database row is the durable dispatch source, so a Redis/queue enqueue outage cannot strand recovery mail.
- `EMAIL_TRANSPORT=test` is the local default and does not deliver mail. `ALLOW_LIVE_EMAILS` defaults to `false`. Brevo mode requires explicit live opt-in, server-side API key, and a verified sender/domain. Brevo Free currently allows 300 messages per day; transactional sending also requires separate provider activation. Use an already-owned sending domain and complete sender/domain authentication; no domain purchase or paid upgrade is part of this task. Before live sending, manually configure Brevo transactional logs to the shortest available retention and set previews to never store; enable per-contact tracking consent and keep the API recipient setting false. Then set `BREVO_SENSITIVE_RETENTION_CONFIRMED=true` as an operator attestation. Brevo currently retains logs indefinitely by default and supports 1–24 month retention; no email preview is retained when that option is disabled. The code sends no per-contact open/click tracking. Set `AUTH_FRONTEND_ORIGIN` to the fixed web origin; production requires HTTPS. Do not enable live sending without provider setup and approval.
- Reset links expire after 15 minutes; verification links after 30 minutes. At most two active reset tokens exist per account. A successful reset or password change invalidates all outstanding reset tokens. Token cleanup removes expired/used rows after 30 days; link outbox payloads expire with their tokens. Password-reset completion notices have a separate 24-hour expiry. Terminal outbox metadata is removed after seven days, and encrypted content is erased on acceptance, terminal failure, cancellation, or expiry.
- Reset request limits default to three per account per hour and a 60-second account cooldown; IP limits default to 30 per minute and 300 per hour. Express proxy trust remains disabled, so IP limits use the direct peer address. If deployment adds a trusted proxy, configure an explicit proxy allowlist before relying on forwarded client IPs.
- No M2/M1/M3/etc. domain records exist yet, so parent/teacher/student object-scope authorization is not implementable in this foundation pass. Add and test those checks in each domain service before exposing data.
- Separate follow-up: this document previously said web auth was memory-only, but `apps/web/src/lib/api-client.ts` stores the refresh token and cached user in `sessionStorage` while keeping the access token in memory. Review and reconcile that documentation/security decision separately; auth recovery does not redesign session storage.
- Automated authentication, session-rotation, rate-limit, role-denial, and object-scope tests have not been added or run in this change.
- Review the migration on a staging database, test rollback/forward-fix, and obtain independent security review before production.
