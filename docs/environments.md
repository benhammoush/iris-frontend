# Iris: localhost, dev, production

## Versioned CI/CD entry points

The parent-scoped `@scalar/json-magic` override keeps Undici on patched 7.30.1
without upgrading Scalar or changing its public API. Remove it when Scalar's
declared dependency naturally resolves to a patched compatible release; do not
substitute an Undici major upgrade to silence the audit.

The backend similarly scopes an Undici 7.30.1 override to Miniflare, keeping the
reviewed Worker toolchain. Remove that override when Miniflare's declared
dependency naturally resolves to a patched compatible release.

Automation 4.0 retains flag-free delivery and adds consistent job names and weekly
vulnerability audits. The published immutable shared revision is pinned below;
source adoption does not change live settings or authorize deployment.

The [shared contract](https://github.com/benhammoush/ci-cd-workflows/blob/64b5e00a3d2895a8cba05b040f0d5a0415613d9e/docs/contract.md)
at v4.0.0 is pinned in this frontend's `.github/ci-cd.json`. Backend adoption is
tracked in the [backend configuration](https://github.com/benhammoush/iris-backend/blob/main/.github/ci-cd.json);
adopt the same reviewed shared revision there too. This tooling-only
change preserves the selected compatible Worker/OpenAPI pins. CI checks PRs/main and
delivers successful exact main commits to dev without an opt-in switch. Separate manual
`deploy-production.yml` selects a full merged `sha`, requires retained successful
dev evidence, verifies the candidate and waits for native approval. CI dispatch
is the exact-SHA dev recovery path; the Worker retains explicit `refresh_dev`,
default false. These supersede older combined-workflow/target-selector invocations,
not compatibility, native approval, acceptance, refresh or recovery requirements.

All Ubuntu jobs use `ubuntu-24.04`. The frontend retains all three-engine
account-enabled fixtures and its Chromium vertical suite before building/testing
the actual deployable target. Public core journeys repeat on that exact output in
all three engines; account activation remains a separate setup gate. Worker and
OpenAPI pins stay deliberately unchanged. Explicit public build inputs must match
the selected target; extra provider-only public build values require reviewed
contract changes. Prebuilt frontend and prebundled Worker delivery retain
artifact/configuration digests and immutable provider identities. Frontend smoke
also checks public API/CORS. Production Worker refresh remains one explicit part
of the approved release, without blind retry after uncertainty.

Executable guard rejection tests now live with the pinned shared implementation;
application tests protect delegation, meaningful checks and unchanged resource
contracts. Existing required-check names remain compatibility gates. No merge,
activation, data refresh or deployment is authorized by this migration. Historical
sources lacking versioned hooks fail closed; eligible immutable recovery artifacts
remain a separate, explicitly approved recovery path.

Repositories: `benhammoush/iris-frontend` and `benhammoush/iris-backend`, with two ordinary release CI workflows. No release coordinator or extra GitHub tokens. This is the durable operator runbook, not a live inventory; verify provider and GitHub settings before activation or promotion.

Both repositories retire the advisory `merge-eligibility.yml` pilot; required CI and current-head reviews still gate manual merges. The tested read-only CLI tools remain available, but have no automatic workflow entry point.

Prepared job naming replaces the old verification aliases with standalone `Verify` in both repositories. The settings described below remain the live pre-migration requirements until the owner approves their coordinated replacement. Do not merge these naming changes under unchanged protections; follow the [shared check-name migration](https://github.com/benhammoush/ci-cd-workflows/blob/main/docs/contract.md#canonical-job-names-and-required-check-migration). Workflow comments are limited to two header lines; release procedures remain in this runbook and the shared contract.

The old `dependency-audit.yml` implementations are replaced by thin `weekly-vuln-audit.yml` callers pinned to the same published shared revision as release workflows. Each audit runs weekly or manually after adoption on main. See the [shared audit contract](https://github.com/benhammoush/ci-cd-workflows/blob/64b5e00a3d2895a8cba05b040f0d5a0415613d9e/docs/contract.md#weekly-vulnerability-audits). These checks supplement normal CI; they do not deploy or authorize merges.

### Migration prerequisite

The daily release flow below applies only after both repositories have adopted the versioned workflows on `main`. For this rollout, merge the [backend migration #20](https://github.com/benhammoush/iris-backend/pull/20) before the [frontend migration #29](https://github.com/benhammoush/iris-frontend/pull/29), under separate merge authorization. Until then, a migration PR or its passing CI does not make the new production entry point available on `main`; do not use the legacy combined workflow as a substitute for retained-dev-evidence checks. Merging can automatically deliver an already-enabled dev target and must account for that consequence.

The frontend's `workerSha` and `VITE_OPENAPI_URL` pins select a compatible API/schema revision for integration and documentation, not the backend's release-workflow revision. They may intentionally predate the workflow migration. Keep them unchanged for this workflow-only rollout; any later compatibility-pin update needs its own deliberate validation. Release tooling follows trusted `main`, while candidate application sources are selected by their exact merged SHAs.

## Fresh bootstrap

The new repositories start with independent bootstrap commits; they do not import old Git history or local secrets. Preserve the old repositories until the replacements are verified; archive them only with separate authorization. Do not copy their Git directories, deployment links or environment credentials into Git.

Use only the new environment resources below. Vercel domains and KV namespaces must be reverified before activation. Worker URLs are target addresses derived from the account's workers.dev subdomain and configured Worker names; they do not establish that a Worker has been created, deployed or accepted. Never substitute the old infrastructure. The backend's default/local/E2E all-zero namespace placeholders must never be deployed to hosted targets.

| Target     | Vercel project / frontend origin                                           | Worker / intended API origin                                                     | KV namespace                        |
| ---------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| Dev        | `iris-frontend-dev` / `https://iris-frontend-dev.vercel.app`               | `iris-backend-dev` / `https://iris-backend-dev.benhxm.workers.dev`               | `iris-backend-dev-SNAPSHOTS`        |
| Production | `iris-frontend-production` / `https://iris-frontend-production.vercel.app` | `iris-backend-production` / `https://iris-backend-production.benhxm.workers.dev` | `iris-backend-production-SNAPSHOTS` |

Complete dev configuration and native protections before merging: successful main verification automatically deploys dev, regardless of `DEPLOY_ENABLED`. Hold production by not dispatching its workflow during bootstrap. Publish the backend first, set the frontend's `.github/ci-cd.json` `workerSha` to its exact compatible new commit when compatibility changes, and pin each target's `VITE_OPENAPI_URL` build input to that repository's exact compatible SHA. A tooling-only migration does not silently change compatibility pins.

## Localhost

Run `npm ci` in both repositories. Start the Worker with `npm run dev` (local KV, port 8787) and frontend with `npm start` (localhost:5173). Use `VITE_API_BASE=http://localhost:8787` in the frontend's existing local configuration; do not overwrite local secrets.

`npm run test:vertical` starts a separate seeded, cache-only Worker and frontend preview. Check process ownership and coordinate a free test port before starting; do not stop an unrelated service just because it owns port 8787. It does not access remote KV or providers. Normal local Worker mode can use local provider keys and a local authenticated refresh for live data.

## One-time setup

1. Inventory old provider triggers, Cron, bindings, domains and credential consumers before retiring anything. Preserve current frontend/Worker source and deployment identities; do not assume a historical artifact is recoverable. New Vercel projects must have Git auto-deployment disabled and no automatic Git connection. The checked-in `vercel.json` also disables it, but does not protect historical revisions.
2. Provision/verify fresh dev and production Vercel projects with Node 24, stable URLs, and Git auto-deployment disabled. Each project's Vercel Production target serves that Iris environment—it does not make dev an Iris production deployment. Downtime and new URLs are acceptable; data deletion is a separate decision.
3. Verify the two fresh, distinct hosted Worker KV namespaces against the configured IDs and frontend CORS origins in the backend's `wrangler.toml`; reverify dev/production bindings before activation. Default/local/E2E placeholders stay local. Do not add `remote=true` to local bindings. Production CORS allows only the new production dashboard, never local, dev or retired frontend origins. Verify the backend's canonical OpenAPI server against the newly deployed production API origin.
4. Configure provider keys and `REFRESH_TOKEN` separately as secrets on each remote Worker. Shared dev has no Cron; production retains hourly Cron. Dev still has on-demand provider caches.
5. Manual-merge policy: require PRs and strict successful app-bound `Verify` (GitHub Actions) and `CodeRabbit` checks on `main` in both repositories, including administrators. Replace the former CI aliases only through the coordinated check-name migration. Require at least one approving review, stale-review dismissal, independent last-push approval and resolved conversations. CodeRabbit must review and approve the current head; a successful status alone is not approval. The owner decides when to merge; no automatic merger or merge PAT is required. Block force pushes and deletion. Configure GitHub environments `dev` and `production` in **both** repositories. Production requires your explicit approval where supported, with **prevent self-review off** so you are not locked out; restrict deployment branches to protected `main` and disable administrator approval bypass. Verify the single `production` gate rather than creating a differently capitalized duplicate. If your GitHub plan cannot enforce approval, keep production disabled and resolve that policy first.

### Operator credential and initial-deployment handoff

- Reuse the existing `HELIUS_API_KEY`, `JUPITER_API_KEY` and `BIRDEYE_API_KEY` from the maintainer's password manager. Enter them directly as secrets on each new Worker, never as GitHub variables, Vercel/browser values, committed files or chat messages. Do not rotate/revoke them or disturb old Workers as part of this setup. Reuse can share provider quotas across environments; keep the old Cron/triggers in the retirement inventory.
- Create separate fresh `REFRESH_TOKEN` values for dev and production and store them securely. Each Worker's secret must match the corresponding GitHub environment's `IRIS_REFRESH_TOKEN` secret. Configure scoped deployment credentials separately (`VERCEL_TOKEN` and `CLOUDFLARE_API_TOKEN`); an interactive CLI login does not populate GitHub secrets.
- Worker creation/initial code deployment, secret entry, merging configuration PRs and activation are explicit operator actions. If a provider requires a Worker to exist before accepting secrets, the maintainer must handle that initial creation without enabling production Cron or data refresh before credentials and production gates are ready. Reverify deployed source/version and bindings afterward; setting secrets may change a provider version identity.
- After the backend configuration is merged, explicitly select and record its exact compatible source SHA in the frontend's `.github/ci-cd.json` `workerSha` and both target-specific `VITE_OPENAPI_URL` build inputs (`https://raw.githubusercontent.com/benhammoush/iris-backend/<exact-backend-sha>/openapi.yaml`). Do not pin an unmerged configuration branch or silently retain the bootstrap OpenAPI placeholder. Set declared `VITE_API_BASE` build inputs and matching environment variables, plus the Worker's `IRIS_WORKER_ORIGIN`, to the corresponding intended API origin above, then verify that endpoint after the operator deploys it. These values are configuration, not deployed acceptance.
- Neither target has a deployment-enable flag; merging invokes dev delivery after successful verification. Do not dispatch either production workflow until its prerequisites are met. Validate the configured dev pair and recovery path first; only then approve production execution. A passing bootstrap or configuration PR cannot replace hosted acceptance.

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

The frontend's `.github/ci-cd.json` `workerSha` selects the exact compatible Worker commit used by vertical CI; the versioned workflow does not read the legacy repository variable `IRIS_WORKER_SHA`. Update the declared pin deliberately for coordinated changes, and keep it at the dev-accepted compatible Worker SHA when testing/promoting the frontend. The vertical-CI pin and target OpenAPI pin are separate inputs; record and verify both. A missing pin fails CI; no matching-branch guessing or implicit pin changes.

Both targets ignore `DEPLOY_ENABLED`; verify dev settings, storage isolation, secrets, CORS, and protections before merging. Missing configuration or credentials fail delivery instead of silently skipping it. Production requires a new manual dispatch under separate execution authorization, dev candidate acceptance, applicable recovery evidence and native approval. The workflows trust native GitHub protections; they do not audit provider settings or prove manual acceptance for you.

## Daily flow

- Develop locally → PR → existing checks → merge. Each repository independently deploys its tested `main` commit to **dev**.
- For initial dev data or a later refresh, manually run **CI** (`ci.yml`) in the Worker repository from `main`, provide its exact merged SHA, and enable `refresh_dev`. This entry point targets dev only; there is no target selector. Automatic dev merges do not refresh snapshots. Inspect failures before retrying.
- Select a compatible merged frontend/Worker pair for release validation in dev. Manual **dev** redeployment can select an exact SHA from `main`; run the Worker first when both change. All deployments reuse the existing CI checks, not a second test framework. Only automatic dev pushes reject superseded main commits; explicit manual candidate selection may use an older merged SHA.
- Before acceptance, record both source SHAs/versions, provider deployment identities, any previous compatible recovery pair and relevant configuration/pins in release notes. If production has no accepted predecessor, use the explicit first-production policy below rather than inventing a recovery pair. Check the browser flow, `/health`, `/ready`, fresh `/v3/status`, browser-to-API access, CORS and the affected user flow in dev. Fixture data or basic probes do not certify live-provider behavior. Workflow summaries/logs help identify deployments; inspect provider identities rather than assuming a green run proves acceptance.
- Recheck candidate provider identities and relevant configuration after acceptance and immediately before promotion. If another deployment or configuration change interrupted validation, repeat affected acceptance on the selected candidate. Shared dev is mutable; the source input alone is not acceptance evidence, and no custom coordinator or freeze service is introduced.
- After a production failure, inspect both providers before retrying. Production reruns are rejected: start a new exact-SHA dispatch from main and obtain fresh native approval.
- After the migration prerequisite above is complete, manually run **Deploy production** (`deploy-production.yml`) in each repository from `main` with that repository's full dev-accepted source SHA, Worker first when both change. The compatible pair has two independently selected source SHAs, not one SHA shared across repositories. Existing checks rerun against each selected source, and retained successful dev-delivery evidence for that exact SHA is verified automatically. As sole maintainer, explicitly approve the pair and rollback plan through each repository's native production gate. Production Worker refreshes automatically on release; dev refresh remains explicit. Human acceptance, compatibility and recovery eligibility remain operator checks. Subsequent production smoke checks are read-only.

## Rollback

Restore the prior compatible Vercel deployment and Worker version using provider controls, **without reverting KV data**, then check versions, readiness, status, browser connectivity, and CORS. Rehearse application-artifact restoration in dev before production activation when relevant recovery evidence is missing or invalidated; retain prior rehearsal evidence and its limits rather than repeating it without a reason. Restore and revalidate the selected dev candidate afterward. Missing previous identities/artifacts block recovery. Releases across two providers are not atomic: keep API changes backward-compatible, serialize manual deploys with CI, and inspect both providers after a failure. Basic Worker smoke checks are automated; full browser acceptance is manual.

### Approved first-production policy

Before first production, validate the exact compatible dev pair and rehearse dev rollback. Restore and revalidate the selected candidate pair afterward. Explicitly accept and record that first production has no previous accepted production pair to restore; an initial resource/version or a successful smoke check is not an accepted rollback baseline. Do not fabricate previous identities or treat old/replacement infrastructure as an eligible predecessor.

If first production fails or its outcome is uncertain, stop and inspect both providers and any release-refresh/Cron effects. Recover only through fresh, separately authorized exact-SHA dispatches from main with new native production approval in each affected repository, using an exact dev-accepted compatible pair, Worker first when both change. Repeat affected dev acceptance if source, configuration or compatibility changes. Never blindly retry, rerun production jobs, bypass approval or revert KV data.

Retain the first accepted immutable frontend deployment and compatible Worker version, both source SHAs/versions, configuration/pins and acceptance evidence as the rollback candidate for later releases; reverify eligibility before recovery. The workflows already permit initial deployment without a predecessor, but do not prove these manual prerequisites. This policy does not authorize publication, target activation, resource creation, refresh, deployment or data mutation; production manual dispatch and native protections remain mandatory.

## Old infrastructure retirement

Staging is not an active workflow or Worker configuration target. This source bootstrap does not stop any old deployed Cron, disable old deployment triggers, delete a Vercel project/Worker/KV namespace or revoke credentials. Inventory resource owners, credential consumers, triggers/Cron and recovery dependencies before separately authorized retirement of old dev, staging and production resources. Preserve historical release and recovery evidence. Stop old deployment triggers and Cron before retirement; preserve KV until its disposition is explicitly decided. Do not revoke a shared provider credential or touch another project's resources. Archive the old GitHub repositories only after the new pair is retained and verified.

## Configuration and release evidence

Keep new application SHAs, versions, deployment IDs and acceptance evidence in release notes, not as permanent claims in this runbook. Old repository SHAs, settings and provider deployments do not establish acceptance of the new pipeline.

See [release evidence](release-notes.md) for dated dev rehearsal, production acceptance and recovery evidence. Those observations are not a live inventory or authorization to restore a deployment.

Check live bindings, environment-scoped secret names, native gates, stable aliases and the exact compatible Worker/OpenAPI pins before a release. A checked-in configuration or historical successful run does not establish current provider state. Do not change remote settings or refresh data as part of a local check.
