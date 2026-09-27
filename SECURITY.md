# Security Policy

## Reporting a Vulnerability

The `kuramori` maintainers take security seriously. If you discover a security vulnerability or potential threat in this repository, please report it responsibly so that we can address it before it is disclosed publicly.

### How to Report

- **GitHub Private Vulnerability Reporting (Preferred)**: Navigate to the **Security** tab of the repository on GitHub and select **Report a vulnerability**. This creates a confidential advisory between you and the maintainers.
- **Email Contact**: If you cannot use GitHub Security Advisories, send an email to the repository owner at `fuji.44mt@gmail.com` with the subject line `[SECURITY] kuramori vulnerability report`.

Please include the following information in your report:
- A description of the vulnerability and its potential impact.
- Step-by-step instructions or proof-of-concept code to reproduce the issue.
- Details regarding the affected environment (OS, Deno version, engine configurations).

### Scope and Expectations

- **Isolated Execution**: `kuramori` executes AI CLI tools and Git worktrees locally. Care should be taken when reviewing untrusted repositories or untrusted Pull Requests.
- **Response Timeline**: Maintainers will acknowledge receipt within 48 hours and provide an estimated timeline for remediation.
- **Coordinated Disclosure**: We follow coordinated vulnerability disclosure. Please do not publish information about the vulnerability until a fix has been released.
