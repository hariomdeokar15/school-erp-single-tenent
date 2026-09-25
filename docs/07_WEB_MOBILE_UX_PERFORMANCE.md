# Web, Mobile, UX and Performance

Web: current Chrome/Edge/Firefox on Windows/Linux/macOS and Safari on macOS/iPadOS. Mobile: Android and iOS via React Native + Expo. Low bandwidth and unstable networks are first-class constraints.

## UX rules

- One main action per screen; no ERP-style giant menus.
- Parent home: fees, attendance, notices/homework, upcoming actions.
- Teacher home: today’s classes, attendance, homework, pending marks.
- Office home: admission queue, fee exceptions, pending approvals, reports.
- Plain school language and exact action: “Pay ₹5,000”, “Mark all present”, “Approve admission”.
- Every flow has loading/empty/offline/retry/error/confirmation/success states.
- Minimum 44x44 touch target, contrast, keyboard path and screen-reader labels.

## i18n

Use i18n keys with `en`, `hi`, `mr`. Store user preference and school default; English fallback. Test Devanagari layouts; use DD/MM/YYYY, INR and Indian numbering.

## Web performance

React/Vite, route code-splitting, paginated server-side filtered APIs, CDN caching, no public source maps, no secrets in `VITE_*`.

## Mobile performance

Test real budget Android and current iOS devices. Paginated lists, optimized images, cached data, minimal re-renders, offline queue with visible sync state, push payloads minimal and app re-fetches authenticated details.

## Performance tests

Morning attendance concurrency, fee-deadline payment spike, report-card access/download, admission campaign, slow query review and p75/p95/error-rate tracking.
