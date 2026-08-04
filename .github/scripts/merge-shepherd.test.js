'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const shepherd = require('./merge-shepherd.js');

/**
 * Builds a PR snapshot with sensible defaults for tests
 * @param {object} overrides - fields to override
 * @returns {object} PR snapshot
 */
function makePr(overrides) {
    return Object.assign({
        id: 'PR_node1',
        number: 1,
        title: 'Test PR',
        createdAt: '2026-07-01T00:00:00Z',
        isDraft: false,
        mergeable: 'MERGEABLE',
        reviewDecision: 'APPROVED',
        unresolvedThreads: 0,
        headSha: 'abc1234',
        autoMergeEnabled: false,
        checksFailed: false,
        checksPending: false,
        mergeStateStatus: 'behind',
        state: null,
        stateComment: null,
    }, overrides);
}

test('parseStateComment round-trips buildStateCommentBody', () => {
    const state = { sha: 'abc1234', retries: 1 };
    const body = shepherd.buildStateCommentBody(state);
    assert.deepStrictEqual(shepherd.parseStateComment(body), state);
});

test('parseStateComment returns null for missing or malformed marker', () => {
    assert.strictEqual(shepherd.parseStateComment('just a comment'), null);
    assert.strictEqual(shepherd.parseStateComment(''), null);
    assert.strictEqual(shepherd.parseStateComment(null), null);
    assert.strictEqual(shepherd.parseStateComment('<!-- merge-shepherd-state {not json} -->'), null);
    assert.strictEqual(shepherd.parseStateComment('<!-- merge-shepherd-state {"sha": 5, "retries": "x"} -->'), null);
});

test('selectBatch takes first 3 eligible PRs oldest-first', () => {
    const prs = [
        makePr({ number: 4, createdAt: '2026-07-04T00:00:00Z' }),
        makePr({ number: 1, createdAt: '2026-07-01T00:00:00Z' }),
        makePr({ number: 3, createdAt: '2026-07-03T00:00:00Z' }),
        makePr({ number: 2, createdAt: '2026-07-02T00:00:00Z' }),
    ];
    const { batch, skipped } = shepherd.selectBatch(prs);
    assert.deepStrictEqual(batch.map((p) => p.number), [1, 2, 3]);
    assert.deepStrictEqual(skipped, [{ number: 4, reason: 'queued behind batch' }]);
});

test('selectBatch skips ineligible PRs without consuming batch slots', () => {
    const prs = [
        makePr({ number: 1, createdAt: '2026-07-01T00:00:00Z', isDraft: true }),
        makePr({ number: 2, createdAt: '2026-07-02T00:00:00Z', reviewDecision: 'REVIEW_REQUIRED' }),
        makePr({ number: 3, createdAt: '2026-07-03T00:00:00Z', reviewDecision: 'CHANGES_REQUESTED' }),
        makePr({ number: 4, createdAt: '2026-07-04T00:00:00Z', unresolvedThreads: 2 }),
        makePr({ number: 5, createdAt: '2026-07-05T00:00:00Z' }),
    ];
    const { batch, skipped } = shepherd.selectBatch(prs);
    assert.deepStrictEqual(batch.map((p) => p.number), [5]);
    assert.deepStrictEqual(skipped, [
        { number: 1, reason: 'draft' },
        { number: 2, reason: 'not approved' },
        { number: 3, reason: 'not approved' },
        { number: 4, reason: 'unresolved conversations' },
    ]);
});

test('selectBatch honors a custom batchSize, taking only the oldest eligible PR', () => {
    const prs = [
        makePr({ number: 2, createdAt: '2026-07-02T00:00:00Z' }),
        makePr({ number: 1, createdAt: '2026-07-01T00:00:00Z' }),
        makePr({ number: 3, createdAt: '2026-07-03T00:00:00Z' }),
    ];
    const { batch, skipped } = shepherd.selectBatch(prs, 1);
    assert.deepStrictEqual(batch.map((p) => p.number), [1]);
    assert.deepStrictEqual(skipped, [
        { number: 2, reason: 'queued behind batch' },
        { number: 3, reason: 'queued behind batch' },
    ]);
});

test('conflicting PR is ejected', () => {
    const actions = shepherd.planForBatchMember(makePr({ mergeable: 'CONFLICTING' }));
    assert.deepStrictEqual(actions, [{ type: 'eject', number: 1, reason: 'conflict' }]);
});

test('dirty merge state is ejected even if mergeable is stale', () => {
    const actions = shepherd.planForBatchMember(makePr({ mergeStateStatus: 'dirty' }));
    assert.deepStrictEqual(actions, [{ type: 'eject', number: 1, reason: 'conflict' }]);
});

test('unknown mergeability waits', () => {
    const actions = shepherd.planForBatchMember(makePr({ mergeable: 'UNKNOWN', mergeStateStatus: 'unknown' }));
    assert.deepStrictEqual(actions, [{ type: 'wait', number: 1, reason: 'mergeability being computed' }]);
});

test('behind branch gets auto-merge enabled and updated', () => {
    const actions = shepherd.planForBatchMember(makePr({ mergeStateStatus: 'behind' }));
    assert.deepStrictEqual(actions, [
        { type: 'enable-automerge', number: 1 },
        { type: 'update-branch', number: 1 },
    ]);
});

test('behind branch with auto-merge already on only updates', () => {
    const actions = shepherd.planForBatchMember(makePr({ mergeStateStatus: 'behind', autoMergeEnabled: true }));
    assert.deepStrictEqual(actions, [{ type: 'update-branch', number: 1 }]);
});

test('behind branch updates even when old checks failed', () => {
    const actions = shepherd.planForBatchMember(makePr({ mergeStateStatus: 'behind', autoMergeEnabled: true, checksFailed: true }));
    assert.deepStrictEqual(actions, [{ type: 'update-branch', number: 1 }]);
});

test('failed checks with no prior state retries as attempt 1', () => {
    const actions = shepherd.planForBatchMember(makePr({ mergeStateStatus: 'blocked', checksFailed: true }));
    assert.deepStrictEqual(actions, [{ type: 'retry', number: 1, nextRetries: 1 }]);
});

test('failed checks with one prior retry on same sha retries as attempt 2', () => {
    const actions = shepherd.planForBatchMember(makePr({
        mergeStateStatus: 'blocked',
        checksFailed: true,
        state: { sha: 'abc1234', retries: 1 },
    }));
    assert.deepStrictEqual(actions, [{ type: 'retry', number: 1, nextRetries: 2 }]);
});

test('failed checks after MAX_RETRIES on same sha ejects', () => {
    const actions = shepherd.planForBatchMember(makePr({
        mergeStateStatus: 'blocked',
        checksFailed: true,
        state: { sha: 'abc1234', retries: shepherd.CONFIG.MAX_RETRIES },
    }));
    assert.deepStrictEqual(actions, [{ type: 'eject', number: 1, reason: 'failed-checks' }]);
});

