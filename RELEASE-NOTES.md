# Iris release evidence

Dated deployment, acceptance and recovery observations; not a live inventory or
permission to perform operations. Reverify artifacts and configuration before any
release or restoration. See [the environment runbook](./ENVIRONMENTS.md) for policy.

## 2026-10-16 — Dev application-artifact rollback rehearsal

Provider restoration actions were performed by the maintainer. Read-only API,
provider and browser checks were performed between steps. This rehearsal was not
production approval. Times below are UTC.

### Restored candidate pair

| Component | Source SHA                                 | Version  | Immutable provider artifact            |
| --------- | ------------------------------------------ | -------- | -------------------------------------- |
| Frontend  | `0b2422187d3f53b162ebd4b1e4016da251fbd8c1` | `1.23.4` | `dpl_AdXKPTV5Ev7X1wGeY1fbzs55vBsY`     |
| Worker    | `d7fe5ab4759cdb50ac6448fac524d67ce029a3cb` | `3.15.7` | `dc9f5c9d-14d9-45fd-9ce7-7a234f1ed04e` |

- Frontend project: `iris-frontend-dev`.
- Stable frontend URL: <https://iris-frontend-dev.vercel.app>.
- Candidate frontend artifact URL:
  <https://iris-frontend-i9vd5t1sy-benhammoushs-projects.vercel.app>.
- Worker: `iris-backend-dev`, <https://iris-backend-dev.benhxm.workers.dev>.
- Worker KV namespace: `5bedf23d861c4e5d8a72afc9305bbf46`.
- Dev CORS configuration: `https://iris-frontend-dev.vercel.app` and
  `http://localhost:5173`. The hosted frontend origin was exercised.
- Frontend API base: the dev Worker origin above; emergency fixtures disabled in
  its deployment workflow build inputs.
- Vertical CI Worker pin and frontend OpenAPI source pin:
  `568d38a8acbfa42689c59f7162b975c41cea98b0`. The Worker comparison from that
  revision to the candidate changed only the delivery workflow and delivery tests,
  not application code or the OpenAPI contract. Pins were not changed.

Source-to-artifact mapping was established from deployment logs and checked
against provider records:

