# Security maintenance

Iris is an anonymous, read-only public-wallet dashboard. Never place credentials
in `VITE_*` variables, source, fixtures, logs or browser storage.

- CI runs full and production-only dependency audits; any reported finding fails.
- The independent weekly audit checks the default branch without deploying.
- Dependabot proposes npm and immutable GitHub Actions updates. Review the diff,
  compatibility and CI before merging; updates are not automatically accepted.
- Keep Scalar's telemetry, agent and authentication persistence disabled. Remove
  its dependency overrides only after the documented revalidation in README.

## Operator-only GitHub checks

Verify **Settings → Code security** for secret scanning and push protection.
GitHub supports secret scanning for public repositories, but availability and
enablement of each protection must be checked for this repository/account.
No live setting was changed or verified by adding this file. Enable private
vulnerability reporting if available; use it rather than posting secrets in an
issue. If a secret leaks, notify the owner and rotate it through the provider;
deleting a file does not revoke the credential.

See [GitHub secret scanning documentation](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning).