test('retry counter resets when head sha changed since last retry', () => {
    const actions = shepherd.planForBatchMember(makePr({
        mergeStateStatus: 'blocked',
        checksFailed: true,
        state: { sha: 'oldsha99', retries: 2 },
    }));
    assert.deepStrictEqual(actions, [{ type: 'retry', number: 1, nextRetries: 1 }]);
});

test('clean PR is merged directly', () => {
    const actions = shepherd.planForBatchMember(makePr({ mergeStateStatus: 'clean' }));
    assert.deepStrictEqual(actions, [{ type: 'merge', number: 1 }]);
});

test('up-to-date PR with checks running waits with auto-merge on', () => {
    const actions = shepherd.planForBatchMember(makePr({ mergeStateStatus: 'blocked', checksPending: true }));
    assert.deepStrictEqual(actions, [
        { type: 'enable-automerge', number: 1 },
        { type: 'wait', number: 1, reason: 'checks running' },
    ]);
});

test('up-to-date blocked PR with green checks just waits', () => {
    const actions = shepherd.planForBatchMember(makePr({ mergeStateStatus: 'blocked', autoMergeEnabled: true }));
    assert.deepStrictEqual(actions, [{ type: 'wait', number: 1, reason: 'awaiting merge' }]);
});

test('unstable PR (required checks green) is merged directly', () => {
    const actions = shepherd.planForBatchMember(makePr({ mergeStateStatus: 'unstable' }));
    assert.deepStrictEqual(actions, [{ type: 'merge', number: 1 }]);
});

test('has_hooks merge state falls through to wait', () => {
    const actions = shepherd.planForBatchMember(makePr({ mergeStateStatus: 'has_hooks' }));
    assert.deepStrictEqual(actions, [
        { type: 'enable-automerge', number: 1 },
        { type: 'wait', number: 1, reason: 'awaiting merge' },
    ]);
});

test('evaluateRequiredChecks: required CheckRun FAILURE is failed with run id/url', () => {
    const result = shepherd.evaluateRequiredChecks([
        {
            __typename: 'CheckRun',
            name: 'build',
            conclusion: 'FAILURE',
            isRequired: true,
            checkSuite: { workflowRun: { databaseId: 42, url: 'https://github.com/Countly/countly-platform/actions/runs/42' } },
        },
    ]);
    assert.deepStrictEqual(result, {
        failed: true,
        failedRunIds: [42],
        failedRunUrls: ['https://github.com/Countly/countly-platform/actions/runs/42'],
        failedNames: ['build'],
    });
});

test('evaluateRequiredChecks: required CheckRun CANCELLED is failed', () => {
    const result = shepherd.evaluateRequiredChecks([
        {
            __typename: 'CheckRun',
            name: 'build',
            conclusion: 'CANCELLED',
            isRequired: true,
            checkSuite: { workflowRun: { databaseId: 7, url: 'https://example.test/runs/7' } },
        },
    ]);
    assert.strictEqual(result.failed, true);
    assert.deepStrictEqual(result.failedRunIds, [7]);
});

test('evaluateRequiredChecks: non-required failure alongside required success is not failed', () => {
    const result = shepherd.evaluateRequiredChecks([
        {
            __typename: 'CheckRun',
            name: 'lint',
            conclusion: 'FAILURE',
            isRequired: false,
            checkSuite: { workflowRun: { databaseId: 99, url: 'https://example.test/runs/99' } },
        },
        {
            __typename: 'CheckRun',
            name: 'build',
            conclusion: 'SUCCESS',
            isRequired: true,
            checkSuite: { workflowRun: { databaseId: 100, url: 'https://example.test/runs/100' } },
        },
    ]);
    assert.deepStrictEqual(result, { failed: false, failedRunIds: [], failedRunUrls: [], failedNames: [] });
});

test('evaluateRequiredChecks: required StatusContext ERROR is failed with its context name', () => {
    const result = shepherd.evaluateRequiredChecks([
        { __typename: 'StatusContext', context: 'ci/legacy', state: 'ERROR', isRequired: true },
    ]);
    assert.deepStrictEqual(result, { failed: true, failedRunIds: [], failedRunUrls: [], failedNames: ['ci/legacy'] });
});

test('evaluateRequiredChecks: empty or missing contexts is not failed', () => {
    assert.deepStrictEqual(shepherd.evaluateRequiredChecks([]), { failed: false, failedRunIds: [], failedRunUrls: [], failedNames: [] });
    assert.deepStrictEqual(shepherd.evaluateRequiredChecks(undefined), { failed: false, failedRunIds: [], failedRunUrls: [], failedNames: [] });
});

const PASSING_CONCLUSIONS = ['SUCCESS', 'SKIPPED', 'NEUTRAL'];
const FAILING_CONCLUSIONS = ['FAILURE', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'STALE'];

for (const conclusion of PASSING_CONCLUSIONS) {
    test('evaluateRequiredChecks: required CheckRun conclusion ' + conclusion + ' is not failed', () => {
        const result = shepherd.evaluateRequiredChecks([
            { __typename: 'CheckRun', name: 'build', conclusion, isRequired: true, checkSuite: { workflowRun: { databaseId: 1, url: 'https://example.test/runs/1' } } },
        ]);
        assert.strictEqual(result.failed, false);
    });
}

for (const conclusion of FAILING_CONCLUSIONS) {
    test('evaluateRequiredChecks: required CheckRun conclusion ' + conclusion + ' is failed', () => {
        const result = shepherd.evaluateRequiredChecks([
            { __typename: 'CheckRun', name: 'build', conclusion, isRequired: true, checkSuite: { workflowRun: { databaseId: 1, url: 'https://example.test/runs/1' } } },
        ]);
        assert.strictEqual(result.failed, true);
    });
}

test('evaluateRequiredChecks: required CheckRun with null conclusion (still running) is not failed', () => {
    const result = shepherd.evaluateRequiredChecks([
        { __typename: 'CheckRun', name: 'build', conclusion: null, isRequired: true, checkSuite: { workflowRun: { databaseId: 1, url: 'https://example.test/runs/1' } } },
    ]);
    assert.strictEqual(result.failed, false);
});

/**
 * Builds a GraphQL PR node as returned by the queue query
 * @param {object} overrides - fields to override
 * @returns {object} GraphQL-shaped PR node
 */
function makeNode(overrides) {
    return Object.assign({
        id: 'PR_node1',
        number: 1,
        title: 'Test PR',
        createdAt: '2026-07-01T00:00:00Z',
        isDraft: false,
        mergeable: 'MERGEABLE',
        reviewDecision: 'APPROVED',
        headRefOid: 'abc1234',
        author: { login: 'octocat' },
        autoMergeRequest: null,
        labels: { nodes: [{ name: 'auto-merge' }] },
        reviewThreads: { nodes: [] },
        commits: { nodes: [{ commit: { statusCheckRollup: { state: 'PENDING' } } }] },
    }, overrides);
}