- [Frontend candidate CI/deployment](https://github.com/benhammoush/iris-frontend/actions/runs/38875350122).
- [Worker candidate CI/deployment and earlier explicit dev refresh](https://github.com/benhammoush/iris-backend/actions/runs/38877459367).

### Exercised previous pair

| Component | Source SHA                                 | Immutable provider artifact            |
| --------- | ------------------------------------------ | -------------------------------------- |
| Frontend  | `e7a460cdd2832e429ffb3ff27ce27b002303fa9e` | `dpl_DrS8Dj9RcNTvMDdsQAoXXF3FVy6Y`     |
| Worker    | `568d38a8acbfa42689c59f7162b975c41cea98b0` | `696cd20d-2e6a-4d31-b269-ae7e2008ee10` |

- Previous frontend artifact URL:
  <https://iris-frontend-70g3cw7m9-benhammoushs-projects.vercel.app>.
- [Previous frontend deployment evidence](https://github.com/benhammoush/iris-frontend/actions/runs/38792933469).
- [Previous Worker deployment evidence](https://github.com/benhammoush/iris-backend/actions/runs/38728665592).
- Both Worker versions had the same KV namespace and binding names/types.
  Secret values were not inspected or recorded.

### Rehearsal and restoration

1. The maintainer restored the previous Worker version at 09:38:47.646439,
   deployment `11531a23-9c21-4665-a667-1281adfc1781`, at 100% traffic.
2. The maintainer rolled back the dev frontend to the previous immutable artifact.
   Vercel inspection confirmed the stable dev alias resolved to that artifact.
3. The previous pair passed health, readiness, snapshot freshness and hosted-dev
   CORS checks. Browser Home → SOL catalog search → SOL detail worked, including
   market data, Birdeye candles and Helius mint-address activity.
4. The maintainer restored the candidate Worker at 09:43:04.698492, deployment
   `09d913c2-8099-414f-8c42-501806cb1775`, at 100% traffic. API checks passed again.
5. The maintainer promoted the original frontend artifact, undoing Vercel's
   rollback state. Provider inspection confirmed the stable dev alias again
   resolved to `dpl_AdXKPTV5Ev7X1wGeY1fbzs55vBsY`.
6. Final checks around 09:47 confirmed the restored provider identities,
   frontend/Worker versions, HTTP 200 health/readiness/status, a fresh snapshot,
   and hosted-dev CORS. Browser Home → SOL search → SOL detail succeeded;
   catalog, dashboard, market detail, candles and mint-address activity requests
   returned HTTP 200 from the dev Worker.

The snapshot creation timestamp remained `2026-10-16T09:01:07.175Z` throughout
the checked rollback/restoration steps. No authenticated refresh, KV restoration,
data deletion or production change was part of this rehearsal. Normal public GET
requests can still perform on-traffic provider reads and cache writes.

### Rehearsal limits and prerequisites at that point

- This is dev application-artifact recovery evidence, not production recovery or
  complete manual acceptance. Wallet flows and the full Chrome/Firefox/Safari
  baseline were not exercised in this rehearsal; browser checks used Chromium.
- Third-party logos produced HTTP 404 and blocked-image failures. The checked
  product/API flows remained functional; this is not a clean-console claim.
- At the time of the rehearsal, no previous accepted production pair existed. The
  approved
  [first-production policy](./ENVIRONMENTS.md#approved-first-production-policy)
  requires explicit maintainer acceptance of that limitation before activation.
- A later read-only readiness check found both production `DEPLOY_ENABLED` flags
  false, required native reviewer gates with administrator bypass disabled, and
  the specified main-branch protections. Production frontend variable and secret
  names were present. The Worker production GitHub environment had no secrets,
  and Cloudflare reported `iris-backend-production` did not exist.
- Production provisioning, credential setup, provider policy/isolation checks,
  remaining maintainer acceptance and activation were separate prerequisites.
  Reverify
  provider identities, configuration, pins and artifact eligibility before using
  this evidence for a release or a later recovery.

## 2026-10-16 — Additional dev public-wallet verification

Around 10:31 UTC, the same candidate frontend artifact and Worker version above
were rechecked against provider records. Chromium exercised the public incinerator
address `1nc1nerator11111111111111111111111111111111` through navbar search and the
explicit public-wallet destination.

- Wallet balances and initial Helius activity returned HTTP 200 from the dev
  Worker. The UI disclosed that the returned 40 holdings were truncated.
- All 40 returned holdings were unpriced. Their missing price/value cells showed
  dashes and Unpriced labels. The API reported a zero priced subtotal, zero priced
  holdings, 40 unpriced holdings and an incomplete valuation; the UI described the
  subtotal as excluding unpriced holdings rather than a complete wallet value.
- Activity displayed atomic quantities with decimal counts. Loading one cursor
  page returned HTTP 200 and increased the loaded transaction count from 25 to
  50 without replacing the first page.
- No wallet connection, signature, authenticated refresh or production mutation
  was part of this check. Public reads may consume provider quota and update caches.
- Failure/retry states and the full supported browser baseline were not exercised
  by this successful live check; these verification limits remain.

### Maintainer acceptance

The maintainer accepted the tested dev behavior after being asked to inspect Home,
search, SOL detail and the public-wallet flow. The maintainer separately accepted
that first production has no previously accepted production pair to restore, and
that recovery requires a fresh, separately approved exact-SHA deployment of the
dev-accepted compatible pair, not a production rerun or KV rollback. These
confirmations do not authorize production activation, deployment or data refresh.

The maintainer subsequently confirmed that the production Worker's `REFRESH_TOKEN`
matches GitHub production `IRIS_REFRESH_TOKEN`, and that the Cloudflare and Vercel
deployment credentials have the intended production access. These are operator
attestations, not independent validation of secret values or token permissions.

## 2026-10-16 — First accepted production pair

The maintainer accepted production after the targeted smoke checks and a request
to inspect the live site. The exact immutable pair below is retained as the first
accepted production recovery baseline, subject to fresh eligibility checks before
restoration. The verification limits and known issues below remain. Both workflows
used manual dispatch from `main`, attempt 1, selected the dev-accepted source pair
and passed their native production gates through maintainer approval.

| Component | Source SHA                                 | Version  | Immutable provider artifact            |
| --------- | ------------------------------------------ | -------- | -------------------------------------- |
| Frontend  | `0b2422187d3f53b162ebd4b1e4016da251fbd8c1` | `1.23.4` | `dpl_2EmQQgA8ksRGWwpCeEi3vQMqnVRV`     |
| Worker    | `d7fe5ab4759cdb50ac6448fac524d67ce029a3cb` | `3.15.7` | `5d3b36f9-9eea-47fa-acd7-ca41d2c98335` |

- Frontend project: `iris-frontend-production`.
- Stable frontend URL: <https://iris-frontend-production.vercel.app>.
- Immutable frontend URL:
  <https://iris-frontend-production-mzf6z6ytj-benhammoushs-projects.vercel.app>.
- Worker: `iris-backend-production`,
  <https://iris-backend-production.benhxm.workers.dev>.
- Worker deployment: `b47873e2-101e-44a8-bfbb-6c951febc54d`, 100% traffic.
- Production KV: `4442b6231710407ea3a668dc9a8a8794`, separate from dev.
- Production CORS: only `https://iris-frontend-production.vercel.app`.
- Frontend API base is the production Worker origin, emergency fixtures were
  disabled by workflow build inputs, and OpenAPI/vertical-CI pins remained the
  compatible `568d38a8acbfa42689c59f7162b975c41cea98b0` revision.
- [Successful Worker release and refresh](https://github.com/benhammoush/iris-backend/actions/runs/38889620045).
- [Successful frontend release](https://github.com/benhammoush/iris-frontend/actions/runs/38891235443).

### Partial first attempt and recovery

[Worker run 38888681955](https://github.com/benhammoush/iris-backend/actions/runs/38888681955)
deployed version `827021bd-3195-499f-8b38-0f470661bd42` and enabled hourly Cron,
then failed when the immediate authenticated refresh received HTTP 503. The
34-byte response matched the preceding inert placeholder's response length;
edge propagation is the likely explanation, not a proven root cause. Read-only
inspection found the new Worker active but serving fixture snapshot data, with
the frontend still undeployed. The failed production run was not rerun.

After explicit maintainer authorization, a new same-SHA dispatch with fresh native
approval succeeded. Its authenticated refresh published a fresh snapshot at
10:52:14.764 UTC. Production Cron is `0 * * * *`. A later status check reported a
new fresh snapshot at 11:00:18.857 UTC; no manual refresh was performed by the
verification session.

Normal Worker deployment re-enabled version preview URLs. The maintainer disabled
them through the dashboard; at 11:01, the provider API reported previews disabled,
the current version preview health URL returned HTTP 404, and the stable Worker
health URL remained HTTP 200. At that point the normal production Wrangler
configuration did not explicitly disable previews. The follow-up release below
resolved this omission; do not assume the manual setting survives older-source
deployments.

### Read-only production smoke checks

Around 11:18–11:20 UTC, provider records and workflow logs established the pair
above. Health, readiness and status returned HTTP 200, Worker version `3.15.7`,
a fresh Helius/Jupiter snapshot and the correct hosted-production CORS header.
Earlier production smoke checks rejected the dev origin with HTTP 403.

Chromium exercised Home → SOL catalog search → SOL detail → explicit public
incinerator-wallet lookup. Catalogs, dashboard, market detail, Birdeye candles,
mint-address activity, wallet balances and wallet activity returned HTTP 200 from
the production Worker. Wallet activity pagination increased the loaded count from
25 to 50. Holdings displayed truncation and unpriced-value disclosures. Interactive
API Docs showed version `3.15.7` and the production API server, not dev.

Third-party logo HTTP 404 and blocked-image errors remain. These are targeted
Chromium smoke checks, not full supported-browser or failure/retry acceptance.
No authenticated refresh, deployment, configuration mutation or KV restoration
was performed by these smoke checks; ordinary public GET requests can consume
provider quota and update on-demand caches. Retain the accepted immutable pair
above and reverify its eligibility before any later restoration.

## 2026-10-16 — Production preview-URL guard delivered

[Backend PR #6](https://github.com/benhammoush/iris-backend/pull/6) merged as
`c6caecf52998372838d883ad1d4aca382d37883c`. Its three-file change adds explicit
production `preview_urls = false`, a production-scoped regression test, and the
approved first-production recovery documentation. Application code, API contract,
KV/CORS configuration and Cron behavior are unchanged.

- [Automatic dev delivery](https://github.com/benhammoush/iris-backend/actions/runs/38926336699)
  passed; its retained dev snapshot was stale, not accepted as fresh.
- After separate maintainer authorization,
  [manual dev refresh](https://github.com/benhammoush/iris-backend/actions/runs/38927052963)
  passed for the exact merged SHA. Dev Worker version was
  `5fa38c20-9b22-4187-8161-7429db41647d`; health/readiness and dev CORS passed,
  and the snapshot was fresh at `2026-10-16T15:50:30.399Z`.
- After separate production authorization and native approval,
  [production run 38947132899](https://github.com/benhammoush/iris-backend/actions/runs/38947132899)
  passed as a new manual dispatch from `main`, attempt 1, selecting that same SHA.
- Production Worker version observed after this release:
  `aca04a0a-bab0-4800-83b4-3b2dd2cf19d4`, at 100% traffic in deployment
  `f46a01a2-89a4-482c-9cb8-51563e9217a5`. API version remains `3.15.7`.
- The workflow's authenticated refresh succeeded. Read-only checks around
  18:33–18:36 UTC confirmed HTTP 200 health/readiness/status, hosted-production
  CORS, and a fresh snapshot created at `2026-10-16T18:31:36.850Z`.
- The provider reported `previews_enabled: false` and the version preview health
  URL returned HTTP 404. The stable workers.dev API stayed enabled; hourly Cron
  remained `0 * * * *`. No manual preview toggle was needed for this deployment.
- Frontend artifact `dpl_2EmQQgA8ksRGWwpCeEi3vQMqnVRV` remained unchanged and Ready.

Retain the previously accepted immutable production pair above as recovery
evidence; do not overwrite it with this later Worker's identity. This follow-up
received targeted deployment/API verification, not a repeated full-browser
acceptance run. Reverify artifact eligibility and relevant provider configuration
before any later recovery. No additional deployments or authenticated refreshes
were performed by the verification session.
