# Reports, Automation and Operations

## Automation catalogue

| Trigger               | Automated action                                               |
| --------------------- | -------------------------------------------------------------- |
| Admission submitted   | acknowledgement and review queue                               |
| Admission approved    | enrollment conversion, optional invoice, guardian notification |
| Invoice due/overdue   | language-aware reminder queue                                  |
| Payment captured      | receipt, invoice update, dashboard refresh                     |
| Student absent        | parent push/email/SMS policy alert                             |
| Homework posted       | class notification                                             |
| Marks approved        | report-card generation                                         |
| Report card published | parent availability notification                               |
| Scheduled period      | backups, retention, reconciliation and monitoring checks       |

## Core reports

Admissions register/pending queue/conversion; student roster/guardian contacts; daily collections, invoice ageing, receipt register, reconciliation exceptions; daily/monthly attendance and low attendance; marks-entry status/result/publication status; notification failures; audit/export activity; transport assignment list.

## Report standards

Record owner, purpose, roles, filters, field definitions, calculations, refresh timing, retention/export restrictions, validation tests, report generation timestamp and data status. Exports are queued, audited and served through expiring authorized downloads.

## Observability

Monitor API latency/error rate, DB health/slow queries, Redis/queue delay, provider failures, payment webhook failures, notification failures, attendance sync failures, file scanning and unusual export/authentication activity. Use correlation IDs and redact secrets/PII.
