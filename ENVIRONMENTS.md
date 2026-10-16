# Iris: localhost, dev, production

Repositories: `benhammoush/iris-frontend` and `benhammoush/iris-backend`, with two ordinary release CI workflows. No release coordinator or extra GitHub tokens. This is the durable operator runbook, not a live inventory; verify provider and GitHub settings before activation or promotion.

## Fresh bootstrap

The new repositories start with independent bootstrap commits; they do not import old Git history or local secrets. Preserve the old repositories until the replacements are verified; archive them only with separate authorization. Do not copy their Git directories, deployment links or environment credentials into Git.

Use only the new environment resources below. Vercel domains and KV namespaces must be reverified before activation. Worker URLs are target addresses derived from the account's workers.dev subdomain and configured Worker names; they do not establish that a Worker has been created, deployed or accepted. Never substitute the old infrastructure. The backend's default/local/E2E all-zero namespace placeholders must never be deployed to hosted targets.

| Target     | Vercel project / frontend origin                                           | Worker / intended API origin                                                     | KV namespace                        |
| ---------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| Dev        | `iris-frontend-dev` / `https://iris-frontend-dev.vercel.app`               | `iris-backend-dev` / `https://iris-backend-dev.benhxm.workers.dev`               | `iris-backend-dev-SNAPSHOTS`        |
| Production | `iris-frontend-production` / `https://iris-frontend-production.vercel.app` | `iris-backend-production` / `https://iris-backend-production.benhxm.workers.dev` | `iris-backend-production-SNAPSHOTS` |

Leave `DEPLOY_ENABLED` unset or `false` in both GitHub environments throughout bootstrap. Publishing the first commits can start CI, but must not enable provider deployment. Publish the backend first, set frontend `IRIS_WORKER_SHA` to its exact compatible new commit, and pin each `VITE_OPENAPI_URL` to that repository's exact compatible SHA. Complete native protections before any later deployment authorization.

## Localhost

Run `npm ci` in both repositories. Start the Worker with `npm run dev` (local KV, port 8787) and frontend with `npm start` (localhost:5173). Use `VITE_API_BASE=http://localhost:8787` in the frontend's existing local configuration; do not overwrite local secrets.

`npm run test:vertical` starts a separate seeded, cache-only Worker and frontend preview. Check process ownership and coordinate a free test port before starting; do not stop an unrelated service just because it owns port 8787. It does not access remote KV or providers. Normal local Worker mode can use local provider keys and a local authenticated refresh for live data.

## One-time setup

1. Inventory old provider triggers, Cron, bindings, domains and credential consumers before retiring anything. Preserve current frontend/Worker source and deployment identities; do not assume a historical artifact is recoverable. New Vercel projects must have Git auto-deployment disabled and no automatic Git connection. The checked-in `vercel.json` also disables it, but does not protect historical revisions.
2. Provision/verify fresh dev and production Vercel projects with Node 24, stable URLs, and Git auto-deployment disabled. Each project's Vercel Production target serves that Iris environment—it does not make dev an Iris production deployment. Downtime and new URLs are acceptable; data deletion is a separate decision.
3. Verify the two fresh, distinct hosted Worker KV namespaces against the configured IDs and frontend CORS origins in the backend's `wrangler.toml`; reverify dev/production bindings before activation. Default/local/E2E placeholders stay local. Do not add `remote=true` to local bindings. Production CORS allows only the new production dashboard, never local, dev or retired frontend origins. Verify the backend's canonical OpenAPI server against the newly deployed production API origin.
4. Configure provider keys and `REFRESH_TOKEN` separately as secrets on each remote Worker. Shared dev has no Cron; production retains hourly Cron. Dev still has on-demand provider caches.
5. Solo-maintainer policy: require PRs and successful CI on `main` (frontend `test-and-build` + `vertical`, Worker `test`), including administrators, but no mandatory independent PR approval. Review your own diff before merging; block force pushes and deletion. Configure GitHub environments `dev` and `production` in **both** repositories. Production requires your explicit approval where supported, with **prevent self-review off** so you are not locked out; restrict deployment branches to protected `main` and disable administrator approval bypass. Verify the single `production` gate rather than creating a differently capitalized duplicate. If your GitHub plan cannot enforce approval, keep production disabled and resolve that policy first.

### Operator credential and initial-deployment handoff