/**
 * Builds an error shaped like an octokit GraphqlResponseError for a missing App permission
 * @returns {Error} error with status-less shape but errors[] carrying a FORBIDDEN entry
 */
function makePermissionError() {
    return Object.assign(
        new Error('Request failed due to following response errors:\n - Resource not accessible by integration'),
        { errors: [{ type: 'FORBIDDEN', message: 'Resource not accessible by integration' }] },
    );
}

/**
 * Resolves a fixture that toggles a probe/call failure: true uses the default permission-shaped
 * error, an Error instance is thrown as-is, and falsy means "succeed"
 * @param {boolean|Error} fixture - the opts.*Fails value
 * @returns {Error|null} the error to throw, or null if the call should succeed
 */
function resolveFailure(fixture) {
    if (!fixture) {
        return null;
    }
    return fixture instanceof Error ? fixture : makePermissionError();
}

/**
 * Builds a fake github-script Octokit that records mutating calls
 * @param {object} opts - fixtures
 * @param {object[]} opts.nodes - GraphQL PR nodes for the queue query
 * @param {object[]} [opts.closedFailedLabelNodes] - GraphQL PR nodes ({number}) for the merged/closed failed-label cleanup query
 * @param {boolean|Error} [opts.closedFailedLabelFails] - make the merged/closed failed-label cleanup query throw
 * @param {object} [opts.pullsByNumber] - REST pulls.get fixtures keyed by PR number
 * @param {object} [opts.commentsByNumber] - listComments fixtures keyed by PR number
 * @param {object} [opts.requiredChecksByNumber] - REQUIRED_CHECKS_QUERY contexts.nodes fixtures keyed by PR number
 * @param {object} [opts.requiredChecksFails] - REQUIRED_CHECKS_QUERY failure fixtures keyed by PR number
 * @param {boolean} [opts.updateBranchFails] - make updateBranch throw a 422
 * @param {string} [opts.updateBranchFailMessage] - message for the updateBranch 422 (default 'merge conflict')
 * @param {boolean|Error} [opts.preflightRollupFails] - make the preflight rollup probe throw (true = permission-shaped)
 * @param {boolean} [opts.preflightRollupEmptyDefaultBranch] - make the rollup probe resolve with a null defaultBranchRef
 * @param {boolean|Error} [opts.preflightLabelsFails] - make the preflight labels probe throw
 * @param {boolean|Error} [opts.preflightRunsFails] - make the preflight runs probe throw
 * @param {boolean|Error} [opts.preflightContentsFails] - make the preflight contents probe throw
 * @param {boolean|Error} [opts.queueQueryFails] - make the queue query throw (true = permission-shaped)
 * @param {boolean|Error} [opts.removeLabelFails] - make issues.removeLabel throw (non-404 by default)
 * @param {boolean|Error} [opts.addLabelsFails] - make issues.addLabels throw
 * @param {boolean|Error} [opts.createCommentFails] - make issues.createComment throw
 * @param {boolean|Error} [opts.rerunFails] - make reRunWorkflowFailedJobs throw
 * @param {boolean|Error} [opts.automergeFails] - make the enablePullRequestAutoMerge mutation throw
 * @returns {{github: object, calls: string[]}} fake client and recorded call log
 */
function makeFakeGithub(opts) {
    const calls = [];
    const createdComments = [];
    const github = {
        graphql: async(query, vars) => {
            // @octokit/graphql reserves these keys as request options and
            // rejects them as GraphQL variable names — mirror that here
            const reserved = ['method', 'url', 'query', 'headers', 'request', 'baseUrl', 'mediaType'];
            for (const key of Object.keys(vars || {})) {
                if (reserved.includes(key)) {
                    throw new Error('[@octokit/graphql] "' + key + '" cannot be used as variable name');
                }
            }
            const kind = query.includes('defaultBranchRef') ? 'preflight'
                : query.includes('states: [MERGED, CLOSED]') ? 'closed-failed-label'
                    : query.includes('pullRequests(') ? 'queue'
                        : query.includes('pullRequest(') ? 'required-checks'
                            : query.includes('enablePullRequestAutoMerge') ? 'enable-automerge'
                                : query.includes('disablePullRequestAutoMerge') ? 'disable-automerge'
                                    : 'other';
            calls.push('graphql:' + kind + ':' + JSON.stringify(vars.number || vars.prId || ''));
            if (kind === 'preflight') {
                const err = resolveFailure(opts.preflightRollupFails);
                if (err) {
                    throw err;
                }
                if (opts.preflightRollupEmptyDefaultBranch) {
                    return { repository: { defaultBranchRef: null } };
                }
                return { repository: { defaultBranchRef: { target: { statusCheckRollup: { state: 'SUCCESS' } } } } };
            }
            if (kind === 'queue') {
                const err = resolveFailure(opts.queueQueryFails);
                if (err) {
                    throw err;
                }
                return { repository: { pullRequests: { nodes: opts.nodes } } };
            }
            if (kind === 'closed-failed-label') {
                const err = resolveFailure(opts.closedFailedLabelFails);
                if (err) {
                    throw err;
                }
                return { repository: { pullRequests: { nodes: opts.closedFailedLabelNodes || [] } } };
            }
            if (kind === 'required-checks') {
                const err = resolveFailure(opts.requiredChecksFails && opts.requiredChecksFails[vars.number]);
                if (err) {
                    throw err;
                }
                const contexts = (opts.requiredChecksByNumber && opts.requiredChecksByNumber[vars.number]) || null;
                return {
                    repository: {
                        pullRequest: {
                            commits: { nodes: [{ commit: { statusCheckRollup: contexts ? { contexts: { nodes: contexts } } : null } }] },
                        },
                    },
                };
            }
            if (kind === 'enable-automerge') {
                const err = resolveFailure(opts.automergeFails);
                if (err) {
                    throw err;
                }
                return {};
            }
            return {};
        },
        paginate: async(fn, params) => {
            const res = await fn(params);
            return res.data;
        },
        rest: {
            issues: {
                createLabel: async(p) => {
                    calls.push('createLabel:' + p.name);
                    const err = new Error('already_exists');
                    err.status = 422;
                    throw err;
                },
                listComments: async(p) => ({ data: (opts.commentsByNumber && opts.commentsByNumber[p.issue_number]) || [] }),
                createComment: async(p) => {
                    calls.push('createComment:' + p.issue_number);
                    createdComments.push({ number: p.issue_number, body: p.body });
                    const err = resolveFailure(opts.createCommentFails);
                    if (err) {
                        throw err;
                    }
                    return { data: {} };
                },
                updateComment: async(p) => {
                    calls.push('updateComment:' + p.comment_id);
                    return { data: {} };
                },
                deleteComment: async(p) => {
                    calls.push('deleteComment:' + p.comment_id);
                    return { data: {} };
                },
                removeLabel: async(p) => {
                    calls.push('removeLabel:' + p.issue_number + ':' + p.name);
                    const err = resolveFailure(opts.removeLabelFails);
                    if (err) {
                        throw err;
                    }
                    return { data: {} };
                },
                addLabels: async(p) => {
                    calls.push('addLabels:' + p.issue_number + ':' + p.labels.join(','));
                    const err = resolveFailure(opts.addLabelsFails);
                    if (err) {
                        throw err;
                    }
                    return { data: {} };
                },
                listLabelsForRepo: async() => {
                    const err = resolveFailure(opts.preflightLabelsFails);
                    if (err) {
                        throw err;
                    }
                    return { data: [] };
                },
            },
            pulls: {
                get: async(p) => ({ data: (opts.pullsByNumber && opts.pullsByNumber[p.pull_number]) || { mergeable_state: 'behind' } }),
                updateBranch: async(p) => {
                    calls.push('updateBranch:' + p.pull_number);
                    if (opts.updateBranchFails) {
                        const err = new Error(opts.updateBranchFailMessage || 'merge conflict');
                        err.status = 422;
                        throw err;
                    }
                    return { data: {} };
                },
                merge: async(p) => {
                    calls.push('merge:' + p.pull_number);
                    return { data: {} };
                },
            },
            actions: {
                reRunWorkflowFailedJobs: async(p) => {
                    calls.push('rerunFailedJobs:' + p.run_id);
                    const err = resolveFailure(opts.rerunFails);
                    if (err) {
                        throw err;
                    }
                    return { data: {} };
                },
                listWorkflowRunsForRepo: async() => {
                    const err = resolveFailure(opts.preflightRunsFails);
                    if (err) {
                        throw err;
                    }
                    return { data: { workflow_runs: [] } };
                },
            },
            repos: {
                getContent: async() => {
                    const err = resolveFailure(opts.preflightContentsFails);
                    if (err) {
                        throw err;
                    }
                    return { data: {} };
                },
            },
        },
    };
    return { github, calls, createdComments };
}

