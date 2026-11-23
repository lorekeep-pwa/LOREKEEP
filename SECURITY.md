# Security policy

## Supported versions

Security fixes are prepared for the latest code on the `main` branch and the currently deployed production version. Older commits and self-hosted forks may not receive fixes automatically; update to a current release or commit when a fix is announced.

## Reporting a vulnerability

Please do not report exploitable vulnerabilities in a public GitHub issue. Use GitHub's [private vulnerability reporting form for this repository](https://github.com/lorekeep-pwa/LOREKEEP/security/advisories/new) if it is available to you, or contact a LOREKEEP organization owner privately through GitHub.

Include, when possible:

- The affected component, version, or commit.
- The impact and conditions needed to reproduce the issue.
- A concise reproduction or proof of concept that does not expose real user data.
- Any suggested mitigation.

Please allow maintainers time to investigate and coordinate a fix before sharing technical details publicly. Do not include API keys, access tokens, private story content, or other people's personal data in a report. A maintainer may follow up through GitHub; response time can vary because this is a community project.

## Scope and data handling

LOREKEEP stores archive data in the user's browser. A report should identify whether the issue affects the application, its local storage or import/export flows, the cover lookup Worker, deployment configuration, or a third-party provider integration. Provider credentials must remain in server-side secret storage and must never be committed to this repository.
