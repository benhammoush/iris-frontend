# Iris Frontend

Source bootstrap for `benhammoush/iris-frontend`, paired with `benhammoush/iris-backend`. Existing application versions are retained; a history reset is not an application release. No hosted configuration or credentials are included. Complete [ENVIRONMENTS.md](./ENVIRONMENTS.md) before enabling deployments. The default GitHub documentation URL becomes available only after the backend is published; local API docs can use an explicitly configured public OpenAPI URL.

Iris is a Vite market monitor and public-wallet viewer backed only by the Iris Worker API. The browser never contacts chain, pricing, or legacy application providers directly. Visit `/api-docs` for interactive Scalar documentation of the Worker API.

For the detailed frontend-to-Worker organigram, request map, cache layers, provider boundaries, and refresh flow, see the backend repository's [`ARCHITECTURE.md`](https://github.com/benhammoush/iris-backend/blob/main/ARCHITECTURE.md).

## Architecture

`src/api/client.ts` is the sole HTTP client. It reads `VITE_API_BASE`, adds request IDs, applies a 10-second timeout, parses Worker response envelopes (`{ data, meta }`), and normalizes failures. JSON enters as `unknown`; the client validates envelope/metadata objects without asserting endpoint shapes. `src/api/worker.ts` types route arguments and transport/pagination options for the Worker `/v3` routes; endpoint data stays unknown until normalization. Emergency fixtures are typed, preserve null valuations, and remain explicitly opt-in.

Worker errors are shown to users. Market, asset catalog, and swap requests use local, non-sensitive emergency display fixtures only when `VITE_ENABLE_FIXTURES=true`; the status line identifies fixture data. Wallet details never use a fixture address: an unconfigured or unknown address is shown as not tracked.

Asset detail renders Birdeye USD candlesticks and USD volume for its selected mint and `1H`, `4H`, `1D`, or `7D` range. Current metrics are labeled as Jupiter. Its Helius-branded intelligence panel shows mint-address history and the 20 largest token accounts; mint history is not represented as a complete token-wide transfer ledger and largest accounts are not unique holders. Between the Helius and Jupiter cards, DefiLlama shows aggregate Solana DEX volume and tracked DeFi protocols ranked by Solana TVL; it is not an inventory of all Solana programs. Optional metrics stay hidden if absent. Asset audit metadata is displayed as an indicator only and never as a safety claim. Wallets show priced subtotals and valuation coverage when pricing is partial, and load transaction pages using Worker cursors.

The compact status display shows Worker provenance and freshness only when supplied, with diagnostics for errors.

## Local Development

1. Copy `.env.example` to `.env.local` and set the Worker origin. Do not put credentials in browser environment variables.
2. Run `npm ci`.
3. Run `npm start`.

The frontend runs at `http://localhost:5173`. Start the sibling Worker's local server with `npm run dev` on port 8787. Use `npm test` for a non-watch test run and `npm run build` for a production build.

Browser support starts at Chrome 111, Firefox 128, and Safari 16.4. Tailwind 4 uses the Vite plugin and `src/index.css`, retaining the existing custom theme and selector-based dark mode through `tailwind.config.js`.

## API Documentation And Dependency Maintenance

Scalar loads the configured `VITE_OPENAPI_URL` (use a compatible exact Worker source SHA for shared releases), displays the document version, and supports operation fragment links. Its server list is overridden with the dashboard's `VITE_API_BASE`, so dev docs do not default to production just because the contract declares a production server. Local development retains the dashboard's localhost:8787 fallback. Missing deployment API configuration shows an error instead of mounting the interactive renderer. There is no hosted proxy. Authentication is session-only: credentials are not persisted across reloads. Telemetry, AI Agent, default external fonts, and developer publishing controls are disabled. Documentation remains light-themed as before; dashboard light/dark preferences remain independent.

Scalar React 0.9.79 pins affected AI SDK versions in its optional agent dependency. The narrowly scoped `@scalar/agent-chat` overrides in `package.json` select `ai@6.0.214` and `@ai-sdk/vue@3.0.214`, resolving patched provider-utils 4.0.33 and gateway 3.0.139. The agent remains disabled; this is not an AI feature addition. Remove these overrides when a supported Scalar release provides patched dependencies itself, then repeat full and production-only audits, clean install, build, unit, interactive-docs browser, and vertical checks. Do not blindly apply audit's older Scalar downgrade or major overrides. Zero reported findings are not a complete security guarantee.

