'use strict';

/**
 * Merge Shepherd — opt-in PR merge queue.
 *
 * Runs via actions/github-script (see .github/workflows/merge-shepherd.yml).
 * Pure decision functions (selectBatch, planForBatchMember, parseStateComment,
 * buildStateCommentBody) are unit-tested in merge-shepherd.test.js; the rest
 * are thin executors around the GitHub API.
 */

const CONFIG = {
    QUEUE_LABEL: 'auto-merge',
    FAILED_LABEL: 'auto-merge-failed',
    BATCH_SIZE: 3,
    MAX_RETRIES: 5,
    MERGE_METHOD: 'MERGE',
    STATE_MARKER: 'merge-shepherd-state',
    // GraphQL CheckRun conclusions that count as a pass for a required check; any other
    // non-null conclusion (including ones not yet defined by GitHub) counts as a failure
    PASSING_CHECK_CONCLUSIONS: ['SUCCESS', 'SKIPPED', 'NEUTRAL'],
};

// Maps a call-site context key to the GitHub App permission(s) that govern it, used to build
// actionable diagnostics when that call site fails with a permission error.
const PERMISSION_HINTS = {
    'preflight-rollup': 'Commit statuses: Read-only and Checks: Read-only (statusCheckRollup)',
    'preflight-labels': 'Issues: Read & write',
    'labels': 'Issues: Read & write',
    'comments': 'Issues: Read & write',
    'preflight-runs': 'Actions: Read (write is verified at first retry)',
    'rerun': 'Actions: Read & write',
    'preflight-contents': 'Contents: Read & write (probe verifies read)',
    'queue-query': 'Pull requests: Read & write',
    'automerge': 'Pull requests: Read & write',
    'update-branch': 'Contents: Read & write',
    'merge': 'Contents: Read & write',
    'required-checks': 'Checks: Read-only, Commit statuses: Read-only, Actions: Read (workflow run links), and possibly Administration: Read-only (required-check evaluation)',
};

// Maps an executed action's type to the permission-hint context key it depends on, used to
// translate a failed action's error when it turns out to be a permission error. A tagged
// error's own shepherdContext (see tagContext) always takes precedence over this fallback.
const ACTION_CONTEXT = {
    'enable-automerge': 'automerge',
    'merge': 'merge',
    'update-branch': 'update-branch',
    'retry': 'rerun',
    'eject': 'labels',
};

/**
 * Detects whether an error indicates a missing GitHub App permission
 * @param {*} err - error thrown by an octokit call (REST or GraphQL)
 * @returns {boolean} true when the error looks like a missing-permission failure
 */
function isPermissionError(err) {
    if (!err) {
        return false;
    }
    if (err.status === 403) {
        return true;
    }
    if (typeof err.message === 'string' && /resource not accessible/i.test(err.message)) {
        return true;
    }
    if (Array.isArray(err.errors)) {
        return err.errors.some((e) => e && (e.type === 'FORBIDDEN' || (typeof e.message === 'string' && /resource not accessible/i.test(e.message))));
    }
    return false;
}

/**
 * Builds an actionable message for a permission error in a given context
 * @param {string} contextKey - which call site the error came from (see PERMISSION_HINTS)
 * @param {Error} err - the underlying error
 * @returns {string} actionable message naming the missing permission and the fix path
 */
function explainPermissionError(contextKey, err) {
    const hint = PERMISSION_HINTS[contextKey] || 'unknown permission';
    const errMessage = (err && typeof err.message === 'string') ? err.message.slice(0, 200) : '';
    return 'Missing GitHub App permission — ' + hint + '. Fix: org Settings → Developer settings → GitHub Apps → '
        + 'merge-shepherd → Permissions, then accept the permission update on the repository installation. '
        + 'See docs/MERGE_SHEPHERD.md. (context: ' + contextKey + '; error: ' + errMessage + ')';
}

/**
 * Tags an error with the permission context of the call site that threw it, then rethrows
 * @param {*} err - error thrown by an octokit call
 * @param {string} contextKey - the call-site context key to attribute the error to (see PERMISSION_HINTS)
 * @returns {never} never returns — always rethrows
 */
function tagContext(err, contextKey) {
    if (err && !err.shepherdContext) {
        err.shepherdContext = contextKey;
    }
    throw err;
}

/**
 * Parses shepherd retry state from a bot comment body
 * @param {string|null} body - comment body
 * @returns {{sha: string, retries: number}|null} parsed state, or null if absent/malformed
 */
