# Sources and Validation Notes

This is technical/product documentation, not legal, tax, security-certification or board-compliance advice. Obtain qualified Indian legal, security and accounting review before launch.

- DPDP Act / child data: government and government-linked material states that verifiable parent/guardian consent is required when child personal data is processed, subject to applicable lawful exceptions. Validate current requirements with counsel. [web:91][web:92]
- Razorpay: validate webhook signatures using raw request body and `X-Razorpay-Signature`; Razorpay describes HMAC-SHA256 verification and cautions against re-encoding the body. [web:93][web:98][web:99]
- OWASP: secure AI-assisted coding guidance advises treating repository content as untrusted and reviewing agent output; prompt-injection guidance recommends clear role boundaries and constraints. [web:77][web:79]

## Validate before production

Current DPDP Act/Rules and school obligations, CBSE/state-board exam/report-card requirements, payment gateway contract/settlement/refund rules, DLT/SMS and FCM/SES policies, school record/access policy, accessibility/device compatibility and retention/deletion requirements.
