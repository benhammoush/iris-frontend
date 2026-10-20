/** Deterministic, advisory-only eligibility. No merge or repository mutations. */

const sensitiveNames = new Set([
  'agents.md',
  'claude.md',
  'skill.md',
  'security.md',
  'environments.md',
  'openapi.yaml',
  'vercel.json',
  'vite.config.ts',
  '.coderabbit.yaml',
]);
const sensitivePrefixes = ['.github/', '.opencode/', 'scripts/', 'src/api/'];

/** Plain prose may contain line breaks, but neither paths nor prose need controls. */
function hasControls(text, prose = false) {
  return [...text].some((character) => {
    const code = character.codePointAt(0);
    return (
      (code < 32 || code === 127) &&
      !(prose && ['\n', '\r'].includes(character))
    );
  });
}

/** Reject unsupported policy versions and any attempt to turn this into a merger. */
export function validatePolicy(policy) {
  if (
    policy.version !== 1 ||
    policy.mode !== 'dry-run' ||
    policy.repository !== 'benhammoush/iris-frontend' ||
    policy.base !== 'main' ||
    policy.greenPrefix !== 'docs/user-guide/' ||
    policy.workflow !== '.github/workflows/ci.yml' ||
    JSON.stringify(policy.jobs) !==
      JSON.stringify(['test-and-build', 'vertical']) ||
    policy.reviewBot !== 'coderabbitai[bot]' ||
    policy.reviewContext !== 'CodeRabbit' ||
    !Number.isInteger(policy.maxFiles) ||
    policy.maxFiles < 1 ||
    policy.maxFiles > 3 ||
    !Number.isInteger(policy.maxChangedLines) ||
    policy.maxChangedLines < 1 ||
    policy.maxChangedLines > 80
  ) {
    throw new Error('Unsupported dry-run policy');
  }
}

/** Classify paths first. Small diffs, tests, labels and AI scores grant no eligibility. */
export function classifyFiles(files, policy) {
  validatePolicy(policy);
  if (!Array.isArray(files) || files.length === 0) {
    return { lane: 'amber', reasons: ['No complete changed-file evidence'] };
  }
  for (const file of files) {
    for (const path of [file.filename, file.previous_filename].filter(
      Boolean,
    )) {
      if (
        typeof path !== 'string' ||
        path.includes('\\') ||
        hasControls(path) ||
        path.startsWith('/') ||
        path.split('/').some((part) => part === '.' || part === '..')
      ) {
        return { lane: 'red', reasons: ['Invalid or ambiguous changed path'] };
      }
      const lower = path.toLowerCase();
      if (
        sensitiveNames.has(lower.split('/').at(-1)) ||
        sensitivePrefixes.some((prefix) => lower.startsWith(prefix)) ||
        /(?:auth|payment|migration|contract|deploy|secret|runbook)/i.test(lower)
      ) {
        return {
          lane: 'red',
          reasons: [
            'Control, contract or sensitive paths require human review',
          ],
        };
      }
    }
  }
  const lines = files.reduce(
    (sum, file) => sum + file.additions + file.deletions,
    0,
  );
  const allowed =
    files.length <= policy.maxFiles &&
    Number.isSafeInteger(lines) &&
    lines > 0 &&
    lines <= policy.maxChangedLines &&
    files.every(
      (file) =>
        typeof file.filename === 'string' &&
        file.filename.startsWith(policy.greenPrefix) &&
        file.filename.endsWith('.md') &&
        file.status === 'modified' &&
        !file.previous_filename &&
        Number.isSafeInteger(file.additions) &&
        file.additions >= 0 &&
        Number.isSafeInteger(file.deletions) &&
        file.deletions >= 0 &&
        typeof file.patch === 'string',
    );
  return allowed
    ? { lane: 'green', reasons: [] }
    : {
        lane: 'amber',
        reasons: ['Outside the allowlisted existing user-guide prose lane'],
      };
}

