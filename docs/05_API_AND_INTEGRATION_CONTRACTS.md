# API and Integration Contracts

## API principles

- Base path `/api/v1`; HTTPS only outside local development.
- OpenAPI generated from NestJS DTOs/decorators.
- Shared types in `@schoolerp/contracts`.
- API validates body, params and query; API owns authorization/business rules.
- Cursor pagination and bounded limits for large lists.
- Safe errors with stable code and correlation ID.

## Endpoint families

Auth, academic masters, admissions, students/enrollments, fees, payments, attendance, communication, homework/assignments, exams/report cards and transport.

## Payment contract

- Backend creates Razorpay order from server-derived invoice balance.
- Client checkout is not final confirmation.
- Webhook receives raw body and validates `X-Razorpay-Signature`.
- Persist provider event ID, enforce idempotency, then process payment/receipt in transaction.
- Queue receipt/notification after commit.

Razorpay documents that webhook payloads are signed and the `X-Razorpay-Signature` header must be validated using the raw request body and webhook secret. [web:93][web:99]

## FCM/SES contract

Notifications enter BullMQ; no bulk provider calls inside normal API path. Store provider message ID/status/language/retry. Recheck recipient relationship and preference before enqueueing.

## File contract

Backend authorizes request -> short-lived signed upload target -> private storage -> scan -> metadata/owner/access policy -> download authorization -> short-lived signed URL.
