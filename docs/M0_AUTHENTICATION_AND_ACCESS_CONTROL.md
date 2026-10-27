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

| Role                    | Initial permissions                                |
| ----------------------- | -------------------------------------------------- |
| Owner, principal, admin | All currently defined permissions                  |
| Admissions officer      | Admission read/write and student read/write        |
| Accountant              | Fee read/write                                     |
| Teacher                 | Academic read, student read, attendance read/write |
| Parent                  | Student read, attendance read, fee read            |
| Student                 | Academic read, attendance read                     |
| Transport manager       | Student read, transport read/write                 |

Only an owner can provision owner, principal, or admin accounts. Other account creation requires `user:manage`.

## API

- `POST /api/v1/auth/login` — email/password; returns access token, refresh token, and role/permission summary.
- `POST /api/v1/auth/refresh` — consumes and rotates a refresh token.
- `GET /api/v1/auth/me` — current authenticated account.
- `POST /api/v1/auth/logout` — revokes the current session.
- `POST /api/v1/auth/change-password` — validates the current password, updates the Argon2id hash, and revokes every session.
- `POST /api/v1/auth/users` — provisions an account with an initial password and requires the user to change it.
- `GET /api/v1/auth/users?page=1&pageSize=25` — paginated account list for users with `user:manage`.
- `PATCH /api/v1/auth/users/:id` — changes a user's role or active status; role changes and account disabling revoke active sessions. The final active owner cannot be removed or disabled.

Use `@Public()` only for intentionally anonymous routes, `@Authenticated()` for signed-in routes with no extra permission, and `@RequirePermissions(...)` for protected operations.

## Initial owner setup

1. Start PostgreSQL and Redis and configure the local API environment. Do not commit `.env` or copy production secrets into development.
2. Apply migrations from the API workspace: `corepack pnpm --filter @schoolerp/api migration:run`.
3. Provision the first owner interactively: `corepack pnpm --filter @schoolerp/api bootstrap:owner`. The script requires an interactive terminal and does not echo the password.
4. Start the API and sign in through the web or mobile app.

Local development can generate an ephemeral RSA key pair when the example placeholders are present; restarting the API invalidates access tokens, but users can sign in again. Production requires a stable, matching RSA PEM key pair in the secret manager.

## Review and completion gaps

- Review the role matrix with Vaibhav, Hariom, and Om before adding business endpoints; narrow grants as needed.
- MFA for privileged staff is not implemented. Add TOTP or an approved identity provider and define enrollment/recovery before production use.
- Password reset and invitation delivery are not implemented. User creation currently distributes a temporary password out of band.
- No M2/M1/M3/etc. domain records exist yet, so parent/teacher/student object-scope authorization is not implementable in this foundation pass. Add and test those checks in each domain service before exposing data.
- Web sign-in is memory-only. Reloading or closing the tab requires signing in again; choose an approved same-site HttpOnly cookie/CSRF design before production persistence.
- Automated authentication, session-rotation, rate-limit, role-denial, and object-scope tests have not been added or run in this change.
- Review the migration on a staging database, test rollback/forward-fix, and obtain independent security review before production.