function parseStateComment(body) {
    const match = new RegExp('<!--\\s*' + CONFIG.STATE_MARKER + '\\s+(\\{.*?\\})\\s*-->').exec(body || '');
    if (!match) {
        return null;
    }
    try {
        const state = JSON.parse(match[1]);
        if (typeof state.sha === 'string' && typeof state.retries === 'number') {
            return { sha: state.sha, retries: state.retries };
        }
    }
    catch (e) {
        // malformed JSON in marker — treat as no state
    }
    return null;
}

/**
 * Builds the bot state comment body for a retry
 * @param {{sha: string, retries: number}} state - current retry state
 * @returns {string} comment body with human text and machine-readable marker
 */
function buildStateCommentBody(state) {
    return '🤖 **Merge Shepherd**: checks failed on `' + state.sha.slice(0, 7) + '` — re-running failed jobs '
        + '(retry ' + state.retries + '/' + CONFIG.MAX_RETRIES + '). '
        + 'The PR is ejected from the queue if this keeps failing.\n'
        + '<!-- ' + CONFIG.STATE_MARKER + ' ' + JSON.stringify(state) + ' -->';
}

/**
 * Selects the batch of PRs to shepherd this run
 * @param {object[]} snapshots - PR snapshots (see Task 1 interface notes)
 * @param {number} [batchSize] - max PRs to admit into the batch (defaults to CONFIG.BATCH_SIZE)
 * @returns {{batch: object[], skipped: {number: number, reason: string}[]}} batch members and skipped PRs with reasons
 */
function selectBatch(snapshots, batchSize) {
    const limit = typeof batchSize === 'number' ? batchSize : CONFIG.BATCH_SIZE;
    const sorted = snapshots.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const batch = [];
    const skipped = [];
    for (const pr of sorted) {
        let reason = null;
        if (pr.isDraft) {
            reason = 'draft';
        }
        else if (pr.reviewDecision !== 'APPROVED') {
            reason = 'not approved';
        }
        else if (pr.unresolvedThreads > 0) {
            reason = 'unresolved conversations';
        }
        else if (batch.length >= limit) {
            reason = 'queued behind batch';
        }
        if (reason) {
            skipped.push({ number: pr.number, reason });
        }
        else {
            batch.push(pr);
        }
    }
    return { batch, skipped };
}

/**
 * Decides what to do with one batch member
 * @param {object} pr - PR snapshot enriched with mergeStateStatus and state
 * @returns {object[]} list of actions to execute for this PR
 */
function planForBatchMember(pr) {
    if (pr.mergeable === 'CONFLICTING' || pr.mergeStateStatus === 'dirty') {
        return [{ type: 'eject', number: pr.number, reason: 'conflict' }];
    }
    if (pr.mergeable === 'UNKNOWN' || pr.mergeStateStatus === 'unknown') {
        return [{ type: 'wait', number: pr.number, reason: 'mergeability being computed' }];
    }
    const actions = [];
    if (pr.mergeStateStatus === 'behind') {
        if (!pr.autoMergeEnabled) {
            actions.push({ type: 'enable-automerge', number: pr.number });
        }
        actions.push({ type: 'update-branch', number: pr.number });
        return actions;
    }
    if (pr.checksFailed) {
        const retries = (pr.state && pr.state.sha === pr.headSha) ? pr.state.retries : 0;
        if (retries >= CONFIG.MAX_RETRIES) {
            return [{ type: 'eject', number: pr.number, reason: 'failed-checks' }];
        }
        // arm while retrying too, so a green re-run merges the instant it completes
        // instead of waiting for the next bot cycle to reach the wait branch
        if (!pr.autoMergeEnabled) {
            actions.push({ type: 'enable-automerge', number: pr.number });
        }
        actions.push({ type: 'retry', number: pr.number, nextRetries: retries + 1 });
        return actions;
    }
    if (pr.mergeStateStatus === 'clean' || pr.mergeStateStatus === 'unstable') {
        return [{ type: 'merge', number: pr.number }];
    }
    if (!pr.autoMergeEnabled) {
        actions.push({ type: 'enable-automerge', number: pr.number });
    }
    actions.push({ type: 'wait', number: pr.number, reason: pr.checksPending ? 'checks running' : 'awaiting merge' });
    return actions;
}

const QUEUE_QUERY = `
query($owner: String!, $repo: String!, $label: String!) {
    repository(owner: $owner, name: $repo) {
        pullRequests(states: OPEN, labels: [$label], first: 50, orderBy: {field: CREATED_AT, direction: ASC}) {
            nodes {
                id
                number
                title
                createdAt
                isDraft
                mergeable
                reviewDecision
                headRefOid
                author { login }
                autoMergeRequest { enabledAt }
                labels(first: 20) { nodes { name } }
                reviewThreads(first: 100) { nodes { isResolved } }
                commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
            }
        }
    }
}`;

