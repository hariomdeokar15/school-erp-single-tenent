# SchoolERP India — One-School Production Documentation

## Scope

Secure, automation-first ERP for **one Indian K-12 school** with approximately **1,600 students**. Serves office, admissions, accounts, teachers, parents, students, principal and transport staff through a React web portal and React Native mobile apps.

This is not a multi-tenant SaaS. Do not add tenant selection, subscriptions, school billing, cross-school dashboards or multi-school isolation. If expansion is required later, create an approved ADR first.

## Final technology stack

| Layer            | Choice                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| Repository       | pnpm workspace monorepo                                                |
| Language/runtime | TypeScript strict, Node.js 20 LTS                                      |
| API              | NestJS 10 modular monolith                                             |
| Database         | PostgreSQL 16 + TypeORM 0.3 migrations                                 |
| Jobs/cache       | Redis 7 + BullMQ 5                                                     |
| Web portal       | React 18 + Vite, React Router, TanStack Query                          |
| Mobile apps      | React Native + Expo, Android and iOS                                   |
| UI/forms         | Tailwind CSS web, React Hook Form + Zod                                |
| i18n             | English, Hindi, Marathi                                                |
| Push             | Firebase Cloud Messaging                                               |
| Payments         | Razorpay                                                               |
| Email            | Amazon SES                                                             |
| Files            | local adapter in development; private AWS S3 in production             |
| Monitoring       | Sentry + OpenTelemetry + CloudWatch/Grafana                            |
| Delivery         | GitHub Actions, protected branches, AWS Mumbai + Cloudflare/CloudFront |

## Module order

M0 Foundation -> M2 Academic/Student Masters -> M1 Admissions -> M3 Fees -> M4 Attendance -> M5 Communication -> M6 Homework -> M7 Exams -> M8 Transport.

Admissions depends on academic masters and produces enrolled student/guardian records. Those records feed all downstream modules.

## Read order

1. `01_PRODUCT_AND_PROCESS_SCOPE.md`
2. `02_MODULE_REQUIREMENTS_AND_WORKFLOWS.md`
3. `03_SYSTEM_ARCHITECTURE.md`
4. `04_DATA_MODEL_AND_DATABASE_RULES.md`
5. `05_API_AND_INTEGRATION_CONTRACTS.md`
6. `06_SECURITY_PRIVACY_COMPLIANCE.md`
7. `07_WEB_MOBILE_UX_PERFORMANCE.md`
8. `08_DELIVERY_TESTING_DEPLOYMENT.md`
9. `09_REPORTS_AUTOMATION_AND_OPERATIONS.md`
10. `10_AI_CODING_RULES_MASTER.md` — mandatory for every AI coding session
11. `11_PROJECT_TRACKING_AND_GOVERNANCE.md`
12. `12_SOURCES_AND_VALIDATION_NOTES.md`

## Non-negotiables

- One NestJS backend for React web and React Native mobile.
- Business rules, permission decisions, fee calculations and payment confirmation remain in NestJS.
- Parent sees only linked children; teacher sees assigned classes; staff see assigned functions only.
- No secrets or student data in source control, AI prompts, logs, screenshots or test fixtures.
- All user-facing content supports English, Hindi and Marathi.
- Production requires review, tests, scans, staging validation, release approval and rollback readiness.
