# Security Policy

Security decision rights, production authority, and emergency containment authority are defined in [`GOVERNANCE.md`](GOVERNANCE.md). This file defines vulnerability reporting, severity/triage expectations, and coordinated disclosure; it does not independently grant production or emergency permissions.

## Reporting a vulnerability

Please do not open a public issue for suspected vulnerabilities, exposed credentials, authentication bypasses, authorization defects, data-exposure risks, or other security-sensitive findings.

Use a private GitHub security report when available. If private vulnerability reporting is not available, contact the repository owner through the contact methods listed on the maintainer's GitHub profile and include:

- a concise description of the issue;
- affected route, component, workflow, or resource;
- reproduction steps or a minimal proof of concept;
- expected versus observed behavior;
- potential impact;
- any suggested mitigation.

Do not include real user data, production credentials, tokens, session material, or other secrets in a report. Use the minimum data needed to demonstrate the issue and stop testing if continued validation would risk unrelated user data, destructive mutation, or service disruption.

## Supported surface

RenderLab is a closed-beta product. Security support applies to the current production deployment and the current `main` branch. Historical commits, abandoned preview deployments, local developer environments, and unsupported third-party infrastructure are not treated as supported releases.

## Severity and response expectations

RenderLab uses the same four severity names as the incident runbook. Severity is based on demonstrated or credible impact and may change as evidence develops. These are maintainer response targets, **not contractual SLAs**.

| Severity | Typical security impact | Acknowledgement target | Triage target |
| --- | --- | --- | --- |
| **Critical** | Active exploitation; authentication/authorization bypass enabling broad cross-account access; exposed privileged production credentials; destructive or widespread sensitive-data compromise. | Within 1 business day, and immediately when actively observed by an operator. | Begin immediately after validation; use the incident runbook and emergency containment authority when delay would increase active risk. |
| **High** | Exploitable privilege escalation, serious account/session compromise, or significant unauthorized data access without evidence of broad active exploitation. | Within 1 business day. | Begin within 2 business days; escalate to incident response sooner if exploitation or impact expands. |
| **Medium** | Bounded security defect requiring meaningful preconditions, limited confidentiality/integrity impact, or a defense weakness with a plausible abuse path. | Within 3 business days. | Establish reproducibility, scope, owner, and remediation path within 5 business days. |
| **Low** | Hardening issue, low-impact information exposure, or an abuse path that is unlikely to create material user/security impact. | Within 5 business days. | Classify and decide remediation/defer rationale within 10 business days. |

Acknowledgement means confirming receipt through a private channel and establishing a way to continue the report. Triage means establishing the best-supported severity, affected supported surface, reproducibility, likely exposure window, containment need, and responsible remediation path. If required information is missing, the acknowledgement should request the smallest additional evidence needed rather than asking the reporter to perform risky testing.

A suspected duplicate or non-reproducible report should still receive a private disposition when practical. Active exploitation, credential compromise, destructive behavior, or credible ongoing data exposure moves directly to [the incident response and recovery runbook](docs/operations/INCIDENT_RESPONSE_AND_RECOVERY.md).

## Coordinated disclosure

RenderLab asks reporters to keep vulnerability details, exploit material, credentials, and affected-user information private while validation and remediation are in progress.

1. **Private intake and acknowledgement.** Keep the report in a private GitHub security report or the established private maintainer channel. Confirm receipt and the communication channel.
2. **Validation and provisional severity.** Reproduce only as safely as necessary, establish affected supported versions/surfaces, and assign a provisional severity using the table above.
3. **Containment when needed.** If there is active risk, follow `GOVERNANCE.md` emergency authority and the incident runbook. Containment may precede a complete fix.
4. **Remediation and verification.** Remediation follows normal repository review and exact-head validation. A production-affecting fix is not considered deployed merely because it merged; verify the exact production state after an authorized release.
5. **Reporter retest.** When practical, tell the reporter what class of behavior changed and invite a bounded retest that does not require access to unrelated user data or secrets.
6. **Disclosure coordination.** Coordinate public disclosure after the supported surface is fixed or a protective mitigation materially reduces the risk. Agree on timing and the safe level of technical detail with the reporter where practical. If user protection requires an earlier warning, the Project Owner and Security / Operations Authority may publish a limited advisory before full remediation.
7. **Closure.** Record the final severity, affected window/surface, remediation state, production verification when applicable, and any follow-up hardening in the appropriate private incident/security evidence and durable repository authorities.

This policy does not promise a bug bounty, CVE assignment, a fixed embargo period, or disclosure on a particular date. The goal is timely, good-faith coordination that protects users while allowing accurate technical disclosure after mitigation.
