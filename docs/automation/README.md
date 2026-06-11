# Automated SDLC with Claude Code — Countly

End-to-end software development lifecycle automation built **only** with
native Claude Code features — subagents, slash commands, and MCP
integrations. No custom orchestration code.

## Pipeline

```
Jira issue / Slack message / free text
        │   /sdlc <JIRA-KEY | slack thread | text>
        ▼
┌─ Lead (main session, orchestrator per CLAUDE.md) ──────────────────────┐
│                                                                         │
│ 0. Intake        Jira MCP / Slack MCP → requirement + classification    │
│ 1. Spec          tech-spec agent      → technical specification         │
│ 2. Design        ui-ux-design agent   → UI spec (only if UI work)       │
│ 3. Branch        release-manager      → <KEY>-<Short-Title>            │
│ 4. Implement     backend-dev ∥ frontend-dev (parallel when independent) │
│ 5. Test          qa-test agent        → mocha/cypress, lint, build      │
│ 6. Document      docs-writer agent    → i18n, JSDoc, changelog, drafts  │
│ 7. Review        code-reviewer agent  → security + spec conformance     │
│ 8. Gate          Lead runs lint + grunt dist-all + plugin tests         │
│ 9. Deliver       release-manager      → push, PR, CI watch, Jira sync   │
│ 10. Babysit      PR events → fix CI / answer reviews until merge        │
└─────────────────────────────────────────────────────────────────────────┘
        ▼
/deploy <KEY|PR>  → readiness check → HUMAN APPROVAL → existing pipeline
```

Changes vs. the original flow idea: a **UI/UX design phase**, an automated
**code-review gate** before the PR, **Jira status sync** throughout, and
deployment split into its own **human-approved** command.

## Components (all in this repo)

| Path | What it is |
|------|------------|
| `docs/automation/AGENT_PLAYBOOK.md` | Roles, checklists, security rules — the shared contract all agents follow |
| `.claude/agents/tech-spec.md` | Specification writer (no code) |
| `.claude/agents/ui-ux-design.md` | Design-system-constrained UI spec writer (no code) |
| `.claude/agents/backend-dev.md` | api/api.js, install.js, hooks, Mongo |
| `.claude/agents/frontend-dev.md` | Vue/Vuex, templates, SASS, i18n |
| `.claude/agents/qa-test.md` | Mocha/Cypress tests + lint/build gates |
| `.claude/agents/docs-writer.md` | i18n, JSDoc, changelog, PR/Jira drafts |
| `.claude/agents/code-reviewer.md` | Read-only security/correctness review |
| `.claude/agents/release-manager.md` | Branch, commits, PR, CI, Jira, deploy prep |
| `.claude/commands/sdlc.md` | `/sdlc` — the full pipeline |
| `.claude/commands/deploy.md` | `/deploy` — human-gated release |
| `docs/automation/specs/` | Generated spec/design documents per issue |

## How a cycle starts (triggers)

**Manual (works today):** anyone runs, in Claude Code (CLI, desktop, or
claude.ai/code against this repo):

```
/sdlc CLY-1234
/sdlc https://yourteam.slack.com/archives/C0123/p1718000000000
/sdlc fix: funnels page crashes when a step has no events
```

**From Slack (works today):** with the Claude Slack integration installed,
mention Claude in a thread and ask it to start a Claude Code session on this
repo with `/sdlc <this thread>`. The Slack MCP tools let the session read the
thread and report back to it.

**From Jira (automation):** Jira Automation rule on issue label
`claude-dev` → send a Slack message (or GitHub comment) containing
`/sdlc <ISSUE-KEY>`, which a teammate (or scheduled Claude session) picks up.
Fully unattended kickoff can also be done with the GitHub Action template
below: have Jira Automation open/comment on a GitHub issue with
`@claude /sdlc <ISSUE-KEY>`.

**From GitHub:** install the template in
`docs/automation/templates/claude-github-action.yml` as
`.github/workflows/claude.yml` (needs `ANTHROPIC_API_KEY` repo secret).
Then `@claude /sdlc CLY-1234` in any issue/PR comment starts the pipeline.

## Required integrations (MCP)

Claude Code on the web with the Countly environment already has these. For
local CLI use, connect:

| Integration | How |
|-------------|-----|
| Jira/Confluence | `claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse` then `/mcp` to authenticate |
| GitHub | Built into managed sessions; locally use the GitHub MCP server or `gh` CLI |
| Slack | Anthropic Slack connector (claude.ai/code) or a Slack MCP server locally |
| Figma (optional) | Figma Dev Mode MCP, used by the ui-ux-design agent |

## Safety model

- Specs and reviews are produced by agents that **cannot edit code**
  (tool-restricted in their frontmatter).
- All agents inherit the security rules in `CLAUDE.md` (auth validation,
  app_id scoping, Mongo query validation — reject, never strip).
- qa-test must report real command output; "not run" is never "passed".
- code-reviewer must APPROVE before a PR is opened.
- `/deploy` never executes without an explicit human approval via
  AskUserQuestion (or stops after sending a Slack summary). It only triggers
  pre-existing pipelines — no ad-hoc deploy scripts.

## Origin

This system is mirrored from `countly-enterprise-plugins`. The agent roles,
checklists, and security rules the subagents follow live in
`docs/automation/AGENT_PLAYBOOK.md`; this repo's `CLAUDE.md` and
`CODING_GUIDELINES.md` apply in full as well.