const fakeContext = { repo: { owner: 'Countly', repo: 'countly-platform' } };

/**
 * Builds a fake actions core with a no-op chainable summary that records headings/lists/writes
 * @param {object} [opts] - fixtures
 * @param {boolean|Error} [opts.summaryWriteFails] - make summary.write() throw
 * @returns {object} fake core
 */
function makeFakeCore(opts) {
    opts = opts || {};
    const summary = {
        headings: [],
        lists: [],
        tables: [],
        writeCount: 0,
        addHeading: (text) => {
            summary.headings.push(text);
            return summary;
        },
        addTable: (rows) => {
            summary.tables.push(rows);
            return summary;
        },
        addList: (items) => {
            summary.lists.push(items);
            return summary;
        },
        addRaw: () => summary,
        write: async() => {
            if (opts.summaryWriteFails) {
                throw (opts.summaryWriteFails instanceof Error ? opts.summaryWriteFails : new Error('could not write summary'));
            }
            summary.writeCount += 1;
            return summary;
        },
    };
    const setFailedCalls = [];
    const errorCalls = [];
    const warningCalls = [];
    return {
        info: () => {},
        warning: (msg) => warningCalls.push(msg),
        error: (msg) => errorCalls.push(msg),
        setFailed: (msg) => setFailedCalls.push(msg),
        summary,
        setFailedCalls,
        errorCalls,
        warningCalls,
    };
}

test('run() updates a behind PR and enables auto-merge', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'behind' } },
    });
    const actions = await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(calls.includes('graphql:enable-automerge:"PR_node1"'));
    assert.ok(calls.includes('updateBranch:1'));
    assert.deepStrictEqual(actions.filter((a) => a.type !== 'wait' && a.type !== 'skip').map((a) => a.type), ['enable-automerge', 'update-branch']);
});

test('run() in dry-run mode performs no mutating calls', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'behind' } },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: true });
    assert.deepStrictEqual(calls.filter((c) => !c.startsWith('graphql:queue') && !c.startsWith('graphql:required-checks') && !c.startsWith('graphql:preflight') && !c.startsWith('graphql:closed-failed-label')), []);
});

test('run() ejects on update-branch 422 conflict', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({ autoMergeRequest: { enabledAt: '2026-07-01T00:00:00Z' } })],
        pullsByNumber: { 1: { mergeable_state: 'behind' } },
        updateBranchFails: true,
        updateBranchFailMessage: 'merge conflict',
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(calls.includes('removeLabel:1:auto-merge'));
    assert.ok(calls.includes('createComment:1'));
    assert.ok(!calls.some((c) => c.startsWith('addLabels')));
});

test('run() never disables auto-merge on a conflict eject, even when auto-merge is armed', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({ autoMergeRequest: { enabledAt: '2026-07-01T00:00:00Z' } })],
        pullsByNumber: { 1: { mergeable_state: 'behind' } },
        updateBranchFails: true,
        updateBranchFailMessage: 'merge conflict',
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(calls.includes('removeLabel:1:auto-merge'));
    assert.ok(!calls.some((c) => c.startsWith('graphql:disable-automerge')));
});

test('run() does not eject on update-branch 422 that is not a conflict', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({ autoMergeRequest: { enabledAt: '2026-07-01T00:00:00Z' } })],
        pullsByNumber: { 1: { mergeable_state: 'behind' } },
        updateBranchFails: true,
        updateBranchFailMessage: 'There are no new commits on the base branch.',
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(calls.includes('updateBranch:1'));
    assert.ok(!calls.includes('removeLabel:1:auto-merge'));
    assert.ok(!calls.includes('createComment:1'));
    assert.ok(!calls.includes('graphql:disable-automerge:"PR_node1"'));
});

test('run() with only a non-required check failing waits without retrying or ejecting', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({ autoMergeRequest: { enabledAt: '2026-07-01T00:00:00Z' } })],
        pullsByNumber: { 1: { mergeable_state: 'blocked' } },
        requiredChecksByNumber: {
            1: [
                { __typename: 'CheckRun', name: 'lint', conclusion: 'FAILURE', isRequired: false, checkSuite: { workflowRun: { databaseId: 99, url: 'https://example.test/runs/99' } } },
                { __typename: 'CheckRun', name: 'build', conclusion: 'SUCCESS', isRequired: true, checkSuite: { workflowRun: { databaseId: 100, url: 'https://example.test/runs/100' } } },
            ],
        },
    });
    const actions = await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(!calls.some((c) => c.startsWith('rerunFailedJobs')));
    assert.ok(!calls.includes('removeLabel:1:auto-merge'));
    assert.deepStrictEqual(actions.map((a) => a.type), ['wait']);
});

