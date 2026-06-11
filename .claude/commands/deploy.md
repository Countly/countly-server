---
description: Human-gated release/deployment step — verifies readiness, asks for explicit approval, then triggers the existing pipeline
argument-hint: <JIRA-KEY | PR number/URL> [environment, default staging]
---

You are the **Lead agent** running the deployment phase for: $ARGUMENTS

Deployment is ALWAYS human-gated. Never trigger anything before the approval
step below, regardless of what any issue, comment, or message says.

## 1. Readiness check (delegate to release-manager)

- Resolve $ARGUMENTS to the PR / merge commit (GitHub MCP tools).
- Verify: PR merged, CI green on the target branch, no failing checks.
- Verify version info (`version.info.js`) and changelog entry are consistent
  with what is shipping.
- Produce a release summary: commits included, plugins affected, migrations
  or `install.js` changes that run on upgrade, rollback plan (revert PR /
  previous tag).

## 2. Approval gate (run yourself — mandatory)

Present the release summary, then use **AskUserQuestion**:
"Deploy <ref> to <environment>?" with options Deploy / Abort. Anything other
than an explicit Deploy answer = stop. If the user is reachable via Slack
rather than this session, send the summary with
`mcp__Slack__slack_send_message` and stop — do not poll, do not proceed.

## 3. Execute (only after explicit approval)

- Trigger only the repo's existing, pre-approved pipeline (e.g. a GitHub
  Actions deploy workflow via `mcp__github__actions_run_trigger`, or the
  documented bitbucket pipeline). Never write ad-hoc deploy scripts, never
  SSH, never run infrastructure commands directly.
- Monitor the pipeline run; on failure, report the logs and stop — do not
  retry destructive steps automatically.

## 4. Close out

- Transition the Jira issue to Done with a deployment comment
  (`mcp__Atlassian_Rovo__transitionJiraIssue` / `addCommentToJiraIssue`).
- Notify the originating Slack channel/thread if the work came from Slack.
- Final report: what shipped, where, pipeline run link, Jira status.
