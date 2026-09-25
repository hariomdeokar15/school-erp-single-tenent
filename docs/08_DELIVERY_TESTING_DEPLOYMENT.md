# Delivery, Testing and Deployment

## Development order

M0 -> M2 -> M1 -> M3 -> M4 -> M5 -> M6 -> M7 -> M8.

For every module: contract -> backend + tests -> web/mobile parallel with contract mocks -> integration -> staging E2E -> review -> release.

## Test layers

Unit, integration, contract/OpenAPI, E2E, security/authorization, performance, UX/i18n and device compatibility.

## CI pull-request gates

Format/lint/typecheck, unit/integration tests, contract validation, Gitleaks, dependency scan, Semgrep SAST, Trivy, migration review approval and CODEOWNER approval for critical paths.

## Deployment

Local -> staging -> production. Immutable image/static build from CI; environment-separated database/storage/keys; reviewed migrations with backup and staging rehearsal; smoke tests after deploy; feature flags/staged release for high-risk changes.

## Production release gate

Named human approval required for: critical findings resolved, staging tests passed, backup healthy, migration plan verified, monitoring/alerts active, rollback ready, and release notes prepared.
