# Iris — dashboard

A read-only Solana market monitor and public-wallet viewer, with asset charts,
token information and wallet activity. Public browsing requires no wallet
connection or transaction signing.

## Tech stack

| Layer                 | Technology                                  |
| --------------------- | ------------------------------------------- |
| Interface and routing | React, TypeScript, React Router, custom CSS |
| Charts                | Lightweight Charts                          |
| API documentation     | Scalar                                      |
| Build and testing     | Vite, Vitest, Testing Library, Playwright   |

## Features

- Browse and search assets and public wallet addresses.
- Explore token prices, charts, market metrics and on-chain details.
- Inspect public-wallet balances and transaction activity.
- View Solana network activity and DeFi market summaries.
- See loading, unavailable and refreshing states without discarding previous results.
- Browse the interactive API reference separately from the dashboard.

Accounts and private watchlists are optional, disabled-by-default features, not a
requirement for public browsing. Their hosted setup and lifecycle acceptance
remain separate from the public dashboard.

## Boundaries and integration

Shared visual tokens, theme controls and reusable UI are documented in the
[Iris design system](src/design-system/README.md).

The browser gets market and wallet data from the
[Iris API](https://github.com/benhammoush/iris-backend), not directly from chain
or pricing providers. The backend owns provider credentials, upstream requests,
caching and snapshots; the frontend handles navigation, charts and presentation.

Freshness and unavailable values are preserved rather than presenting missing
information as zero. The dashboard does not trade, sign transactions or move funds.

See [the backend API contract](https://github.com/benhammoush/iris-backend/blob/main/openapi.yaml)
for data formats and endpoints.

The [account](docs/spec/accounts.md) and [watchlist](docs/spec/watchlists.md)
specifications describe the optional private features.
