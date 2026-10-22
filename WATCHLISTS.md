# Private watchlist UI — WL-3

Frontend 1.25.0 adds `/watchlist` and explicit Save/Remove controls on asset and
wallet detail pages. Everything remains behind the existing disabled-by-default
account flag. No Firebase/D1 resources, remote pins or hosted settings changed.

The [WL-3 backend specification](https://github.com/benhammoush/iris-backend/blob/1924192f99347c43542a83cf33d3947901c02171/WATCHLISTS.md)
owns the owner-approved public-summary requirements; its coordinated
[backend PR #19](https://github.com/benhammoush/iris-backend/pull/19) must merge
before this frontend PR. The implemented OpenAPI owns the private contract:
`GET /v3/me/watchlist` still fetches references only, never provider data. Summaries
use separate anonymous `GET /v3/wallets/{address}` requests.
See [ACCOUNTS.md](./ACCOUNTS.md) for authentication boundaries and
[ENVIRONMENTS.md](./ENVIRONMENTS.md) for setup/release policy.

## Behavior

- One private page contains Assets and Wallets, newest first; equal timestamps
  sort by case-sensitive address. Each section holds at most 100 references.
  The Worker owns uniqueness and capacity enforcement, including concurrent writes.
- A save requires a fresh explicit click after sign-in and verification. Login
  never resumes a pending save. Public market and wallet browsing remains anonymous;
  no wallet connection or signature is requested.
- Detail controls load membership, then show Save or Remove. Mutations are serialized
  across views; controls show pending state and never optimistically claim success.
  Validated server acknowledgements update membership, followed by a fresh list read.
  A failed or ambiguous write shows an error and reconciles with a GET, never a
  repeated mutation. A failed refresh retains only the current account's prior
  data with an explicit stale/error notice, never a fabricated empty list.
- References live only in memory. Sign-out, account switch and verification-state
  changes clear them and cancel/discard old work. Private responses never enter the
  public-resource cache, browser storage or a shared cache.
- List reads happen on page/control entry, visible focus return and after mutations.
  There is no polling, offline queue or automatic mutation retry. Concurrent reads
  are coalesced. No private reads run for signed-out or unverified users.
- Compact asset rows show name, 24h volume and price from the already loaded Jupiter
  catalog. Unknown assets retain address links and unknown metrics stay `—`.
  Both sections reuse the catalog panel and Home's Jupiter/Helius branding; shared
  presentation components do not fetch data. Detail links retain fuller information.
- Owner-approved change, 2026-10-22: wallet rows automatically request public Worker
  balance/holding summaries, replacing the earlier address-only rule. Show priced
  compact rows with a truncated address, returned holdings count and priced subtotal.
  Full addresses remain accessible and available on hover. A `+` marks truncated
  holding counts; partial/stale values remain labeled. Snapshot time is available
  to assistive technology; the wallet detail page contains the full holdings view.
  Helius supplies balances; Jupiter may supply pricing. No transaction/activity
  endpoint is called until the user enters wallet detail.
- Automatic wallet reads are anonymous (no Firebase token), bounded to four in
  flight and at most 100 saved addresses. Results/queues are tied to the current
  private view and aborted/discarded on identity change or unmount. Page entry,
  visible focus return and explicit refresh reload summaries; there is no polling.
  Refresh retains the last successful summary while pending; failure marks it
  stale with a retry control instead of removing it. Identity changes clear all
  retained summaries. First-load failures stay per row; a manual row retry fetches
  only that wallet. Surfaced Worker throttling/outage failures stop the remaining
  queue rather than flooding/retrying it; swallowed Jupiter enrichment failures
  cannot yet signal a stop. The backend specification requires provider budgets
  and typed end-to-end stop propagation before activation.
  Automatic summaries can add up to 100 public wallet reads per refresh; review
  hosted quotas and provider logging/privacy before activation. Reference saves and
  removals remain usable when a public summary cannot load.
- Payload validation checks both sections, 100-item bounds, duplicates, exact
  32-byte Base58 addresses and valid server timestamps. Save acknowledgements must
  match kind/address; remove acknowledgements must confirm removal. Invalid data
  produces an error rather than a partial/empty success.

## Acceptance boundaries

Local unit and intercepted-browser tests cover ordering, duplicate/capacity errors,
read/write races, identity isolation, bounded summary loading, explicit saves,
unknown metadata, failure/retry, keyboard focus and mobile layout.
The browser journey uses the real Firebase Web SDK
with synthetic intercepted REST responses and an intercepted private Worker API.
It creates no real accounts, sends no emails and proves no hosted ownership policy.

Account deletion/cleanup, real OAuth and email delivery, IAM, cross-device hosted
acceptance and activation remain separate WL-4–5/WL-O1 gates. WL-3 alone must not
enable hosted private traffic.
