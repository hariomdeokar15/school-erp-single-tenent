# Web Frontend Implementation Notes

## Run locally

The web app reads its API origin from `VITE_API_BASE_URL`. Copy `apps/web/.env.example` to `apps/web/.env.local`, set the API origin for your local API, then run:

```powershell
corepack pnpm --filter @schoolerp/web dev
```

The local Vite server uses port `3001`; the API origin is configured separately. Restart Vite after changing an environment file. The browser app keeps access and refresh tokens in memory and requires sign-in after a full page reload.

## Folder boundaries

- `apps/web/src/app`: app providers and route composition.
- `apps/web/src/features/auth`: sign-in, password-change, and in-memory authentication state.
- `apps/web/src/features/workspace`: shared authenticated shell, navigation, and permission-aware route display.
- `apps/web/src/features/dashboards/{owner,principal,admin,teacher,parent,student,staff}`: role-specific dashboard entry points.
- `apps/web/src/features/dashboards/shared`: dashboard composition used by single-role and multi-role accounts.
- `apps/web/src/features/academic`: academic setup and teacher assignment screens.
- `apps/web/src/features/students`: student, guardian, and enrollment screens.
- `apps/web/src/features/staff`: school user management.
- `apps/web/src/features/shared`: reusable API-backed UI components.
- `apps/web/src/lib`: environment configuration, API client, query cache, and i18n setup.

Keep domain workflows in their feature folders. Role dashboard folders should compose shared features; they should not duplicate API or student-management implementations.

## Authorization and role navigation

- The UI reads the roles and permissions returned by the API and merges navigation entries available to the signed-in account's roles.
- Permission checks in React control which routes and actions are displayed. The NestJS API remains authoritative and must enforce every permission and object scope.
- Student queries rely on server-side relationship scope for teachers, parents, and students. Do not infer access from a URL or a client-supplied user ID.
- The current user-management API accepts one role for account creation and role update. The UI does not simulate multiple-role or per-user module grants. Those require an approved backend contract and server-side enforcement before they can be managed here.
- Modules without implemented APIs are shown as unavailable; the UI does not invent operational data for them.

## Current API-backed screens

- All role dashboards use real, permission-scoped API responses for the counts they display. The health widget reads the public health endpoint.
- Academic setup includes academic years, terms, class levels, sections, subjects, class curriculum, section subjects, and teacher/class-teacher assignment lists and writes.
- Student screens include paginated search, create, view, update, guardian linking, enrollment, placement transfer, enrollment close, and scoped enrollment history. Student creation can create a parent/guardian family portal account in the same transaction or link an existing family account for a sibling. A young child uses the family account and Parent dashboard; no separate student credential is created by default.
- Staff screens include account list/create, role update, and active/disabled account status.
- Fees, attendance, admissions, transport, messages, homework, and reports remain unavailable until their backend workflows are implemented.

## Follow-up before production

- Design and review the multi-role and per-user module-grant contract. Enforce effective permissions in NestJS and test allowed and denied access before adding UI controls for it.
- Add automated web/API integration and authorization tests, keyboard/mobile accessibility review, and English/Hindi/Marathi review.
- Replace out-of-band initial-password sharing with an approved invitation/reset workflow before real accounts are provisioned. Temporary passwords are forced through the in-app change-password screen on first sign-in.
- Review the current session model and approve a same-site secure-cookie/CSRF design if browser sessions must survive page reloads.
