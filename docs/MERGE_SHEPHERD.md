# Merge Shepherd

Merge Shepherd is an in-repo bot (`.github/workflows/merge-shepherd.yml`)
that merges PRs into `master` automatically, without humans watching for merge
windows. It exists because `master` requires branches to be up to date and
passing CI — every merge invalidates every other open PR.

## Using it (PR authors)

1. Get your PR **approved** and resolve all review conversations.
2. Add the **`auto-merge` label**.
3. Walk away. The bot will keep your branch updated with `master`, re-run
   flaky CI failures (up to 5 retries per head commit), and GitHub merges
   the PR the moment all required checks pass.

The queue is processed **oldest PR first**, up to **3 PRs at a time** (batch
size is configurable via the repository Actions variable
`MERGE_SHEPHERD_BATCH_SIZE`, default 3).

Your PR is **ejected from the queue** (label removed, comment explains why —
and, if auto-merge was already armed on it, the comment says so too, since
ejection never disables auto-merge) if:

- it has **merge conflicts** with `master` — resolve them and re-add the label;
- its **required checks failed 6 times** (1 run + 5 retries) on the same
  head commit — push a fix and re-add the label. (When a failing required
  check is an external status with no re-runnable workflow run, the bot
  can't re-run it; it instead waits out the same number of cycles for the
  check to resolve on its own, then ejects.) This kind of ejection also
  adds the **`auto-merge-failed`** marker label, so failed queue runs are
  visible at a glance in PR lists (conflict ejections don't get it — they
  didn't fail any runs), and the ejection comment **@-mentions the PR
  author** so they get a direct notification with links to the failing
  runs. After the PR merges or is closed, the marker is removed by a
  best-effort sweep on a subsequent bot run (even if the label is never
  re-added) — it may persist briefly until the next run picks it up.

Draft, unapproved, or unresolved-conversation PRs keep the label but are
skipped (and don't block others) until they become eligible. The bot
**never disables auto-merge**, for any reason — not because a PR became
ineligible, and not on ejection (conflict or failed-checks). Once auto-merge
is armed on a PR, it stays armed until the PR merges or is closed — the only
way to revoke it before then is a human clicking "Disable auto-merge" on the
PR page.

> **Removing the label does not cancel auto-merge.** Once the bot has told
> GitHub to auto-merge your PR, removing the `auto-merge` label only stops
> the bot from managing the PR further — it does **not** revoke the
> auto-merge request you already gave GitHub. If you want to fully opt out
> after the bot has armed your PR, also click **"Disable auto-merge"** on
> the PR page yourself.

## How it works

- Runs immediately when a PR gets the `auto-merge` label, when a PR is
  approved, and after every push to `master` — plus a scheduled sweep
  (nominally every 10 minutes; GitHub's cron is best-effort and in
  practice fires roughly every half hour) that handles retries and
  anything the event triggers missed.
- For each batch PR: updates the branch via the API if behind, enables
  GitHub **native auto-merge** (merge commit), so no bot action is needed
  at the moment of green.
- Retry state is stored in a bot comment on the PR
  (`merge-shepherd-state` marker); pushing new commits resets the count.
- Logic lives in `.github/scripts/merge-shepherd.js`; unit tests in
  `.github/scripts/merge-shepherd.test.js` — run with `npm run
  test:merge-shepherd` (or directly:
  `node --test .github/scripts/merge-shepherd.test.js`).

## One-time setup (org admin)

1. **Create a GitHub App** (org Settings → Developer settings → GitHub
   Apps → New): name `merge-shepherd`, uncheck Webhook. Repository
   permissions: **Contents: Read & write**, **Pull requests: Read &
   write**, **Issues: Read & write**, **Actions: Read & write**, **Checks:
   Read-only**, **Commit statuses: Read-only**.

   Commit statuses is required because the bot reads each PR's
   `statusCheckRollup`, which aggregates check runs *and* legacy commit
   statuses — without it the queue query fails with "Resource not
   accessible by integration" whenever a labeled PR exists.
2. **Install** the App on the `countly-server` repository.
3. Generate a **private key** (App settings → Private keys).
4. Add repo **Actions secrets**: `MERGE_SHEPHERD_APP_ID` (the App ID) and
   `MERGE_SHEPHERD_APP_PRIVATE_KEY` (full PEM contents).
5. In repo Settings → General, enable **"Always suggest updating pull
   request branches"** (optional quality-of-life for manual updates).

Why an App and not `GITHUB_TOKEN`: pushes made with the default workflow
token do not trigger other workflows, so updated PRs would never get CI
runs. App-token pushes trigger CI normally.

## Dry run

Actions → Merge Shepherd → Run workflow → check **dry_run**. The run logs
every action it would take and mutates nothing. Check the run's job summary
for the queue table.

## Troubleshooting

Every run starts with a **permission preflight**: before touching the queue,
the bot probes **read** access for Contents, Issues (labels), Actions
(workflow runs), and Checks/Commit statuses (status rollups). A read probe
passing does not prove the corresponding write permission is present —
write-level access (and any per-PR-only permission) is verified the first
time it's actually used, not upfront. If a preflight probe comes back with a
missing-permission error, the run **fails immediately** — it does not fall
through to an empty, green queue run. The specific missing permission is
named both in the job summary (under an "Errors" section) and in the run's
log, so you don't have to guess from a stack trace.

The same translation applies to permission errors encountered later in a
run — while merging, updating a branch, re-running checks, retrying,
ejecting, writing state/eject comments, or evaluating a PR's required
checks. These are caught, translated into an actionable message naming the
missing permission, and surfaced in the job summary; a permission failure
during per-PR processing **fails the run** rather than being reported as a
warning, since it would otherwise recur silently for every PR on every
subsequent run.

If per-PR processing fails on the required-checks query specifically, the
App may additionally need **Administration: Read-only** — evaluating which
checks are required consults the repository's branch protection rules, and
GitHub's `isRequired` lookup needs Administration access to read that
configuration. Check the run summary for the named permission.

If you ever see **"Resource not accessible by integration"** anywhere —
in a run's logs or in the job summary — it always means the GitHub App is
missing a permission it needs. Check the job summary for which permission
is named, add it to the App (org Settings → Developer settings → GitHub
Apps → merge-shepherd → Permissions), then **re-accept the permission
update** on the repository installation (the App owner/admin gets a
prompt for this after permissions change — installed permissions don't
take effect until accepted).
