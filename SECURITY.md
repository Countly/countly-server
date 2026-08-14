# Security Policy

Security is very important to us. If you discover any issue regarding security, please disclose the information responsibly by sending an email to security@count.ly and not by creating a GitHub issue.

All software related security bugs with severity of medium and higher will be awarded accordingly with a bug bounty reward.

# Vulnerability levels

The levels are ordered on what an attacker must already have, before impact is considered. A finding that requires no account always grades above one that requires an account. That ordering follows from Countly being deployed as a single-tenant application: whoever holds a dashboard account is someone the deployment has already extended trust to, so a finding that requires an account is bounded by an internal trust boundary, whereas one that requires no account is not bounded at all.

**Critical Severity:** no account is needed, and no additional information or special conditions either. It can be exploited as it stands, and the impact reaches the highest permissions in the system, up to full takeover.

**High Severity:** no account is needed, but exploitation requires additional information or special conditions. A credential that ships inside the customer's own application, such as an app key, is not an account for this purpose, since it can be read out of any deployed application or website.

**Medium Severity:** an account is required, and the impact is either data an application has collected from its end users, or a credential that grants access. Gaining permissions the account was not granted counts too, whether at a higher level or at the same level on an application where it holds no role.

Descriptive information about the deployment itself, such as which applications and members exist and what they are called, is not sufficient for Medium on its own. In a single-tenant deployment that is ordinarily known to colleagues already, so a finding limited to it is Low.

**Low** - no bounty rewards. Either the business impact is small, or reproduction depends on a chain of conditions so unlikely that it does not amount to a practical attack. This applies at any level of access: a finding that needs no account is still Low when what it yields does not matter, such as exposing a software version, which can be mapped to specific vulnerabilities, old dependencies, or server misconfiguration.

**Exclusions (out of scope — not eligible for bounty)**

The following are out of scope. They may still be reported, and configuration issues will be forwarded to the relevant parties, but they do not qualify for a bounty reward:

1. **Deployment & server configuration.** Server-specific and deployment-specific configuration issues, due to the on-premises nature of our software (TLS setup, reverse-proxy/CORS/header configuration, exposed ports, OS/database hardening, rate-limiting tuning, etc.). These are forwarded to the relevant departments/parties/companies but carry no bounty guarantee.

2. **Privileged / admin-only endpoints behaving as designed.** Endpoints intended to be used only by authenticated global administrators or trusted server operators — for example `/mobile-login` and other operator/management endpoints — are not vulnerabilities when they require the privileges they are designed to require. "A global admin can do X across the system" is by design; global admin is a fully trusted role.

3. **By-design cross-app access for global admins.** Plugins and features whose documented purpose is to aggregate or operate on data across multiple applications for global administrators are working as intended. Accessing cross-app data while holding global-admin rights is not a privilege escalation.

4. **Findings that require code already fixed in the current codebase.** Reports reproduced only against an outdated or unpatched running server, demo, or hosted instance — where the issue is already fixed in the current source — are not eligible. Bounty assessment is made against the current code in this repository.

5. **Excluded plugins.** Plugins that are not enabled by default — i.e. not listed in `plugins/plugins.default.json` — are out of scope, since they may be experimental, uncommonly used, or deprecated. In addition, the `consolidate` and `errorlogs` plugins are out of scope even though they are enabled by default.

6. **Reliance on already-privileged access.** Issues that require the attacker to already hold rights equal to or greater than the access obtained (e.g. needing global admin to reach data a global admin already sees), or that depend on knowing a non-enumerable identifier of another tenant that is only ever exposed to authorized users.

7. **Duplicates and already-known issues.** Reports duplicating an already-reported or already-fixed issue; only the first actionable report is eligible.

8. **Theoretical, self-inflicted, or hardening-only issues.** Issues without a working proof of concept, self-inflicted issues (self-XSS, pasting attacker scripts into one's own console/session), and missing best-practice hardening that does not itself lead to an exploit (covered under "Low" above).

9. **Hooks custom-code effects.** The Hooks plugin's custom-code effect runs operator-supplied JavaScript and is being migrated to a stronger isolation model (`isolated-vm`) in an upcoming release, which removes the existing execution surface entirely. Issues that depend on the behaviour of the current custom-code sandbox (for example escaping or abusing the bundled sandbox's built-in helpers) are out of scope. Note that the Hooks plugin already requires an authenticated account with the relevant per-app hooks permission, and the custom-code effect executes code the operator themselves configured.

10. **Instances of a vulnerability class already under active remediation.** Findings that are additional instances of a vulnerability class we are already remediating — including work visible in an open or in-progress pull request, a public branch, or another not-yet-released fix — are considered part of that known, ongoing effort and are not separately eligible. Enumerating sibling occurrences of an issue from our published or in-progress remediation is not an independent discovery. Independently discovered issues remain welcome.

11. **Cross-site scripting (XSS) without a working proof of concept.** XSS reports that do not demonstrate actual script execution in an authenticated dashboard session are out of scope. Pointing at a potential sink (for example a `v-html` binding or a DOM write) is not sufficient on its own, since the value reaching a sink may already be neutralized elsewhere in the request handling or rendering pipeline. XSS with a working end-to-end proof of concept — including DOM-based XSS that originates from the URL or other client-controlled input — is in scope and welcome.

12. **Further instances of a root cause you have already reported.** Where a report is another instance of a root cause you previously reported to us — the same defective function, check, or pattern, reached through a different parameter, endpoint, or event — it is treated as part of that original report and is awarded once, under the original submission. We expect a report to cover the instances its own analysis reaches: having identified a root cause, enumerating the remaining places it applies is part of that finding rather than a new one. This applies whether or not we had finished remediating the first report. Independent discovery of the same class by a different researcher is assessed on its own merits, and genuinely distinct root causes are always separate reports.

13. **Heatmaps and the `/o/actions` endpoint.** The click and scroll heatmap feature is no longer supported. That covers the `/o/actions` endpoint, the on-site heatmap overlay it serves, and the tokens minted to view a heatmap. Findings limited to this feature are out of scope and do not qualify for a bounty reward, including access control issues in `/o/actions`. Reports are still welcome, and we will still fix what reaches the rest of the codebase: where a root cause found through `/o/actions` is also reachable on a supported surface, it is assessed on that surface rather than on the heatmap one. Page view analytics in the `views` plugin are not covered by this exclusion and remain in scope.