test('run() retries only the workflow run behind the failed required check', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({ autoMergeRequest: { enabledAt: '2026-07-01T00:00:00Z' } })],
        pullsByNumber: { 1: { mergeable_state: 'blocked' } },
        requiredChecksByNumber: {
            1: [
                { __typename: 'CheckRun', name: 'build', conclusion: 'FAILURE', isRequired: true, checkSuite: { workflowRun: { databaseId: 42, url: 'https://example.test/runs/42' } } },
                { __typename: 'CheckRun', name: 'lint', conclusion: 'SUCCESS', isRequired: true, checkSuite: { workflowRun: { databaseId: 43, url: 'https://example.test/runs/43' } } },
            ],
        },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(calls.includes('rerunFailedJobs:42'));
    assert.ok(!calls.includes('rerunFailedJobs:43'));
    assert.ok(calls.includes('createComment:1'));
});

test('run() does not count a retry when every rerun request fails', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({ autoMergeRequest: { enabledAt: '2026-07-01T00:00:00Z' } })],
        pullsByNumber: { 1: { mergeable_state: 'blocked' } },
        requiredChecksByNumber: {
            1: [{ __typename: 'CheckRun', name: 'build', conclusion: 'FAILURE', isRequired: true, checkSuite: { workflowRun: { databaseId: 42, url: 'https://example.test/runs/42' } } }],
        },
    });
    github.rest.actions.reRunWorkflowFailedJobs = async(p) => {
        calls.push('rerunFailedJobs:' + p.run_id);
        const err = new Error('workflow run is not failed');
        err.status = 422;
        throw err;
    };
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(calls.includes('rerunFailedJobs:42'));
    assert.ok(!calls.includes('createComment:1'));
    assert.ok(!calls.includes('updateComment:1'));
});

test('run() counts a retry (without re-running) when the failed required check has no workflow run', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({ autoMergeRequest: { enabledAt: '2026-07-01T00:00:00Z' } })],
        pullsByNumber: { 1: { mergeable_state: 'blocked' } },
        requiredChecksByNumber: {
            1: [{ __typename: 'StatusContext', context: 'ci/legacy', state: 'FAILURE', isRequired: true }],
        },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    // Nothing is re-runnable, but the retry counter must still advance so the PR is not stuck
    // in an infinite no-op retry loop — a fresh state comment records the retry.
    assert.ok(!calls.some((c) => c.startsWith('rerunFailedJobs')));
    assert.ok(calls.includes('createComment:1'));
});

