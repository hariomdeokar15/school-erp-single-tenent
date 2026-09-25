# Security, Privacy and Compliance

## Access control

| Role             | Scope                                             |
| ---------------- | ------------------------------------------------- |
| Parent/guardian  | linked children only                              |
| Teacher          | assigned class/section/subject only               |
| Admissions staff | admission workflow and approved onboarding fields |
| Accountant       | finance scope only                                |
| Principal/admin  | granted school-wide functions                     |
| Transport staff  | assigned transport functions                      |
| Student          | own homework/timetable/published results          |

All authorization is enforced server-side in NestJS. Hidden UI controls are not security.

## Required controls

TLS/HSTS/CSP/secure headers/restricted CORS, RS256 JWT/session controls, Argon2id, OTP rate limits, MFA for privileged staff, DTO validation, parameterized TypeORM queries, safe errors, private S3/signed URLs/file scanning, secrets in secret manager, audit events, Snyk/Dependabot, Semgrep, Gitleaks, Trivy, protected main and CODEOWNERS for critical paths.

## DPDP requirements

Build a documented workflow for verifiable parent/legal-guardian consent, clear notice, purpose limitation, data minimization, access/correction/deletion, retention and breach response before processing child personal data. India’s DPDP Act requires verifiable parental or lawful-guardian consent for child personal data; validate current implementation requirements with qualified counsel at launch. [web:91][web:101]

Do not use children’s data for targeted advertising, behavioral monitoring or unrelated model training.

## Threat model

| Threat                        | Controls                                                   |
| ----------------------------- | ---------------------------------------------------------- |
| Parent sees another child     | guardian relationship/object checks                        |
| Teacher sees unassigned class | assignment scope checks                                    |
| Fake payment event            | raw-body signature verification, idempotency               |
| Duplicate payment/receipt     | unique provider IDs, transaction, replay tests             |
| Malicious document            | validation, scan, private storage, signed access           |
| Data loss                     | backups, PITR, restore drills, migration review            |
| Account abuse                 | OTP/login rate limits, MFA, monitoring, session revocation |
| AI-generated vulnerability    | small tasks, review, scans, tests, staging                 |

## Incident process

Detect -> contain -> preserve evidence -> assess scope -> remediate/rollback -> validate -> communicate -> post-incident review. Do not make fixed legal notification promises without current counsel review.
