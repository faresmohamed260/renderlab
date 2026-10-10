# Security Policy

Security decision rights, production authority, and emergency containment authority are defined in [`GOVERNANCE.md`](GOVERNANCE.md). This file defines the reporting and disclosure process; it does not independently grant production or emergency permissions.

## Reporting a vulnerability

Please do not open a public issue for suspected vulnerabilities, exposed credentials, authentication bypasses, authorization defects, data-exposure risks, or other security-sensitive findings.

Use a private GitHub security report when available. If private vulnerability reporting is not available, contact the repository owner through the contact methods listed on the maintainer's GitHub profile and include:

- a concise description of the issue;
- affected route, component, workflow, or resource;
- reproduction steps or a minimal proof of concept;
- expected versus observed behavior;
- potential impact;
- any suggested mitigation.

Do not include real user data, production credentials, tokens, session material, or other secrets in a report.

## Supported surface

RenderLab is a closed-beta product. Security support applies to the current production deployment and the current `main` branch. Historical commits, abandoned preview deployments, local developer environments, and unsupported third-party infrastructure are not treated as supported releases.

## Disclosure

Please allow reasonable time for validation and remediation before public disclosure. Confirmed issues will be handled according to severity and impact.
