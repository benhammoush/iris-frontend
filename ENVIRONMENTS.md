# Iris: localhost, dev, production

Repositories: `benhammoush/iris-frontend` and `benhammoush/iris-backend`, with two ordinary release CI workflows. No release coordinator or extra GitHub tokens. This is the durable operator runbook, not a live inventory; verify provider and GitHub settings before activation or promotion.

## Fresh bootstrap

These source snapshots intentionally contain no Git history, local secrets or old hosted resource IDs. Create independent repositories with one bootstrap commit each, backend first. Preserve the old repositories until the replacements are verified; archive them only with separate authorization. Do not copy their Git directories, deployment links or environment credentials into Git.

Intended new resource names are Vercel projects `iris-frontend-dev` and `iris-frontend-production`, Workers `iris-backend-dev` and `iris-backend-production`, and distinct KV namespaces `iris-backend-dev-SNAPSHOTS` and `iris-backend-production-SNAPSHOTS`. Names and actual URLs must be verified during provisioning; none is claimed to exist. `.example.invalid` origins and all-zero KV IDs in the backend are deliberate unconfigured placeholders, not deployable settings. Replace them with verified new origins/IDs and update the canonical OpenAPI server before activation. Never substitute the old infrastructure.

Leave `DEPLOY_ENABLED` unset or `false` in both GitHub environments throughout bootstrap. Publishing the first commits can start CI, but must not enable provider deployment. Publish the backend first, set frontend `IRIS_WORKER_SHA` to its exact compatible new commit, and pin each `VITE_OPENAPI_URL` to that repository's exact compatible SHA. Complete native protections before any later deployment authorization.

## Localhost

Run `npm ci` in both repositories. Start the Worker with `npm run dev` (local KV, port 8787) and frontend with `npm start` (localhost:5173). Use `VITE_API_BASE=http://localhost:8787` in the frontend's existing local configuration; do not overwrite local secrets.

`npm run test:vertical` starts a separate seeded, cache-only Worker and frontend preview. Check process ownership and coordinate a free test port before starting; do not stop an unrelated service just because it owns port 8787. It does not access remote KV or providers. Normal local Worker mode can use local provider keys and a local authenticated refresh for live data.

## One-time setup

1. Inventory old provider triggers, Cron, bindings, domains and credential consumers before retiring anything. Preserve current frontend/Worker source and deployment identities; do not assume a historical artifact is recoverable. New Vercel projects must have Git auto-deployment disabled and no automatic Git connection. The checked-in `vercel.json` also disables it, but does not protect historical revisions.
2. Provision/verify fresh dev and production Vercel projects with Node 24, stable URLs, and Git auto-deployment disabled. Each project's Vercel Production target serves that Iris environment—it does not make dev an Iris production deployment. Downtime and new URLs are acceptable; data deletion is a separate decision.
3. Provision/verify two fresh, distinct hosted Worker KV namespaces. Set their actual IDs and corresponding stable frontend CORS origins in the backend's `wrangler.toml`; reverify dev/production bindings before activation. Shared bootstrap placeholders must be replaced; local/E2E placeholders stay local. Do not add `remote=true` to local bindings. Production CORS allows only the new production dashboard, never local, dev or retired frontend origins. Replace the backend OpenAPI server placeholder with the verified new production API origin.
4. Configure provider keys and `REFRESH_TOKEN` separately as secrets on each remote Worker. Shared dev has no Cron; production retains hourly Cron. Dev still has on-demand provider caches.
5. Solo-maintainer policy: require PRs and successful CI on `main` (frontend `test-and-build` + `vertical`, Worker `test`), including administrators, but no mandatory independent PR approval. Review your own diff before merging; block force pushes and deletion. Configure GitHub environments `dev` and `production` in **both** repositories. Production requires your explicit approval where supported, with **prevent self-review off** so you are not locked out; restrict deployment branches to protected `main` and disable administrator approval bypass. Preserve and verify the existing `Production` gate rather than assuming a second independent gate. If your GitHub plan cannot enforce approval, keep production disabled and resolve that policy first.

Configure these in each GitHub environment, not as shared production repository secrets:

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
- Before acceptance, record both source SHAs/versions, provider deployment identities, previous compatible recovery pair and relevant configuration/pins in release notes. Check the browser flow, `/health`, `/ready`, fresh `/v3/status`, browser-to-API access, CORS and the affected user flow in dev. Fixture data or basic probes do not certify live-provider behavior. Workflow summaries/logs help identify deployments; inspect provider identities rather than assuming a green run proves acceptance.
- Recheck candidate provider identities and relevant configuration after acceptance and immediately before promotion. If another deployment or configuration change interrupted validation, repeat affected acceptance on the selected candidate. Shared dev is mutable; the source input alone is not acceptance evidence, and no custom coordinator or freeze service is introduced.
- Manually run **Iris Frontend — CI & Deploy** and **Iris Worker API — CI & Deploy** in their respective repositories from `main`, choose **production**, and provide those same dev-accepted source SHAs. Existing checks rerun against each selected source. As sole maintainer, explicitly approve the pair and rollback plan through each repository's native production gate. Production refreshes automatically on release; dev refresh remains explicit. Promotion history is an operator check, not a custom automated gate. Subsequent production smoke checks are read-only.

## Rollback

Restore the prior compatible Vercel deployment and Worker version using provider controls, **without reverting KV data**, then check versions, readiness, status, browser connectivity, and CORS. Rehearse application-artifact restoration in dev before production activation when relevant recovery evidence is missing or invalidated; retain prior rehearsal evidence and its limits rather than repeating it without a reason. Restore and revalidate the selected dev candidate afterward. Missing previous identities/artifacts block recovery. Releases across two providers are not atomic: keep API changes backward-compatible, serialize manual deploys with CI, and inspect both providers after a failure. Basic Worker smoke checks are automated; full browser acceptance is manual.

## Old infrastructure retirement

Staging is not an active workflow or Worker configuration target. This source bootstrap does not stop any old deployed Cron, disable old deployment triggers, delete a Vercel project/Worker/KV namespace or revoke credentials. Inventory resource owners, credential consumers, triggers/Cron and recovery dependencies before separately authorized retirement of old dev, staging and production resources. Preserve historical release and recovery evidence. Stop old deployment triggers and Cron before retirement; preserve KV until its disposition is explicitly decided. Do not revoke a shared provider credential or touch another project's resources. Archive the old GitHub repositories only after the new pair is retained and verified.

## Configuration and release evidence

Keep new application SHAs, versions, deployment IDs and acceptance evidence in release notes, not as permanent claims in this runbook. Old repository SHAs, settings and provider deployments do not establish acceptance of the new pipeline.

Check live bindings, environment-scoped secret names, native gates, `DEPLOY_ENABLED`, stable aliases and the exact compatible Worker/OpenAPI pins before a release. A checked-in configuration or historical successful run does not establish current provider state. Do not change remote settings or refresh data as part of a local check.