const CLOSED_FAILED_LABEL_QUERY = `
query($owner: String!, $repo: String!, $label: String!) {
    repository(owner: $owner, name: $repo) {
        pullRequests(states: [MERGED, CLOSED], labels: [$label], first: 20, orderBy: {field: UPDATED_AT, direction: DESC}) {
            nodes { number }
        }
    }
}`;

const REQUIRED_CHECKS_QUERY = `
query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
            commits(last: 1) {
                nodes {
                    commit {
                        statusCheckRollup {
                            contexts(first: 100) {
                                nodes {
                                    __typename
                                    ... on CheckRun {
                                        name
                                        conclusion
                                        isRequired(pullRequestNumber: $number)
                                        checkSuite { workflowRun { databaseId url } }
                                    }
                                    ... on StatusContext {
                                        context
                                        state
                                        isRequired(pullRequestNumber: $number)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}`;

const ENABLE_AUTOMERGE_MUTATION = `
mutation($prId: ID!, $mergeMethod: PullRequestMergeMethod!) {
    enablePullRequestAutoMerge(input: {pullRequestId: $prId, mergeMethod: $mergeMethod}) {
        pullRequest { number }
    }
}`;

const PREFLIGHT_ROLLUP_QUERY = `
query($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
        defaultBranchRef {
            target {
                ... on Commit { statusCheckRollup { state } }
            }
        }
    }
}`;

/**
 * Normalizes a GraphQL PR node into a snapshot for the pure planners
 * @param {object} node - GraphQL pullRequest node from QUEUE_QUERY
 * @returns {object} PR snapshot (mergeStateStatus/state filled in later for batch members)
 */
function toSnapshot(node) {
    const commit = node.commits.nodes[0] && node.commits.nodes[0].commit;
    const rollupState = (commit && commit.statusCheckRollup) ? commit.statusCheckRollup.state : 'PENDING';
    return {
        id: node.id,
        number: node.number,
        title: node.title,
        createdAt: node.createdAt,
        isDraft: node.isDraft,
        mergeable: node.mergeable,
        reviewDecision: node.reviewDecision,
        unresolvedThreads: node.reviewThreads.nodes.filter((t) => !t.isResolved).length,
        headSha: node.headRefOid,
        authorLogin: (node.author && node.author.login) || null,
        autoMergeEnabled: !!node.autoMergeRequest,
        hasFailedLabel: ((node.labels && node.labels.nodes) || []).some((l) => l.name === CONFIG.FAILED_LABEL),
        checksFailed: rollupState === 'FAILURE' || rollupState === 'ERROR',
        checksPending: rollupState === 'PENDING' || rollupState === 'EXPECTED',
        mergeStateStatus: null,
        state: null,
        stateComment: null,
    };
}

/**
 * Evaluates required-only check/status contexts from REQUIRED_CHECKS_QUERY for failure
 * @param {object[]} contextNodes - contexts.nodes from the query (CheckRun/StatusContext union, may be undefined)
 * @returns {{failed: boolean, failedRunIds: number[], failedRunUrls: string[], failedNames: string[]}} required-check failure summary
 */
function evaluateRequiredChecks(contextNodes) {
    const failedRunIds = [];
    const failedRunUrls = [];
    const failedNames = [];
    let failed = false;
    for (const node of (contextNodes || [])) {
        if (!node || !node.isRequired) {
            continue;
        }
        if (node.__typename === 'CheckRun') {
            if (node.conclusion !== null && node.conclusion !== undefined && !CONFIG.PASSING_CHECK_CONCLUSIONS.includes(node.conclusion)) {
                failed = true;
                if (node.name && !failedNames.includes(node.name)) {
                    failedNames.push(node.name);
                }
                const run = node.checkSuite && node.checkSuite.workflowRun;
                if (run && typeof run.databaseId !== 'undefined' && run.databaseId !== null && !failedRunIds.includes(run.databaseId)) {
                    failedRunIds.push(run.databaseId);
                    if (run.url) {
                        failedRunUrls.push(run.url);
                    }
                }
            }
        }
        else if (node.__typename === 'StatusContext') {
            if (node.state === 'FAILURE' || node.state === 'ERROR') {
                failed = true;
                if (node.context && !failedNames.includes(node.context)) {
                    failedNames.push(node.context);
                }
            }
        }
    }
    return { failed, failedRunIds, failedRunUrls, failedNames };
}

/**
 * Probes each read permission the bot depends on; returns diagnoses for missing ones
 * @param {object} github - octokit client
 * @param {string} owner - repo owner
 * @param {string} repo - repo name
 * @param {object} core - actions core for logging
 * @returns {Promise<string[]>} actionable diagnoses for probes that failed with a permission error
 */
