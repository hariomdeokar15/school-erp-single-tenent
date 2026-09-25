# Data Model and Database Rules

## Core entities

```text
SchoolProfile
AcademicYear -> Term -> Class -> Section -> Subject -> TeacherAssignment
AdmissionApplication -> ApplicationGuardian / ApplicationDocument / Consent
Approved application -> Student -> StudentGuardian -> Enrollment
Student -> Invoice -> InvoiceLine -> Payment -> Receipt
Student -> AttendanceSession -> AttendanceRecord -> Correction
Student -> Assessment -> Mark -> ReportCard
Notice / Homework / Assignment -> NotificationDelivery
Vehicle -> Route -> Stop -> TransportAssignment
User -> RoleAssignment -> AuditEvent
```

## Required database rules

- UUID/ULID technical IDs; admission/receipt numbers are business identifiers only.
- Migrations only; TypeORM `synchronize` forbidden outside local development.
- Foreign keys, check constraints, unique constraints and indexes.
- Money as integer paise or PostgreSQL numeric; never JS floating point.
- UTC timestamps; date-only fields as PostgreSQL `date`.
- Transactions for admissions conversion, payments, refunds, promotion, publication and other multi-step writes.
- Append-only audit events for sensitive changes.

## Essential constraints

| Area       | Constraint                                                           |
| ---------- | -------------------------------------------------------------------- |
| Admission  | unique application number; conversion idempotency key                |
| Student    | unique admission number; enrollment unique per student/academic year |
| Guardian   | many-to-many via `student_guardians`                                 |
| Payment    | unique provider payment ID and provider event ID                     |
| Receipt    | unique receipt number                                                |
| Attendance | unique student/date/period/session rule as defined                   |
| Marks      | unique student/assessment/subject record                             |
| Audit      | immutable append-only event record                                   |

## Sensitive fields

Sensitive data includes identity documents, optional Aadhaar, health/emergency details, guardian income/financial information, payment details and student records. Collect only necessary data, encrypt where approved, restrict access, exclude from logs and use private storage/signed URLs.

## Backup and migration rules

Automated backups/PITR in production, S3 versioning, restore drills, migration review, staging test and rollback/forward-fix plan before production.