Scalar is loaded only on `/api-docs`, but its renderer bundle is larger than the former Swagger renderer. Track documentation load performance separately from the dashboard; do not hide the build chunk warning.

## Provider brand assets

The Birdeye chart header uses unmodified, locally served official wordmarks: [white letters](https://birdeye.so/be/light-logo-v2.png) on dark surfaces and [dark letters](https://birdeye.so/be/dark-logo.png) on light surfaces. See Birdeye's [brand assets and usage guidance](https://learn.birdeye.so/docs/brand-assets). Theme switching selects the matching asset without recoloring it.

## Testing

`npm run verify:fast` runs lint, TypeScript checking and unit/component tests for quick local feedback. `npm run verify` adds formatting/tooling guards, dependency audits, version checks, a production build, generated-contract drift detection, three-engine browser tests and local vertical tests. Both stop at the first failure and never publish or deploy. Install the browser engines as described below and provide the intended compatible backend checkout through `IRIS_WORKER_ROOT` (or the default sibling) before the full command. A local checkout is not proof of the exact Worker revision used in CI; CI retains its explicit SHA pin and existing required checks. Neither command replaces manual localhost acceptance before publication or hosted release acceptance.

All application modules and unit tests under `src/` now use TypeScript. Strict checking includes the Vite/Playwright configurations and browser tests, with `allowJs: false`. Lint rejects explicit `any`, non-null assertions and TypeScript suppression comments; the tooling guard rejects reintroduced application JavaScript. Charts use the library's chart/series API types. Existing finite timestamp conversions use the chart library's required branded time assertion, not an assertion of unvalidated API JSON.

API JSON enters as `unknown`; normalizers narrow containers and consumed fields, retaining opaque atomic/balance strings and null market/metadata values. Malformed records without a mint are excluded from asset lists. Contexts carry normalized types without legacy component casts. Generated contract types supply asset field models, metadata and route parameter unions; they never assert unvalidated endpoint JSON. The resource hook preserves loader data/metadata types and unknown errors; tests cover polling, stale-request cancellation and failed-refresh retention. Solana address input remains a lexical check, not a replacement for Worker public-key validation. Wallet cursor strings retain their case and punctuation.

`npm run generate:contracts` regenerates `src/api/generated.ts` from the sibling backend checkout's canonical `openapi.yaml`; set `IRIS_WORKER_ROOT` for another checkout. `npm run check:contracts` rejects drift. Vertical CI uses its exact `IRIS_WORKER_SHA` backend checkout for that check. Publish the backend bootstrap first and explicitly configure its compatible SHA before frontend CI can pass. Old repository SHAs are not valid bootstrap pins. No automatic pin updates or duplicate contract snapshots are used.

Use Node 24 (`.nvmrc`, package engines and CI). Run `npm run lint`, `npm run format:check`, `npm run check:tooling`, `npm run audit:dependencies`, `npm run check:versions` and `npm run check` in addition to the tests below. `npm run format` applies mechanical formatting; review that diff separately from behavior changes. `check:tooling` verifies that the configured guards actually reject invalid code and formatting. See [SECURITY.md](./SECURITY.md) for dependency and operator-only secret-scanning checks.

`npm test` runs frontend unit and component tests. `npm run test:e2e` runs deterministic browser journeys across Chromium, Firefox and WebKit with Worker requests intercepted by test fixtures. Install those engines with `npx playwright install chromium firefox webkit` first. These current-engine checks do not certify the exact minimum browser versions or real Safari releases.

`src/delivery.test.ts` runs the workflow's manual-input guard with valid and invalid public fixtures and checks the surrounding release controls structurally. It uses Bash on CI/Linux and Git Bash on Windows; set `IRIS_TEST_BASH` to the executable path for a nonstandard Windows installation. It does not contact GitHub/providers, check out candidate commits or certify native approval and dev acceptance.

`npm run test:vertical` runs the built frontend against a real local Wrangler Worker and fresh local KV records. It requires the backend checkout as a sibling named `iris-backend`, or `IRIS_WORKER_ROOT` can point to another checkout. The suite disables provider access in the Worker and fails if the browser calls a provider directly. CI requires the explicit compatible backend SHA in `IRIS_WORKER_SHA`; it never guesses a matching branch.

## Backlog to PR and merge eligibility

Use the existing product board: an ordered Ready task must have an outcome, acceptance criteria, bounded scope and explicit authorization through the intended endpoint. Accepted direction or a Ready label alone grants no execution/publication permission. AI owns implementation, in-scope check repairs, review feedback and authorized PR/CI follow-through; you decide priorities, consequential scope changes and required acceptance. Start with one active implementation per repository. Merged, deployed and accepted remain distinct.

The separate **Merge eligibility (dry run)** workflow observes PR changes and CI/CodeRabbit completion. It executes only main's pinned revision with a read-only token, never PR code, installs, artifacts or a merge command. Reports record candidate/base/policy identities and exact holds; they are snapshots, not required checks or permission to merge. Manual dispatch from main refreshes review/thread changes that emit no supported event.

The proposed green lane is limited to small edits of existing ordinary prose Markdown under `docs/user-guide/`; it deliberately has no eligible application/test/dependency changes. New/removed/renamed files, code/HTML/frontmatter/symlinks and incomplete evidence hold for human review. Control/security/API paths are red; other changes are amber. Limits and CI identities live in `.github/merge-policy.json`, not AI labels or effort scores. No guide files are seeded merely to create eligibility.

Green candidates additionally need CI for the exact head/base pair, a recognized completed CodeRabbit review **and an approving review on the current HEAD**, completion status, resolved conversations and clean native merge state. Publication and approval may be separate reviews; bare approval overrides are insufficient. Native protection must require at least one approving review, stale-review dismissal and approval of the last push by someone other than its pusher. `.coderabbit.yaml` enables automatic approvals after review requirements pass and disables author-triggered approval/resolve overrides. The observed publication marker/status format is vendor-specific: changes or missing evidence hold, not pass. CI/review evidence is sampled twice and changed evidence holds. `npm run test:merge-policy` exercises positive and hostile fixtures without GitHub access. Live automatic merging still requires separately approved activation, credentials and deployment-impact verification; sensitive changes and production remain manual.

The separate `merge-green.yml` service is implemented but default-off. Activation requires explicit approval and hosted positive-green validation, app-bound CI/CodeRabbit branch requirements with admin enforcement and no bypass/force push/deletion, and a dedicated non-bypass installation token in `IRIS_MERGE_TOKEN` (contents write; pull requests/actions/statuses/administration read). Store that token only in the `iris-green-merge` environment, restrict that environment to `main`, and never duplicate it as a repository-level secret; this job's environment reference does not provision those protections. Only then set repository variable `IRIS_GREEN_MERGE_ENABLED` to exactly `true`. It reevaluates current trusted-main evidence and submits at most one confirmed head-SHA-pinned squash merge per run; it never grants standing permission for future pushes. Do not use the default Actions token: its merges suppress downstream CI/dev-deployment triggers. Disabling the variable prevents new requests, not an accepted request. Inspect uncertain results before redispatch; merge is not deployed acceptance. Shared local coding orchestration is not part of this repository.

## Vercel

Git auto-deployment is disabled in repository configuration. See [ENVIRONMENTS.md](./ENVIRONMENTS.md) for separate dev/production projects: existing CI deploys dev automatically and production manually from the exact dev-accepted source. Manual exact-SHA dev redeployment remains available. Configure native approvals and provider settings before enabling deployments; removal of staging configuration does not retire live resources.

Vercel uses Node 24 (`.nvmrc`) and `vercel.json` to build `dist/`. The SPA fallback explicitly excludes `/api` so it cannot return `index.html` for API requests. This app does not configure an `/api/:path*` proxy because it calls the Worker directly.

In Vercel Project Settings -> Environment Variables, set `VITE_API_BASE` to the public Worker origin for Production, Preview, and Development as needed. Set `VITE_OPENAPI_URL` to the published Worker `openapi.yaml` when production documentation should follow a different branch or release; it otherwise uses the canonical GitHub document. Redeploy after changing either because Vite embeds `VITE_*` values at build time. Production without `VITE_API_BASE` renders `CONFIGURATION_ERROR` on product routes instead of guessing a Worker hostname; `/api-docs` also shows a configuration error without mounting the interactive renderer. Set `VITE_ENABLE_FIXTURES=true` only for an intentional emergency display-fixture deployment; otherwise leave it unset or `false`. These values are public browser configuration, not secrets.
