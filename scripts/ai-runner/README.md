# Task runner (Iris pilot and workspace profiles)

One local foreground service owns explicitly authorized tasks through a checked,
reviewed PR. It does not reply to native permissions/forms, merge, deploy, change
board status or infer permission from Ready/Accepted. Keep OpenCode available to
answer **Allow once** and consequential questions; those approvals are intentionally
not unattended. No restart, mode or model choice is needed per task.

The runtime accepts trusted local profiles through its exported `main(profiles)`
entrypoint: repository, canonical checkout, board owner/number, readiness field,
required CI job names and review policy. A workspace dispatcher can reuse this one
implementation for several repositories without copying prompts or task state.
Each profile retains one active implementation; cross-repository priorities and
coordinated changes still need explicit ordered task contracts. Merge permission
does not transfer between profiles. Profiles currently require CodeRabbit review;
missing bot evidence waits, never silently drops that gate.

## Authorize and run

On Project 2, set **Kind = Delivery**, **Status = Ready** and **AI execution =
Authorized** only for the cards you intend to execute. Include exactly one contract
in the existing card body (alongside its requirements):

```ai-task
{
  "repository": "benhammoush/iris-frontend",
  "runKey": "unique-task-identifier",
  "order": 1,
  "endpoint": "pull-request",
  "scope": ["src/example.ts", "src/example.test.ts"],
  "acceptance": ["Describe the observable result and regression check"]
}
```

Use unique positive order and runKey values. Scope and acceptance remain on the
card; session metadata holds only execution identity/checkpoints. No existing
cards are implicitly authorized. Board editors with permission to change this
field are execution authorizers; secure board membership accordingly.

From this checkout, run `npm run ai:tick` for one advancement or `npm run ai:watch`
for continuous pickup and CI/review follow-through. The machine must stay awake
and the foreground process must remain running. This is not an installed Windows
startup service. Requires Node 24, authenticated `gh` with Projects read access,
and the local OpenCode V2 CLI using the C:/Work Build policy. If the executable is
installed elsewhere, set `IRIS_OPENCODE_EXE` to its actual executable path.

The service keeps one implementation/repair active. Reviewed PRs waiting for a
human merge release that slot and remain monitored for new findings. Three repair
rounds are the limit before a focused intervention. Checks and Git commands still
need native approvals; manual localhost acceptance or an explicit skip is required
before publication. Task worktrees preserve the original checkout.

## Stop and recover

Ctrl+C stops polling; it does **not** abort a running task. Restarting recovers
session metadata rather than submitting another initial prompt. An OS-owned local
port lock prevents concurrent watcher processes and is released after crashes.
To revoke a running task, set AI execution to Paused or remove Ready, keeping the
watcher running for its next poll. It interrupts the session, but cannot roll back
commands already completed or cancel external jobs already submitted. Use the
native session interrupt immediately when necessary.

Errors/denials fail closed. For `blocked`/`quarantined`, inspect the reported
OpenCode session and pending native decisions. Quarantine retains the slot: do not
start another runner or reuse its branch while delivery is uncertain. After an
explicit recovery decision, stop/resolve that session before authorizing a new
runKey. Changing requirements during execution revokes the old grant. No automatic
approval, retry of an uncertain prompt, reset or discarded changes is allowed.

## Separate green documentation merger

`merge-green.yml` is **default off** unless repository variable
`IRIS_GREEN_MERGE_ENABLED` is exactly `true`. It uses current trusted-main code,
fresh eligibility evidence and a head-SHA-pinned GitHub merge request, never a
standing grant for future pushes. Application, dependency and control changes
remain manual. The dry-run observer stays read-only and cannot authorize merging.

Activation requires an explicitly approved protection/credential/deployment audit,
positive hosted green evidence, and a dedicated non-bypass installation token in
`IRIS_MERGE_TOKEN` (contents write; pull requests/actions/statuses read;
administration read for protection inspection). Never give that token to the coding
session or use the Actions default token: its merges suppress subsequent workflow
triggers. Native enforcement must include strict app-bound CI/CodeRabbit checks,
admin enforcement, stale review dismissal, conversation resolution, and no review
bypass/force push/deletion. Any existing native human-approval requirements remain
in force; this service neither adds nor relaxes them.
Missing settings hold the merge; this implementation never changes protections.
These extra activation requirements have **not** been approved or applied.

`node scripts/ai-runner/probe-native.mjs` explicitly checks the local API contract
by creating an empty diagnostic session. It submits no model prompt or backlog
work and answers no permissions. Normal tests do not create native sessions.

Merging to main triggers the existing main CI/dev deployment; it does not authorize
production deployment or prove deployed acceptance. Disabling the variable stops
new requests, not a request already accepted by GitHub. Failed/uncertain merge
requests are not retried by the script; inspect PR state before manual redispatch.
