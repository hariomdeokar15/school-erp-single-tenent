# System Architecture

Use a modular monolith. It is the safest, lowest-maintenance choice for one school with about 1,600 students.

```text
React 18 + Vite Web Portal        React Native + Expo Mobile Apps
            |                                  |
            +---------- HTTPS REST ------------+
                               |
                     NestJS Modular Monolith
  auth | academics | admissions | students | fees | payments | attendance
  communication | homework | exams | transport | reports | files | audit
             |                       |                    |
        PostgreSQL 16           Redis + BullMQ       Private S3
             |                       |                    |
         transactions          jobs/retries        docs/PDFs
                               |
                 Razorpay | FCM | SES | Monitoring
```

## Module boundaries

Each NestJS module owns its controllers, services, DTOs, repository access, tests and audit events. Modules use defined services/events; do not reach into another module’s database implementation arbitrarily.

## Web architecture

React 18 + Vite SPA using React Router, TanStack Query and Tailwind. The web is an API consumer and must not contain privileged business logic or secrets.

## Mobile architecture

React Native + Expo for Android/iOS. Use TanStack Query, secure approved session storage and a local durable queue for offline attendance.

## Performance design

Pagination/cursor APIs, server-side filtering/search, indexes, background queues for PDFs/exports/messages/imports, CDN caching, compression and route/code splitting. Measure p75/p95 latency under admission, morning attendance, fee due-date and result-day peaks.

## Environments

Local/staging/production have separate databases, storage, credentials, provider keys and configuration. Production is private-network based with monitoring and backup/recovery.