async function preflightPermissionChecks(github, owner, repo, core) {
    const failures = [];
    const probes = [
        { context: 'preflight-rollup', run: () => github.graphql(PREFLIGHT_ROLLUP_QUERY, { owner, repo }) },
        { context: 'preflight-labels', run: () => github.rest.issues.listLabelsForRepo({ owner, repo, per_page: 1 }) },
        { context: 'preflight-runs', run: () => github.rest.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 1 }) },
        { context: 'preflight-contents', run: () => github.rest.repos.getContent({ owner, repo, path: '' }) },
    ];
    const results = await Promise.allSettled(probes.map((p) => p.run()));
    for (let i = 0; i < probes.length; i += 1) {
        const probe = probes[i];
        const result = results[i];
        if (result.status === 'fulfilled') {
            if (probe.context === 'preflight-rollup') {
                const data = result.value;
                if (!data || !data.repository || !data.repository.defaultBranchRef) {
                    core.warning('preflight rollup probe inconclusive: empty default branch');
                }
            }
            continue;
        }
        const err = result.reason;
        // Every probed resource (repo root, labels, workflow-runs endpoint) exists on any repo
        // this workflow runs in, so a 404 here means access denial, not absence — GitHub hides
        // resources the caller isn't authorized to see behind a 404 instead of a 403.
        if (isPermissionError(err) || err.status === 404) {
            failures.push(explainPermissionError(probe.context, err));
        }
        else {
            core.warning('Preflight probe ' + probe.context + ' failed (non-permission): ' + err.message);
        }
    }
    return failures;
}

// Label specs ensured on every non-dry-run cycle (see ensureLabel)
const LABEL_SPECS = [
    { name: CONFIG.QUEUE_LABEL, color: '2ea44f', description: 'Opt this PR into the Merge Shepherd auto-merge queue' },
    { name: CONFIG.FAILED_LABEL, color: 'd73a4a', description: 'Merge Shepherd removed this PR from the queue after its checks failed repeatedly' },
];

/**
 * Creates the queue label and the failed-checks marker label if they do not exist yet
 * @param {object} github - octokit client
 * @param {string} owner - repo owner
 * @param {string} repo - repo name
 * @returns {Promise<void>} resolves when both labels exist
 */
async function ensureLabel(github, owner, repo) {
    for (const spec of LABEL_SPECS) {
        try {
            await github.rest.issues.createLabel({
                owner,
                repo,
                name: spec.name,
                color: spec.color,
                description: spec.description,
            });
        }
        catch (err) {
            if (err.status !== 422) {
                throw err;
            }
        }
    }
}

/**
 * Finds the bot's state comment on a PR
 * @param {object} github - octokit client
 * @param {string} owner - repo owner
 * @param {string} repo - repo name
 * @param {number} number - PR number
 * @returns {Promise<object|null>} the comment ({id, body}) or null
 */
async function findStateComment(github, owner, repo, number) {
    const comments = await github.paginate(github.rest.issues.listComments, {
        owner,
        repo,
        issue_number: number,
        per_page: 100,
    });
    return comments.find((c) => c.body && c.body.includes(CONFIG.STATE_MARKER)) || null;
}

/**
 * Creates or updates the bot's state comment on a PR
 * @param {object} github - octokit client
 * @param {string} owner - repo owner
 * @param {string} repo - repo name
 * @param {object} pr - PR snapshot (uses pr.number and pr.stateComment)
 * @param {{sha: string, retries: number}} state - new state to record
 * @returns {Promise<void>} resolves when written
 */
async function upsertStateComment(github, owner, repo, pr, state) {
    const body = buildStateCommentBody(state);
    if (pr.stateComment) {
        await github.rest.issues.updateComment({ owner, repo, comment_id: pr.stateComment.id, body });
    }
    else {
        await github.rest.issues.createComment({ owner, repo, issue_number: pr.number, body });
    }
}

/**
 * Ejects a PR from the queue: removes label, explains why
 * @param {object} github - octokit client
 * @param {string} owner - repo owner
 * @param {string} repo - repo name
 * @param {object} pr - PR snapshot
 * @param {string} reason - 'conflict' or 'failed-checks'
 * @param {object} core - actions core for logging
 * @returns {Promise<void>} resolves when ejected
 */