- Reuse the existing `HELIUS_API_KEY`, `JUPITER_API_KEY` and `BIRDEYE_API_KEY` from the maintainer's password manager. Enter them directly as secrets on each new Worker, never as GitHub variables, Vercel/browser values, committed files or chat messages. Do not rotate/revoke them or disturb old Workers as part of this setup. Reuse can share provider quotas across environments; keep the old Cron/triggers in the retirement inventory.
- Create separate fresh `REFRESH_TOKEN` values for dev and production and store them securely. Each Worker's secret must match the corresponding GitHub environment's `IRIS_REFRESH_TOKEN` secret. Configure scoped deployment credentials separately (`VERCEL_TOKEN` and `CLOUDFLARE_API_TOKEN`); an interactive CLI login does not populate GitHub secrets.
- Worker creation/initial code deployment, secret entry, merging configuration PRs and activation are explicit operator actions. If a provider requires a Worker to exist before accepting secrets, the maintainer must handle that initial creation without enabling production Cron or data refresh before credentials and production gates are ready. Reverify deployed source/version and bindings afterward; setting secrets may change a provider version identity.
- After the backend configuration is merged, explicitly select and record its exact compatible source SHA for `IRIS_WORKER_SHA` and both environment-specific `VITE_OPENAPI_URL` values (`https://raw.githubusercontent.com/benhammoush/iris-backend/<exact-backend-sha>/openapi.yaml`). Do not pin an unmerged configuration branch or silently retain the bootstrap OpenAPI placeholder. Set `VITE_API_BASE` and `IRIS_WORKER_ORIGIN` to the corresponding intended API origin above, then verify that endpoint after the operator deploys it. These values are configuration, not deployed acceptance.
- Keep all four `DEPLOY_ENABLED` values false until their prerequisites are met. Validate the configured dev pair and recovery path first; only then approve production activation. A passing bootstrap or configuration PR cannot replace hosted acceptance.

Configure these in each GitHub environment, not as shared production repository secrets:

Use password-manager labels `<project>-<environment>-<provider>-<purpose>`, for example
`iris-production-vercel-deploy` and `iris-production-cloudflare-deploy`. GitHub secret
names below remain functional names, not those labels. Each target's deployment
credential is scoped to its own resources. Production needs no dev-verification
token or extra GitHub PAT: the owner reviews dev acceptance/recovery and exact
candidate/configuration identities before native approval. Obsolete-token inventory
and removal are separately authorized; this runbook does not revoke credentials.

| Repository | Variables                                                                 | Secrets                                      |
| ---------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| Frontend   | `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VITE_API_BASE`, `VITE_OPENAPI_URL` | `VERCEL_TOKEN`                               |
| Worker     | `CLOUDFLARE_ACCOUNT_ID`, `IRIS_WORKER_ORIGIN`                             | `CLOUDFLARE_API_TOKEN`, `IRIS_REFRESH_TOKEN` |

Use the corresponding environment's project/API URLs. API origins must be HTTPS with no path/trailing slash. `VITE_OPENAPI_URL` should pin the compatible Worker SHA's public `openapi.yaml`, not a moving branch. `IRIS_REFRESH_TOKEN` must match that Worker's `REFRESH_TOKEN`. Tokens need only their provider's deployment permissions; no cross-repository dispatch or administration-read token is needed.

Set frontend repository variable `IRIS_WORKER_SHA` to the exact compatible Worker commit used by vertical CI. Update it deliberately for coordinated changes, and keep it at the dev-accepted compatible Worker SHA when testing/promoting the frontend. The vertical-CI pin and target OpenAPI pin are separate inputs; record and verify both. A missing pin fails CI; no matching-branch guessing or implicit pin changes.

Leave environment variable `DEPLOY_ENABLED` unset or `false` until that target's settings, storage isolation, secrets, CORS, and protections are verified. Then, with separate activation authorization, set it to `true`. Enable dev first; production requires dev candidate acceptance and applicable recovery evidence. The workflows trust native GitHub protections; they do not audit provider settings or prove manual acceptance for you.

## Daily flow

