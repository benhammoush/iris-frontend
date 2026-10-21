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
previous results while refreshing and displays data freshness and unavailable
values. The `/api-docs` route loads the interactive API reference separately from
the dashboard.