/** Both revisions must be complete ordinary text blobs, not symlinks/markup/code. */
function safeProse(blob) {
  return (
    blob?.mode === '100644' &&
    typeof blob.text === 'string' &&
    Buffer.byteLength(blob.text) <= 64_000 &&
    !hasControls(blob.text, true) &&
    !/[<>`\u202a-\u202e\u2066-\u2069]/.test(blob.text) &&
    !/^(?:---\s*$|\s*~~~| {4}|\t)/m.test(blob.text) &&
    !/(?:javascript|data|vbscript):/i.test(blob.text)
  );
}

/** Recognize CodeRabbit's clean-review coverage when approval has an empty body.
 * Unknown formats, quoted markers, other authors and stale heads fail closed.
 */
export function hasReviewedWalkthrough(
  comments,
  head,
  bot = 'coderabbitai[bot]',
) {
  return (comments ?? []).some((comment) => {
    if (
      comment.author?.login !== bot.replace(/\[bot\]$/, '') ||
      comment.author?.__typename !== 'Bot' ||
      !Object.hasOwn(comment, 'editor') ||
      !Object.hasOwn(comment, 'lastEditedAt') ||
      !(
        (comment.editor === null && comment.lastEditedAt === null) ||
        (comment.editor?.login === bot.replace(/\[bot\]$/, '') &&
          comment.editor?.__typename === 'Bot')
      ) ||
      !comment.body?.startsWith(
        '<!-- This is an auto-generated comment: summarize by coderabbit.ai -->',
      )
    )
      return false;
    const starts = comment.body.split('\n<!-- final_review_risk_start -->\n');
    if (starts.length !== 2) return false;
    const ends = starts[1].split('\n<!-- final_review_risk_end -->');
    if (ends.length !== 2) return false;
    const markers = [
      ...ends[0].matchAll(
        /^<!-- final_review_risk_coverage:(\{[^\r\n]+\}) -->$/gm,
      ),
    ];
    if (markers.length !== 1) return false;
    try {
      const coverage = JSON.parse(markers[0][1]);
      return (
        coverage.sourceCommitId === head &&
        coverage.coveredCommitId === head &&
        coverage.kind === 'reviewed'
      );
    } catch {
      return false;
    }
  });
}

/** Evaluate one immutable snapshot. Positive output is never merge authorization. */
export function evaluateSnapshot(snapshot, policy) {
  const classification = classifyFiles(snapshot.files, policy);
  const reasons = [...classification.reasons, ...(snapshot.errors ?? [])];
  const pr = snapshot.pr;
  if (
    !pr ||
    pr.state !== 'open' ||
    pr.draft ||
    pr.base?.ref !== policy.base ||
    pr.base?.repo?.full_name !== policy.repository ||
    pr.head?.repo?.full_name !== policy.repository
  ) {
    reasons.push(
      'Requires an open, non-draft, same-repository PR targeting main',
    );
  }
  const sha = pr?.head?.sha;
  if (
    !/^[0-9a-f]{40}$/.test(sha ?? '') ||
    !/^[0-9a-f]{40}$/.test(pr?.base?.sha ?? '') ||
    !/^[0-9a-f]{40}$/.test(snapshot.policySha ?? '') ||
    snapshot.finalHead !== sha ||
    snapshot.finalBase !== pr?.base?.sha ||
    snapshot.finalState !== 'open' ||
    snapshot.finalDraft !== false ||
    snapshot.finalBaseRef !== policy.base ||
    snapshot.finalHeadRepository !== policy.repository ||
    snapshot.finalBaseRepository !== policy.repository ||
    snapshot.files?.length !== pr?.changed_files
  ) {
    reasons.push('Candidate changed or changed-file evidence is incomplete');
  }
  if (classification.lane === 'green') {
    if (
      snapshot.native?.headRefOid !== sha ||
      snapshot.native?.baseRefOid !== pr?.base?.sha ||
      snapshot.native?.mergeStateStatus !== 'CLEAN' ||
      snapshot.native?.threadsComplete !== true ||
      snapshot.native?.unresolvedThreads !== 0
    ) {
      reasons.push(
        'Native merge state or review conversations are blocked, stale or unknown',
      );
    }
    if (
      !snapshot.files.every(
        (file) =>
          safeProse(snapshot.blobs?.[file.filename]?.base) &&
          safeProse(snapshot.blobs?.[file.filename]?.head),
      )
    ) {
      reasons.push(
        'Documentation contains code/markup or incomplete/non-regular blob evidence',
      );
    }
    const run = snapshot.run;
    if (
      !run ||
      !Number.isSafeInteger(run.run_attempt) ||
      run.run_attempt < 1 ||
      run.head_sha !== sha ||
      run.event !== 'pull_request' ||
      run.path?.split('@')[0] !== policy.workflow ||
      run.status !== 'completed' ||
      run.conclusion !== 'success' ||
      !run.pull_requests?.some(
        (item) =>
          item.number === pr.number &&
          item.head?.sha === sha &&
          item.base?.sha === pr.base.sha,
      )
    ) {
      reasons.push('Latest matching PR CI run has not succeeded');
    }
    for (const name of policy.jobs) {
      const jobs = snapshot.jobs?.filter((job) => job.name === name) ?? [];
      if (
        jobs.length !== 1 ||
        jobs[0].status !== 'completed' ||
        jobs[0].conclusion !== 'success'
      ) {
        reasons.push(
          `Required CI job is missing, ambiguous or not successful: ${name}`,
        );
      }
    }
    const reviews = snapshot.reviews ?? [];
    const botReviews = reviews
      .filter(
        (review) =>
          review.user?.login === policy.reviewBot &&
          review.user?.type === 'Bot' &&
          review.commit_id === sha,
      )
      .sort((a, b) => b.id - a.id);
    // The completed publication and the automatic approval can be separate
    // GitHub reviews. Neither one alone is sufficient.
    const review = botReviews.find((item) =>
      item.body?.includes('<!-- coderabbit-review-publication v1 '),
    );
    // A bare approve/resolve override is not a completed published review.
    // This vendor publication marker is intentionally fail-closed if it changes.
    const published =
      review &&
      ['COMMENTED', 'APPROVED'].includes(review.state) &&
      !/review skipped|rate.limit|review failed/i.test(review.body);
    if (
      !published &&
      !hasReviewedWalkthrough(snapshot.walkthroughs, sha, policy.reviewBot)
    ) {
      reasons.push(
        'No recognized completed CodeRabbit review of the current HEAD',
      );
    }
    const decision = botReviews.find((item) =>
      ['APPROVED', 'CHANGES_REQUESTED'].includes(item.state),
    );
    if (decision?.state !== 'APPROVED')
      reasons.push('CodeRabbit has not approved the current HEAD');
    const status = snapshot.reviewStatus;
    if (
      snapshot.statusSha !== sha ||
      status?.context !== policy.reviewContext ||
      status.creator?.login !== policy.reviewBot ||
      status.creator?.type !== 'Bot' ||
      status.state !== 'success' ||
      status.description !== 'Review completed'
    ) {
      reasons.push(
        'CodeRabbit completion status is missing, pending or unrecognized',
      );
    }
    const decisions = new Map();
    for (const item of [...reviews].sort((a, b) => a.id - b.id)) {
      if (['APPROVED', 'CHANGES_REQUESTED'].includes(item.state))
        decisions.set(item.user?.login, item.state);
    }
    if ([...decisions.values()].includes('CHANGES_REQUESTED'))
      reasons.push('A reviewer still requests changes');
  }
  return {
    mode: 'dry-run',
    canMerge: false,
    authorization: 'manual-only',
    pr: pr?.number ?? null,
    head: sha ?? null,
    base: pr?.base?.sha ?? null,
    policy: snapshot.policySha ?? null,
    lane: classification.lane,
    wouldPassProposedRules: reasons.length === 0,
    reasons: [...new Set(reasons)],
  };
}