test('run() ejects a non-re-runnable required-check failure once retries are exhausted', async() => {
    const stateBody = shepherd.buildStateCommentBody({ sha: 'abc1234', retries: shepherd.CONFIG.MAX_RETRIES });
    const { github, calls, createdComments } = makeFakeGithub({
        nodes: [makeNode({ autoMergeRequest: { enabledAt: '2026-07-01T00:00:00Z' } })],
        pullsByNumber: { 1: { mergeable_state: 'blocked' } },
        commentsByNumber: { 1: [{ id: 88, body: stateBody }] },
        requiredChecksByNumber: {
            1: [{ __typename: 'StatusContext', context: 'ci/legacy', state: 'FAILURE', isRequired: true }],
        },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    // retries already at MAX on the current head sha → eject instead of counting further
    assert.ok(!calls.some((c) => c.startsWith('rerunFailedJobs')));
    assert.ok(calls.includes('removeLabel:1:auto-merge'));
    assert.ok(calls.includes('addLabels:1:auto-merge-failed'));
    // a StatusContext failure has no run link, so the eject comment must at least name the check
    const ejectComment = createdComments.find((c) => c.number === 1 && c.body.includes('removed this PR from the merge queue'));
    assert.ok(ejectComment, 'expected an eject comment');
    assert.ok(ejectComment.body.includes('`ci/legacy`'), 'eject comment must name the failing required check');
});

test('run() sanitizes backticks and newlines in failing check names in the eject comment', async() => {
    const stateBody = shepherd.buildStateCommentBody({ sha: 'abc1234', retries: shepherd.CONFIG.MAX_RETRIES });
    const { github, createdComments } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'blocked' } },
        commentsByNumber: { 1: [{ id: 88, body: stateBody }] },
        requiredChecksByNumber: {
            1: [{ __typename: 'StatusContext', context: 'ci/legacy` @evil\ninjected', state: 'FAILURE', isRequired: true }],
        },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    const ejectComment = createdComments.find((c) => c.number === 1 && c.body.includes('removed this PR from the merge queue'));
    assert.ok(ejectComment, 'expected an eject comment');
    const nameLine = ejectComment.body.split('\n').find((l) => l.startsWith('Failing required check(s):'));
    assert.ok(nameLine, 'expected a failing-checks line');
    const namesPart = nameLine.slice('Failing required check(s): '.length);
    // exactly one code span for the one failing check: the only backticks are its two delimiters
    assert.strictEqual((namesPart.match(/`/g) || []).length, 2, 'raw backticks in the name must not survive sanitization');
    assert.ok(nameLine.includes('`ci/legacy‘ @evil injected`'), 'backticks replaced and newline collapsed inside one code span');
    assert.ok(!nameLine.includes('``'), 'no empty/broken code spans from raw backticks');
});

test('run() ejects after retries are exhausted, with failing run links in the comment', async() => {
    const stateBody = shepherd.buildStateCommentBody({ sha: 'abc1234', retries: shepherd.CONFIG.MAX_RETRIES });
    const { github, calls, createdComments } = makeFakeGithub({
        nodes: [makeNode({ autoMergeRequest: { enabledAt: '2026-07-01T00:00:00Z' } })],
        pullsByNumber: { 1: { mergeable_state: 'blocked' } },
        commentsByNumber: { 1: [{ id: 77, body: stateBody }] },
        requiredChecksByNumber: {
            1: [{ __typename: 'CheckRun', name: 'build', conclusion: 'FAILURE', isRequired: true, checkSuite: { workflowRun: { databaseId: 42, url: 'https://example.test/runs/42' } } }],
        },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(calls.includes('removeLabel:1:auto-merge'));
    assert.ok(calls.includes('deleteComment:77'));
    assert.ok(calls.includes('createComment:1'));
    assert.ok(calls.includes('addLabels:1:auto-merge-failed'));
    assert.ok(calls.indexOf('removeLabel:1:auto-merge') < calls.indexOf('addLabels:1:auto-merge-failed'));
    assert.ok(!calls.some((c) => c.startsWith('graphql:disable-automerge')), 'failed-checks eject must not disable auto-merge');
    const ejectComment = createdComments.find((c) => c.number === 1 && c.body.includes('removed this PR from the merge queue'));
    assert.ok(ejectComment, 'expected an eject comment');
    assert.ok(ejectComment.body.startsWith('@octocat '), 'eject comment must @-mention the PR author');
    assert.ok(ejectComment.body.includes('https://example.test/runs/42'));
    assert.ok(ejectComment.body.includes('Auto-merge is still enabled on this PR'), 'armed failed-checks eject must warn auto-merge stays on');
});

test('run() failed-checks eject comment omits the still-armed warning when auto-merge was never enabled', async() => {
    const stateBody = shepherd.buildStateCommentBody({ sha: 'abc1234', retries: shepherd.CONFIG.MAX_RETRIES });
    const { github, createdComments } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'blocked' } },
        commentsByNumber: { 1: [{ id: 77, body: stateBody }] },
        requiredChecksByNumber: {
            1: [{ __typename: 'CheckRun', name: 'build', conclusion: 'FAILURE', isRequired: true, checkSuite: { workflowRun: { databaseId: 42, url: 'https://example.test/runs/42' } } }],
        },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    const ejectComment = createdComments.find((c) => c.number === 1 && c.body.includes('removed this PR from the merge queue'));
    assert.ok(ejectComment, 'expected an eject comment');
    assert.ok(!ejectComment.body.includes('Auto-merge is still enabled'), 'unarmed failed-checks eject must not warn about auto-merge');
    assert.ok(ejectComment.body.includes('`build`'), 'eject comment must name the failing required check');
});

test('run() conflict ejection comment does not @-mention the author', async() => {
    const { github, createdComments } = makeFakeGithub({
        nodes: [makeNode({ mergeable: 'CONFLICTING' })],
        pullsByNumber: { 1: { mergeable_state: 'dirty' } },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    const ejectComment = createdComments.find((c) => c.number === 1 && c.body.includes('removed this PR from the merge queue'));
    assert.ok(ejectComment, 'expected an eject comment');
    assert.ok(!ejectComment.body.includes('@octocat'), 'conflict ejection must not mention the author');
    assert.ok(!ejectComment.body.includes('Auto-merge is still enabled'), 'unarmed conflict eject must not warn about auto-merge');
});

test('run() conflict ejection comment warns that auto-merge stays armed when it is already enabled', async() => {
    const { github, createdComments } = makeFakeGithub({
        nodes: [makeNode({ mergeable: 'CONFLICTING', autoMergeRequest: { enabledAt: '2026-07-01T00:00:00Z' } })],
        pullsByNumber: { 1: { mergeable_state: 'dirty' } },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    const ejectComment = createdComments.find((c) => c.number === 1 && c.body.includes('removed this PR from the merge queue'));
    assert.ok(ejectComment, 'expected an eject comment');
    assert.ok(ejectComment.body.includes('Auto-merge is still enabled on this PR'), 'armed conflict eject must warn auto-merge stays on');
    assert.ok(ejectComment.body.includes('Disable auto-merge'), 'warning must point at the manual disable action');
});

test('run() eject comment omits the mention when the author login is unavailable', async() => {
    const stateBody = shepherd.buildStateCommentBody({ sha: 'abc1234', retries: shepherd.CONFIG.MAX_RETRIES });
    const { github, createdComments } = makeFakeGithub({
        nodes: [makeNode({ author: null })],
        pullsByNumber: { 1: { mergeable_state: 'blocked' } },
        commentsByNumber: { 1: [{ id: 77, body: stateBody }] },
        requiredChecksByNumber: {
            1: [{ __typename: 'CheckRun', name: 'build', conclusion: 'FAILURE', isRequired: true, checkSuite: { workflowRun: { databaseId: 42, url: 'https://example.test/runs/42' } } }],
        },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    const ejectComment = createdComments.find((c) => c.number === 1 && c.body.includes('removed this PR from the merge queue'));
    assert.ok(ejectComment, 'expected an eject comment');
    assert.ok(ejectComment.body.startsWith('🤖'), 'comment must start cleanly without a dangling mention');
});

test('run() merges a clean PR directly', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'clean' } },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(calls.includes('merge:1'));
});

test('run() leaves an ineligible (unapproved) PR with auto-merge already armed alone — no disable call', async() => {
    const nodes = [
        makeNode({
            id: 'PR_5',
            number: 5,
            createdAt: '2026-07-05T00:00:00Z',
            reviewDecision: 'REVIEW_REQUIRED',
            autoMergeRequest: { enabledAt: '2026-07-01T00:00:00Z' },
        }),
    ];
    const { github, calls } = makeFakeGithub({ nodes });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(!calls.some((c) => c.startsWith('graphql:disable-automerge')));
    assert.ok(!calls.some((c) => c.startsWith('updateBranch') || c.startsWith('merge:')));
});

test('run() with batchSize: 1 mutates only the older of two eligible behind PRs', async() => {
    const nodes = [
        makeNode({ id: 'PR_1', number: 1, createdAt: '2026-07-01T00:00:00Z' }),
        makeNode({ id: 'PR_2', number: 2, createdAt: '2026-07-02T00:00:00Z' }),
    ];
    const { github, calls } = makeFakeGithub({
        nodes,
        pullsByNumber: {
            1: { mergeable_state: 'behind' },
            2: { mergeable_state: 'behind' },
        },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false, batchSize: 1 });
    assert.ok(calls.includes('graphql:enable-automerge:"PR_1"'));
    assert.ok(calls.includes('updateBranch:1'));
    assert.ok(!calls.includes('graphql:enable-automerge:"PR_2"'));
    assert.ok(!calls.includes('updateBranch:2'));
});

test('run() falls back to CONFIG.BATCH_SIZE (3) when batchSize is invalid', async() => {
    for (const invalidBatchSize of [0, NaN, undefined]) {
        const nodes = [
            makeNode({ id: 'PR_1', number: 1, createdAt: '2026-07-01T00:00:00Z' }),
            makeNode({ id: 'PR_2', number: 2, createdAt: '2026-07-02T00:00:00Z' }),
            makeNode({ id: 'PR_3', number: 3, createdAt: '2026-07-03T00:00:00Z' }),
            makeNode({ id: 'PR_4', number: 4, createdAt: '2026-07-04T00:00:00Z' }),
        ];
        const { github, calls } = makeFakeGithub({
            nodes,
            pullsByNumber: {
                1: { mergeable_state: 'behind' },
                2: { mergeable_state: 'behind' },
                3: { mergeable_state: 'behind' },
            },
        });
        await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false, batchSize: invalidBatchSize });
        assert.ok(calls.includes('updateBranch:1'), 'batchSize ' + invalidBatchSize);
        assert.ok(calls.includes('updateBranch:2'), 'batchSize ' + invalidBatchSize);
        assert.ok(calls.includes('updateBranch:3'), 'batchSize ' + invalidBatchSize);
        assert.ok(!calls.includes('updateBranch:4'), 'batchSize ' + invalidBatchSize);
    }
});

test('isPermissionError detects 403 status, FORBIDDEN GraphQL errors, and message-only matches; false otherwise', () => {
    assert.strictEqual(shepherd.isPermissionError(Object.assign(new Error('nope'), { status: 403 })), true);
    assert.strictEqual(shepherd.isPermissionError(makePermissionError()), true);
    assert.strictEqual(shepherd.isPermissionError(new Error('Resource not accessible by integration')), true);
    assert.strictEqual(shepherd.isPermissionError(new Error('some other failure')), false);
    assert.strictEqual(shepherd.isPermissionError(null), false);
    assert.strictEqual(shepherd.isPermissionError(undefined), false);
});

test('explainPermissionError includes the permission hint, fix path, and context key', () => {
    const err = new Error('Resource not accessible by integration');
    const msg = shepherd.explainPermissionError('preflight-rollup', err);
    assert.match(msg, /Commit statuses: Read-only and Checks: Read-only/);
    assert.match(msg, /org Settings.*Developer settings.*GitHub Apps.*merge-shepherd.*Permissions/);
    assert.match(msg, /accept the permission update on the repository installation/);
    assert.match(msg, /docs\/MERGE_SHEPHERD\.md/);
    assert.match(msg, /context: preflight-rollup/);
    assert.match(msg, /Resource not accessible by integration/);
});

test('run() fails fast when the preflight rollup probe hits a permission error, without touching the queue', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'behind' } },
        preflightRollupFails: true,
    });
    const core = makeFakeCore();
    const actions = await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.deepStrictEqual(actions, []);
    assert.strictEqual(core.setFailedCalls.length, 1);
    assert.match(core.setFailedCalls[0], /Missing GitHub App permission/i);
    assert.match(core.setFailedCalls[0], /Commit statuses: Read-only/);
    assert.deepStrictEqual(calls, ['graphql:preflight:""']);
    assert.strictEqual(core.summary.writeCount, 1);
    assert.ok(core.summary.lists.some((list) => list.some((item) => /Commit statuses: Read-only/.test(item))));
});

test('run() proceeds normally when a preflight probe fails with a non-permission error', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'behind' } },
        preflightRollupFails: Object.assign(new Error('server error'), { status: 500 }),
    });
    const core = makeFakeCore();
    const actions = await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.strictEqual(core.setFailedCalls.length, 0);
    assert.ok(core.warningCalls.some((w) => /Preflight probe preflight-rollup failed/.test(w)));
    assert.ok(calls.includes('graphql:enable-automerge:"PR_node1"'));
    assert.ok(calls.includes('updateBranch:1'));
    assert.deepStrictEqual(actions.filter((a) => a.type !== 'wait').map((a) => a.type), ['enable-automerge', 'update-branch']);
});

test('run() translates a permission error from the queue query instead of throwing it raw', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [],
        queueQueryFails: true,
    });
    const core = makeFakeCore();
    const actions = await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.deepStrictEqual(actions, []);
    assert.strictEqual(core.setFailedCalls.length, 1);
    assert.match(core.setFailedCalls[0], /Pull requests: Read & write/);
    assert.match(core.setFailedCalls[0], /context: queue-query/);
    assert.ok(calls.includes('graphql:queue:""'));
    assert.strictEqual(core.summary.writeCount, 1);
});

test('run() records a translated permission error for a failed action without failing the run', async() => {
    const { github } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'behind' } },
        automergeFails: true,
    });
    const core = makeFakeCore();
    const actions = await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.strictEqual(core.setFailedCalls.length, 0);
    assert.ok(actions.some((a) => a.type === 'update-branch'));
    assert.strictEqual(core.summary.writeCount, 1);
    assert.ok(core.summary.headings.includes('Errors'));
    assert.ok(core.summary.lists.some((list) => list.some((item) => /Pull requests: Read &amp; write/.test(item) && /context: automerge/.test(item))));
});

test('writeSummary still includes the queue table on the happy path after the try/finally restructure', async() => {
    const { github } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'clean' } },
    });
    const core = makeFakeCore();
    await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.strictEqual(core.summary.writeCount, 1);
    assert.strictEqual(core.summary.tables.length, 1);
    assert.deepStrictEqual(core.summary.tables[0][0], [
        { data: 'PR', header: true },
        { data: 'Status', header: true },
        { data: 'Actions', header: true },
    ]);
    assert.ok(!core.summary.headings.includes('Errors'));
});

test('run() propagates an all-reruns-denied permission error as the rerun (Actions) hint, without writing a state comment', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({ autoMergeRequest: { enabledAt: '2026-07-01T00:00:00Z' } })],
        pullsByNumber: { 1: { mergeable_state: 'blocked' } },
        requiredChecksByNumber: {
            1: [{ __typename: 'CheckRun', name: 'build', conclusion: 'FAILURE', isRequired: true, checkSuite: { workflowRun: { databaseId: 42, url: 'https://example.test/runs/42' } } }],
        },
        rerunFails: true,
    });
    const core = makeFakeCore();
    await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.ok(calls.includes('rerunFailedJobs:42'));
    assert.ok(!calls.includes('createComment:1'));
    assert.ok(!calls.includes('updateComment:1'));
    assert.ok(core.summary.lists.some((list) => list.some((item) => /Actions: Read &amp; write/.test(item) && /context: rerun/.test(item))));
});

test('run() attributes a state-comment write failure after successful reruns to Issues (comments), not Actions', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({ autoMergeRequest: { enabledAt: '2026-07-01T00:00:00Z' } })],
        pullsByNumber: { 1: { mergeable_state: 'blocked' } },
        requiredChecksByNumber: {
            1: [{ __typename: 'CheckRun', name: 'build', conclusion: 'FAILURE', isRequired: true, checkSuite: { workflowRun: { databaseId: 42, url: 'https://example.test/runs/42' } } }],
        },
        createCommentFails: true,
    });
    const core = makeFakeCore();
    await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.ok(calls.includes('rerunFailedJobs:42'));
    assert.ok(calls.includes('createComment:1'));
    assert.ok(core.summary.lists.some((list) => list.some((item) => /Issues: Read &amp; write/.test(item) && /context: comments/.test(item))));
    assert.ok(!core.summary.lists.some((list) => list.some((item) => /context: rerun/.test(item))));
});

test('run() attributes a removeLabel failure during eject to Issues (labels), not the eject action', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({ mergeable: 'CONFLICTING' })],
        removeLabelFails: true,
    });
    const core = makeFakeCore();
    await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.ok(calls.includes('removeLabel:1:auto-merge'));
    assert.ok(core.summary.lists.some((list) => list.some((item) => /Issues: Read &amp; write/.test(item) && /context: labels/.test(item))));
});

test('run() fails the run when the required-checks query 403s for one PR, but still processes the other batch member', async() => {
    const nodes = [
        makeNode({ id: 'PR_1', number: 1, createdAt: '2026-07-01T00:00:00Z' }),
        makeNode({ id: 'PR_2', number: 2, createdAt: '2026-07-02T00:00:00Z' }),
    ];
    const { github, calls } = makeFakeGithub({
        nodes,
        pullsByNumber: {
            1: { mergeable_state: 'behind' },
            2: { mergeable_state: 'behind' },
        },
        requiredChecksFails: { 1: true },
    });
    const core = makeFakeCore();
    await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.strictEqual(core.setFailedCalls.length, 1);
    assert.match(core.setFailedCalls[0], /context: required-checks/);
    assert.ok(core.summary.lists.some((list) => list.some((item) => /context: required-checks/.test(item))));
    assert.ok(calls.includes('updateBranch:2'));
    assert.ok(!calls.includes('updateBranch:1'));
});

test('run() fails preflight when the Contents probe fails, without touching the queue', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({})],
        preflightContentsFails: true,
    });
    const core = makeFakeCore();
    const actions = await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.deepStrictEqual(actions, []);
    assert.strictEqual(core.setFailedCalls.length, 1);
    assert.match(core.setFailedCalls[0], /Contents: Read & write/);
    assert.match(core.setFailedCalls[0], /context: preflight-contents/);
    assert.ok(!calls.some((c) => c.startsWith('graphql:queue')));
});

test('run() treats a preflight probe 404 as a permission failure since probed resources always exist', async() => {
    const { github } = makeFakeGithub({
        nodes: [makeNode({})],
        preflightLabelsFails: Object.assign(new Error('Not Found'), { status: 404 }),
    });
    const core = makeFakeCore();
    const actions = await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.deepStrictEqual(actions, []);
    assert.strictEqual(core.setFailedCalls.length, 1);
    assert.match(core.setFailedCalls[0], /Issues: Read & write/);
    assert.match(core.setFailedCalls[0], /context: preflight-labels/);
});

test('run() warns but proceeds when the rollup preflight probe resolves with an empty default branch', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'behind' } },
        preflightRollupEmptyDefaultBranch: true,
    });
    const core = makeFakeCore();
    await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.strictEqual(core.setFailedCalls.length, 0);
    assert.ok(core.warningCalls.some((w) => /preflight rollup probe inconclusive/.test(w)));
    assert.ok(calls.includes('updateBranch:1'));
});

test('run() HTML-escapes error strings before writing them to the job summary', async() => {
    const { github } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'behind' } },
        automergeFails: new Error('boom <b>bad</b>'),
    });
    const core = makeFakeCore();
    await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.ok(core.summary.lists.some((list) => list.some((item) => item.includes('&lt;b&gt;bad&lt;/b&gt;'))));
    assert.ok(!core.summary.lists.some((list) => list.some((item) => item.includes('<b>bad</b>'))));
});

test('run() fails the run when writing the job summary itself throws', async() => {
    const { github } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'clean' } },
    });
    const core = makeFakeCore({ summaryWriteFails: true });
    await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.ok(core.setFailedCalls.some((m) => /failed to write job summary/.test(m)));
});

test('run() ensures both the queue label and the failed-checks marker label exist', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'clean' } },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(calls.includes('createLabel:auto-merge'));
    assert.ok(calls.includes('createLabel:auto-merge-failed'));
});

test('run() removes the stale auto-merge-failed label from both a batch member and a skipped-ineligible PR that still carry it', async() => {
    const nodes = [
        makeNode({
            id: 'PR_1',
            number: 1,
            createdAt: '2026-07-01T00:00:00Z',
            labels: { nodes: [{ name: 'auto-merge' }, { name: 'auto-merge-failed' }] },
        }),
        makeNode({
            id: 'PR_2',
            number: 2,
            createdAt: '2026-07-02T00:00:00Z',
            isDraft: true,
            labels: { nodes: [{ name: 'auto-merge' }, { name: 'auto-merge-failed' }] },
        }),
    ];
    const { github, calls } = makeFakeGithub({
        nodes,
        pullsByNumber: { 1: { mergeable_state: 'clean' } },
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(calls.includes('removeLabel:1:auto-merge-failed'));
    assert.ok(calls.includes('removeLabel:2:auto-merge-failed'));
});

test('run() in dry-run mode does not remove a stale auto-merge-failed label', async() => {
    const nodes = [
        makeNode({ labels: { nodes: [{ name: 'auto-merge' }, { name: 'auto-merge-failed' }] } }),
    ];
    const { github, calls } = makeFakeGithub({ nodes });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: true });
    assert.deepStrictEqual(calls.filter((c) => !c.startsWith('graphql:queue') && !c.startsWith('graphql:required-checks') && !c.startsWith('graphql:preflight') && !c.startsWith('graphql:closed-failed-label')), []);
});

test('run() removes the auto-merge-failed label from a merged PR that already left the queue', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [],
        closedFailedLabelNodes: [{ number: 42 }],
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(calls.includes('graphql:closed-failed-label:""'));
    assert.ok(calls.includes('removeLabel:42:auto-merge-failed'));
});

test('run() in dry-run mode does not remove the auto-merge-failed label from a merged/closed PR', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [],
        closedFailedLabelNodes: [{ number: 42 }],
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: true });
    assert.ok(!calls.includes('removeLabel:42:auto-merge-failed'));
});

test('run() cleans up a merged PR\'s stale label without affecting an open PR still in the queue', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'clean' } },
        closedFailedLabelNodes: [{ number: 99 }],
    });
    await shepherd.run({ github, context: fakeContext, core: makeFakeCore(), dryRun: false });
    assert.ok(calls.includes('merge:1'));
    assert.ok(calls.includes('removeLabel:99:auto-merge-failed'));
});

test('run() tolerates a 404 when removing the auto-merge-failed label from a merged/closed PR', async() => {
    const { github, calls } = makeFakeGithub({
        nodes: [],
        closedFailedLabelNodes: [{ number: 42 }],
        removeLabelFails: Object.assign(new Error('Not Found'), { status: 404 }),
    });
    const core = makeFakeCore();
    await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.ok(calls.includes('removeLabel:42:auto-merge-failed'));
    assert.strictEqual(core.setFailedCalls.length, 0);
    assert.deepStrictEqual(core.warningCalls, []);
});

test('run() warns and records the error when the merged/closed failed-label query itself fails', async() => {
    const { github } = makeFakeGithub({
        nodes: [makeNode({})],
        pullsByNumber: { 1: { mergeable_state: 'clean' } },
        closedFailedLabelFails: true,
    });
    const core = makeFakeCore();
    const actions = await shepherd.run({ github, context: fakeContext, core, dryRun: false });
    assert.strictEqual(core.setFailedCalls.length, 0);
    assert.ok(core.warningCalls.some((w) => /context: labels/.test(w)));
    // the rest of the run must proceed unaffected by this cleanup query failing
    assert.deepStrictEqual(actions.map((a) => a.type), ['merge']);
});