async function executeEject(github, owner, repo, pr, reason, core) {
    try {
        await github.rest.issues.removeLabel({ owner, repo, issue_number: pr.number, name: CONFIG.QUEUE_LABEL });
    }
    catch (err) {
        if (err.status !== 404) {
            tagContext(err, 'labels');
        }
    }
    if (reason === 'failed-checks') {
        try {
            await github.rest.issues.addLabels({ owner, repo, issue_number: pr.number, labels: [CONFIG.FAILED_LABEL] });
        }
        catch (err) {
            tagContext(err, 'labels');
        }
    }
    const reasonText = reason === 'conflict'
        ? 'it has **merge conflicts** with `master`. Resolve the conflicts, then re-add the `' + CONFIG.QUEUE_LABEL + '` label to re-enter the queue.'
        : 'required checks **failed ' + (CONFIG.MAX_RETRIES + 1) + ' times** on the current head commit. Investigate the failures, push a fix, then re-add the `' + CONFIG.QUEUE_LABEL + '` label to re-enter the queue.';
    // @-mention the author on retry exhaustion so they get a direct notification,
    // not just the weak participating-in-thread one
    const mention = (reason === 'failed-checks' && pr.authorLogin) ? '@' + pr.authorLogin + ' ' : '';
    let body = mention + '🤖 **Merge Shepherd** removed this PR from the merge queue because ' + reasonText;
    if (reason === 'failed-checks' && pr.failedNames && pr.failedNames.length) {
        // check/context names can come from external CI systems — strip backticks and collapse
        // whitespace so a crafted name cannot break out of the inline code span
        const safeNames = pr.failedNames.map((n) => '`' + String(n).replace(/`/g, '‘').replace(/\s+/g, ' ').trim() + '`');
        body += '\n\nFailing required check(s): ' + safeNames.join(', ');
    }
    if (reason === 'failed-checks' && pr.failedRunUrls && pr.failedRunUrls.length) {
        body += '\n\nFailing runs:\n' + pr.failedRunUrls.map((url) => '- ' + url).join('\n');
    }
    if (pr.autoMergeEnabled) {
        // The bot never disables auto-merge itself (see docs/MERGE_SHEPHERD.md), so a PR that
        // leaves the queue with auto-merge already armed can still merge itself later — make
        // that explicit instead of leaving it as a silent surprise.
        body += '\n\n⚠️ Auto-merge is still enabled on this PR — if its required checks later pass '
            + '(and branch protection is satisfied), GitHub will merge it even though it left the '
            + 'queue. Click "Disable auto-merge" on the PR page if you don\'t want that.';
    }
    try {
        await github.rest.issues.createComment({
            owner,
            repo,
            issue_number: pr.number,
            body,
        });
    }
    catch (err) {
        tagContext(err, 'comments');
    }
    if (pr.stateComment) {
        try {
            await github.rest.issues.deleteComment({ owner, repo, comment_id: pr.stateComment.id });
        }
        catch (err) {
            core.warning('Could not delete state comment on #' + pr.number + ': ' + err.message);
        }
    }
}

/**
 * Re-runs failed CI jobs for the PR head and records the retry in the state comment
 * @param {object} github - octokit client
 * @param {string} owner - repo owner
 * @param {string} repo - repo name
 * @param {object} pr - PR snapshot
 * @param {number} nextRetries - retry counter to record
 * @param {object} core - actions core for logging
 * @returns {Promise<void>} resolves when re-runs are requested
 */
async function executeRetry(github, owner, repo, pr, nextRetries, core) {
    const runIds = pr.failedRunIds || [];
    let accepted = 0;
    let permissionErr = null;
    for (const runId of runIds) {
        try {
            await github.rest.actions.reRunWorkflowFailedJobs({ owner, repo, run_id: runId });
            accepted += 1;
        }
        catch (err) {
            core.warning('Could not re-run failed jobs of run ' + runId + ' for #' + pr.number + ': ' + err.message);
            if (!permissionErr && isPermissionError(err)) {
                permissionErr = err;
            }
        }
    }
    // There WERE runs to re-run but every attempt failed: treat as transient and do not
    // advance the counter (a missing-permission failure is propagated so run() can surface it).
    if (runIds.length > 0 && accepted === 0) {
        if (permissionErr) {
            tagContext(permissionErr, 'rerun');
        }
        core.warning('no reruns started for #' + pr.number + ' — retry not counted');
        return;
    }
    // When a required check has no re-runnable workflow run (e.g. a failed external
    // StatusContext), there is nothing to re-run — but the counter must still advance so the PR
    // climbs toward ejection rather than looping forever. We simply wait out MAX_RETRIES cycles
    // for the external check to resolve on its own before ejecting.
    if (runIds.length === 0) {
        core.info('#' + pr.number + ': no re-runnable workflow runs for the failed required check(s) — '
            + 'counting retry ' + nextRetries + '/' + CONFIG.MAX_RETRIES + ' while waiting for them to resolve');
    }
    try {
        await upsertStateComment(github, owner, repo, pr, { sha: pr.headSha, retries: nextRetries });
    }
    catch (err) {
        tagContext(err, 'comments');
    }
}

/**
 * Executes one planned action against the GitHub API
 * @param {object} github - octokit client
 * @param {string} owner - repo owner
 * @param {string} repo - repo name
 * @param {object} action - planned action
 * @param {object} pr - PR snapshot the action targets
 * @param {object} core - actions core for logging
 * @returns {Promise<void>} resolves when executed
 */
async function executeAction(github, owner, repo, action, pr, core) {
    switch (action.type) {
    case 'enable-automerge':
        await github.graphql(ENABLE_AUTOMERGE_MUTATION, { prId: pr.id, mergeMethod: CONFIG.MERGE_METHOD });
        break;
    case 'merge':
        await github.rest.pulls.merge({ owner, repo, pull_number: pr.number, merge_method: 'merge' });
        break;
    case 'update-branch':
        try {
            await github.rest.pulls.updateBranch({ owner, repo, pull_number: pr.number });
        }
        catch (err) {
            if (err.status === 422) {
                if (/merge conflict/i.test(err.message)) {
                    core.warning('#' + pr.number + ' update-branch returned 422 (conflict) — ejecting');
                    await executeEject(github, owner, repo, pr, 'conflict', core);
                }
                else {
                    core.warning('#' + pr.number + ' update-branch returned 422 (no conflict): ' + err.message);
                }
            }
            else {
                throw err;
            }
        }
        break;
    case 'retry':
        await executeRetry(github, owner, repo, pr, action.nextRetries, core);
        break;
    case 'eject':
        await executeEject(github, owner, repo, pr, action.reason, core);
        break;
    default:
        break;
    }
}

/**
 * Escapes HTML-significant characters so untrusted PR titles are safe in the job summary
 * @param {string} str - raw string
 * @returns {string} string with &, <, > escaped
 */
function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Writes the queue table (and, if any, an Errors section) to the workflow job summary
 * @param {object} core - actions core
 * @param {object[]} batch - batch member snapshots
 * @param {{number: number, reason: string}[]} skipped - skipped PRs
 * @param {object[]} actions - all planned actions
 * @param {string[]} errors - collected error/diagnosis messages for this run
 * @returns {Promise<void>} resolves when written
 */
async function writeSummary(core, batch, skipped, actions, errors) {
    const rows = [[
        { data: 'PR', header: true },
        { data: 'Status', header: true },
        { data: 'Actions', header: true },
    ]];
    for (const pr of batch) {
        const prActions = actions.filter((a) => a.number === pr.number);
        rows.push(['#' + pr.number + ' ' + escapeHtml(pr.title), 'in batch', prActions.map((a) => a.type + (a.reason ? ' (' + a.reason + ')' : '')).join(', ') || 'none']);
    }
    for (const s of skipped) {
        rows.push(['#' + s.number, 'skipped', s.reason]);
    }
    let chain = core.summary
        .addHeading('Merge Shepherd')
        .addTable(rows);
    if (errors && errors.length) {
        chain = chain.addHeading('Errors', 3).addList(errors.map(escapeHtml));
    }
    await chain.write();
}

/**
 * Writes the job summary, failing the run (without throwing) if the write itself fails, so a
 * lost summary can never leave the run green
 * @param {object} core - actions core
 * @param {object[]} batch - batch member snapshots
 * @param {{number: number, reason: string}[]} skipped - skipped PRs
 * @param {object[]} actions - all planned actions
 * @param {string[]} errors - collected error/diagnosis messages for this run
 * @returns {Promise<void>} resolves when the write attempt finishes
 */
async function safeWriteSummary(core, batch, skipped, actions, errors) {
    try {
        await writeSummary(core, batch, skipped, actions, errors);
    }
    catch (err) {
        // core.setFailed never throws, so it cannot mask an original error already propagating
        // through the caller's finally block.
        core.setFailed('failed to write job summary: ' + err.message);
    }
}

/**
 * Records a fatal permission diagnosis and fails the run
 * @param {object} core - actions core
 * @param {string[]} errors - collected error/diagnosis messages for this run (mutated)
 * @param {string} msg - the actionable message to record and fail the run with
 * @returns {void}
 */
function failRun(core, errors, msg) {
    errors.push(msg);
    core.setFailed(msg);
}

/**
 * Removes the stale auto-merge-failed marker from any queued PR that still carries it — the
 * label is only meaningful for the run that ejected the PR; re-adding the queue label (which is
 * how the PR re-enters QUEUE_QUERY's results at all) means it's back in the running, so the
 * marker no longer applies
 * @param {object} github - octokit client
 * @param {string} owner - repo owner
 * @param {string} repo - repo name
 * @param {object[]} snapshots - PR snapshots from the queue query (all still carry QUEUE_LABEL)
 * @param {boolean} dryRun - when true, log planned removals but execute nothing
 * @param {object} core - actions core for logging
 * @param {string[]} errors - collected error/diagnosis messages for this run (mutated)
 * @returns {Promise<void>} resolves when every labeled snapshot has been considered
 */
async function cleanupStaleFailedLabels(github, owner, repo, snapshots, dryRun, core, errors) {
    for (const snap of snapshots) {
        if (!snap.hasFailedLabel) {
            continue;
        }
        if (dryRun) {
            core.info('[dry-run] would remove ' + CONFIG.FAILED_LABEL + ' from #' + snap.number);
            continue;
        }
        try {
            await github.rest.issues.removeLabel({ owner, repo, issue_number: snap.number, name: CONFIG.FAILED_LABEL });
        }
        catch (err) {
            if (err.status === 404) {
                continue;
            }
            try {
                tagContext(err, 'labels');
            }
            catch (tagged) {
                const msg = isPermissionError(tagged)
                    ? explainPermissionError(tagged.shepherdContext, tagged)
                    : ('#' + snap.number + ' could not remove ' + CONFIG.FAILED_LABEL + ' label: ' + tagged.message);
                core.warning(msg);
                errors.push(msg);
            }
        }
    }
}

/**
 * Removes the auto-merge-failed marker from recently-updated merged or closed PRs that still
 * carry it — cleanupStaleFailedLabels only ever sees PRs that still carry QUEUE_LABEL, so a PR
 * that was ejected for failed checks and then merged or was closed without re-entering the queue
 * would otherwise keep the red marker label forever
 * @param {object} github - octokit client
 * @param {string} owner - repo owner
 * @param {string} repo - repo name
 * @param {boolean} dryRun - when true, log planned removals but execute nothing
 * @param {object} core - actions core for logging
 * @param {string[]} errors - collected error/diagnosis messages for this run (mutated)
 * @returns {Promise<void>} resolves when the 20 most recently updated merged/closed labeled
 *   PRs have been considered; older stragglers converge over later runs, because cleaned PRs
 *   leave the label filter and stop occupying the window
 */
async function cleanupClosedFailedLabels(github, owner, repo, dryRun, core, errors) {
    let data;
    try {
        data = await github.graphql(CLOSED_FAILED_LABEL_QUERY, { owner, repo, label: CONFIG.FAILED_LABEL });
    }
    catch (err) {
        const msg = isPermissionError(err)
            ? explainPermissionError('labels', err)
            : ('could not query merged/closed PRs for stale ' + CONFIG.FAILED_LABEL + ' labels: ' + err.message);
        core.warning(msg);
        errors.push(msg);
        return;
    }
    const nodes = (data && data.repository && data.repository.pullRequests && data.repository.pullRequests.nodes) || [];
    for (const node of nodes) {
        if (dryRun) {
            core.info('[dry-run] would remove ' + CONFIG.FAILED_LABEL + ' from #' + node.number + ' (merged/closed)');
            continue;
        }
        try {
            await github.rest.issues.removeLabel({ owner, repo, issue_number: node.number, name: CONFIG.FAILED_LABEL });
        }
        catch (err) {
            if (err.status === 404) {
                continue;
            }
            try {
                tagContext(err, 'labels');
            }
            catch (tagged) {
                const msg = isPermissionError(tagged)
                    ? explainPermissionError(tagged.shepherdContext, tagged)
                    : ('#' + node.number + ' could not remove ' + CONFIG.FAILED_LABEL + ' label: ' + tagged.message);
                core.warning(msg);
                errors.push(msg);
            }
        }
    }
}

/**
 * Entry point — runs one shepherd cycle
 * @param {object} args - injected by the workflow
 * @param {object} args.github - github-script octokit client
 * @param {object} args.context - github-script context
 * @param {object} args.core - actions core
 * @param {boolean} args.dryRun - when true, log planned actions but execute nothing
 * @param {number} [args.batchSize] - max PRs to shepherd this run (must be an integer >= 1;
 *   falls back to CONFIG.BATCH_SIZE when omitted or invalid)
 * @returns {Promise<object[]>} the planned actions
 */
async function run({ github, context, core, dryRun, batchSize }) {
    const { owner, repo } = context.repo;
    const effectiveBatchSize = (Number.isInteger(batchSize) && batchSize >= 1) ? batchSize : CONFIG.BATCH_SIZE;
    const errors = [];
    let batch = [];
    let skipped = [];
    const allActions = [];

    try {
        const preflightFailures = await preflightPermissionChecks(github, owner, repo, core);
        if (preflightFailures.length) {
            for (const failure of preflightFailures) {
                core.error(failure);
            }
            errors.push(...preflightFailures);
            core.setFailed(preflightFailures[0] + (preflightFailures.length > 1
                ? ' (and ' + (preflightFailures.length - 1) + ' more — see summary)'
                : ''));
            return [];
        }

        if (!dryRun) {
            try {
                await ensureLabel(github, owner, repo);
            }
            catch (err) {
                if (isPermissionError(err)) {
                    failRun(core, errors, explainPermissionError('labels', err));
                    return allActions;
                }
                throw err;
            }
        }

        let data;
        try {
            data = await github.graphql(QUEUE_QUERY, { owner, repo, label: CONFIG.QUEUE_LABEL });
        }
        catch (err) {
            if (isPermissionError(err)) {
                failRun(core, errors, explainPermissionError('queue-query', err));
                return allActions;
            }
            throw err;
        }
        const snapshots = data.repository.pullRequests.nodes.map(toSnapshot);
        core.info('Queue: ' + snapshots.length + ' labeled PR(s)');

        await cleanupStaleFailedLabels(github, owner, repo, snapshots, dryRun, core, errors);
        await cleanupClosedFailedLabels(github, owner, repo, dryRun, core, errors);

        const selection = selectBatch(snapshots, effectiveBatchSize);
        batch = selection.batch;
        skipped = selection.skipped;
        for (const s of skipped) {
            core.info('#' + s.number + ' skipped: ' + s.reason);
        }

        for (const pr of batch) {
            try {
                let details;
                try {
                    details = await github.rest.pulls.get({ owner, repo, pull_number: pr.number });
                }
                catch (err) {
                    tagContext(err, 'queue-query');
                }
                pr.mergeStateStatus = details.data.mergeable_state;
                try {
                    pr.stateComment = await findStateComment(github, owner, repo, pr.number);
                }
                catch (err) {
                    tagContext(err, 'comments');
                }
                pr.state = pr.stateComment ? parseStateComment(pr.stateComment.body) : null;

                let requiredData;
                try {
                    requiredData = await github.graphql(REQUIRED_CHECKS_QUERY, { owner, repo, number: pr.number });
                }
                catch (err) {
                    tagContext(err, 'required-checks');
                }
                const requiredPr = requiredData.repository.pullRequest;
                const requiredCommit = requiredPr && requiredPr.commits.nodes[0] && requiredPr.commits.nodes[0].commit;
                const rollup = requiredCommit && requiredCommit.statusCheckRollup;
                const requiredResult = evaluateRequiredChecks(rollup ? rollup.contexts.nodes : []);
                pr.checksFailed = requiredResult.failed;
                pr.failedRunIds = requiredResult.failedRunIds;
                pr.failedRunUrls = requiredResult.failedRunUrls;
                pr.failedNames = requiredResult.failedNames;

                const actions = planForBatchMember(pr);
                allActions.push(...actions);
                for (const action of actions) {
                    if (dryRun) {
                        core.info('[dry-run] #' + pr.number + ': would ' + action.type + (action.reason ? ' (' + action.reason + ')' : ''));
                        continue;
                    }
                    core.info('#' + pr.number + ': ' + action.type + (action.reason ? ' (' + action.reason + ')' : ''));
                    try {
                        await executeAction(github, owner, repo, action, pr, core);
                        if (action.type === 'enable-automerge') {
                            pr.autoMergeEnabled = true;
                        }
                    }
                    catch (err) {
                        const contextKey = err.shepherdContext || ACTION_CONTEXT[action.type];
                        const msg = (isPermissionError(err) && contextKey)
                            ? explainPermissionError(contextKey, err)
                            : ('#' + pr.number + ' ' + action.type + ' failed: ' + err.message);
                        core.warning(msg);
                        errors.push(msg);
                    }
                }
            }
            catch (err) {
                const isPerm = isPermissionError(err);
                const msg = isPerm
                    ? explainPermissionError(err.shepherdContext || 'queue-query', err)
                    : ('#' + pr.number + ' processing failed: ' + err.message);
                if (isPerm) {
                    // A permission failure here recurs for every remaining PR in the batch —
                    // the run must go red, not quietly report SUCCESS while doing nothing.
                    core.setFailed(msg);
                }
                core.warning(msg);
                errors.push(msg);
            }
        }

        return allActions;
    }
    finally {
        await safeWriteSummary(core, batch, skipped, allActions, errors);
    }
}

module.exports = {
    CONFIG,
    parseStateComment,
    buildStateCommentBody,
    selectBatch,
    planForBatchMember,
    evaluateRequiredChecks,
    isPermissionError,
    explainPermissionError,
    run,
};
