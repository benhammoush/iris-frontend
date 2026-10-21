# Iris — dashboard

A read-only Solana market monitor and public-wallet viewer, with asset charts,
token information and wallet activity. No wallet connection or transaction
signing is required.

## Tech stack and system design

| Layer                 | Tools                                         |
| --------------------- | --------------------------------------------- |
| Interface and routing | React, TypeScript, React Router, Tailwind CSS |
| Charts                | Lightweight Charts                            |
| API documentation     | Scalar                                        |
| Build and testing     | Vite, Vitest, Testing Library, Playwright     |

The browser application gets market and wallet data from the
[Iris Worker API](https://github.com/benhammoush/iris-backend), not directly from
chain or pricing providers. Provider credentials remain in the Worker, which
manages upstream requests, caching and snapshots.

A shared API client handles request timeouts and errors. The interface retains
previous results while refreshing and displays unavailable values.
The `/api-docs` route loads the interactive API reference separately from
the dashboard.

For local setup and release policy, see [ENVIRONMENTS.md](./ENVIRONMENTS.md).

Run `npm run verify` for the frontend verification suite, including lint,
formatting, type and contract checks, unit and browser tests, and the isolated
vertical test. For loading measurements and their limits, see
[PERFORMANCE.md](./PERFORMANCE.md).

## API and release references

- [Worker API contract](https://github.com/benhammoush/iris-backend/blob/main/openapi.yaml)
- [Worker architecture](https://github.com/benhammoush/iris-backend/blob/main/ARCHITECTURE.md)
- [Release evidence](./RELEASE-NOTES.md)
- [Environment and recovery runbook](./ENVIRONMENTS.md)
