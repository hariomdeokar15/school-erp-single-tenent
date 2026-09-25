# Module Requirements and Workflows

## M0 — Platform Foundation

Users, roles/permissions, sessions, audit events, error handling, correlation IDs, health checks, English/Hindi/Marathi i18n, private file abstraction, Redis/BullMQ queues, feature flags, configuration validation and CI/CD baseline.

## M2 — Student and Academic Management

Build before admissions because admissions needs academic year, class, section and subject choices. Includes academic years/terms, classes/sections/subjects, teacher assignments, student master, guardian relationships, enrollment, status lifecycle, promotion, transfer and archived states.

## M1 — Admissions

```text
guardian chooses language -> verifies phone -> saves/fills application
-> uploads documents -> gives consent -> submits
-> officer reviews/checks documents -> decision
-> approved application converts exactly once to student + guardian + enrollment
-> configured admission fee invoice/confirmation is issued
```

Includes public/staff-assisted application entry, draft/resume, document checklist, verification, review queue, consent record, idempotent conversion transaction and existing-student import with error report/audit history.

## M3 — Fees and Payments

Fee heads/plans/schedules, concessions, invoices, Razorpay orders, verified webhooks, receipts, partial payments, refunds/manual receipts with approval, collection/reconciliation exception reports and queued reminders.

## M4 — Attendance

All-present-then-exceptions workflow, daily/period attendance, teacher scope, offline mobile queue, controlled corrections, absence alerts and reports.

## M5 — Communication and Notifications

Notices, FCM push, SES email fallback, queued retries, delivery logs, notification preferences/language and optional PTM workflow after notice foundation.

## M6 — Homework and Assignments

Teacher-created assignments, attachments, student/parent visibility, submission workflow and private file permissions.

## M7 — Exams and Report Cards

Exam/assessment/subject configuration, marks entry, grade scales, draft/submit/return/approve workflow, async PDF generation, publication and delivery logs.

## M8 — Transport

Vehicles, drivers/attendants, routes/stops/capacity, student assignments and transport fee linkage. GPS is a later provider integration, not MVP.

## Cross-module acceptance

Every write has validation, permission check and sensitive audit event. All screens have loading/empty/error/retry/forbidden states. User-visible labels/messages exist in en/hi/mr. A module is complete only when web, mobile, API, tests, docs and monitoring are integrated.