- Develop locally → PR → existing checks → merge. Each repository independently deploys its tested `main` commit to **dev**.
- For initial dev data or a later refresh, manually run **Iris Worker API — CI & Deploy** from `main`, choose `dev`, provide its exact SHA, and enable `refresh_dev`. Automatic dev merges do not refresh snapshots. Inspect failures before retrying.
- Select a compatible merged frontend/Worker pair for release validation in dev. Manual **dev** redeployment can select an exact SHA from `main`; run the Worker first when both change. All deployments reuse the existing CI checks, not a second test framework. Only automatic dev pushes reject superseded main commits; explicit manual candidate selection may use an older merged SHA.
- Before acceptance, record both source SHAs/versions, provider deployment identities, any previous compatible recovery pair and relevant configuration/pins in release notes. If production has no accepted predecessor, use the explicit first-production policy below rather than inventing a recovery pair. Check the browser flow, `/health`, `/ready`, fresh `/v3/status`, browser-to-API access, CORS and the affected user flow in dev. Fixture data or basic probes do not certify live-provider behavior. Workflow summaries/logs help identify deployments; inspect provider identities rather than assuming a green run proves acceptance.
- Recheck candidate provider identities and relevant configuration after acceptance and immediately before promotion. If another deployment or configuration change interrupted validation, repeat affected acceptance on the selected candidate. Shared dev is mutable; the source input alone is not acceptance evidence, and no custom coordinator or freeze service is introduced.
- After a production failure, inspect both providers before retrying. Production reruns are rejected: start a new exact-SHA dispatch from main and obtain fresh native approval.
- Manually run **Iris Frontend — CI & Deploy** and **Iris Worker API — CI & Deploy** in their respective repositories from `main`, choose **production**, and provide those same dev-accepted source SHAs. Existing checks rerun against each selected source. As sole maintainer, explicitly approve the pair and rollback plan through each repository's native production gate. Production refreshes automatically on release; dev refresh remains explicit. Promotion history is an operator check, not a custom automated gate. Subsequent production smoke checks are read-only.

## Rollback

Restore the prior compatible Vercel deployment and Worker version using provider controls, **without reverting KV data**, then check versions, readiness, status, browser connectivity, and CORS. Rehearse application-artifact restoration in dev before production activation when relevant recovery evidence is missing or invalidated; retain prior rehearsal evidence and its limits rather than repeating it without a reason. Restore and revalidate the selected dev candidate afterward. Missing previous identities/artifacts block recovery. Releases across two providers are not atomic: keep API changes backward-compatible, serialize manual deploys with CI, and inspect both providers after a failure. Basic Worker smoke checks are automated; full browser acceptance is manual.

### Approved first-production policy

Before first production, validate the exact compatible dev pair and rehearse dev rollback. Restore and revalidate the selected candidate pair afterward. Explicitly accept and record that first production has no previous accepted production pair to restore; an initial resource/version or a successful smoke check is not an accepted rollback baseline. Do not fabricate previous identities or treat old/replacement infrastructure as an eligible predecessor.

If first production fails or its outcome is uncertain, stop and inspect both providers and any release-refresh/Cron effects. Recover only through fresh, separately authorized exact-SHA dispatches from main with new native production approval in each affected repository, using an exact dev-accepted compatible pair, Worker first when both change. Repeat affected dev acceptance if source, configuration or compatibility changes. Never blindly retry, rerun production jobs, bypass approval or revert KV data.

Retain the first accepted immutable frontend deployment and compatible Worker version, both source SHAs/versions, configuration/pins and acceptance evidence as the rollback candidate for later releases; reverify eligibility before recovery. The workflows already permit initial deployment without a predecessor, but do not prove these manual prerequisites. This policy does not authorize publication, target activation, resource creation, refresh, deployment or data mutation; per-environment `DEPLOY_ENABLED` and native protections remain mandatory.

## Old infrastructure retirement

Staging is not an active workflow or Worker configuration target. This source bootstrap does not stop any old deployed Cron, disable old deployment triggers, delete a Vercel project/Worker/KV namespace or revoke credentials. Inventory resource owners, credential consumers, triggers/Cron and recovery dependencies before separately authorized retirement of old dev, staging and production resources. Preserve historical release and recovery evidence. Stop old deployment triggers and Cron before retirement; preserve KV until its disposition is explicitly decided. Do not revoke a shared provider credential or touch another project's resources. Archive the old GitHub repositories only after the new pair is retained and verified.

## Configuration and release evidence

Keep new application SHAs, versions, deployment IDs and acceptance evidence in release notes, not as permanent claims in this runbook. Old repository SHAs, settings and provider deployments do not establish acceptance of the new pipeline.

See [RELEASE-NOTES.md](./RELEASE-NOTES.md) for dated dev rehearsal, production acceptance and recovery evidence. Those observations are not a live inventory or authorization to restore a deployment.

Check live bindings, environment-scoped secret names, native gates, `DEPLOY_ENABLED`, stable aliases and the exact compatible Worker/OpenAPI pins before a release. A checked-in configuration or historical successful run does not establish current provider state. Do not change remote settings or refresh data as part of a local check.
