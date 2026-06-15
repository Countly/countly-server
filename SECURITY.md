# Security Policy

Security is very important to us. If you discover any issue regarding security, please disclose the information responsibly by sending an email to security@count.ly and not by creating a GitHub issue.

All software related security bugs with severity of medium and higher will be awarded accordingly with a bug bounty reward.

# Vulnerability levels
**Critical Severity:** software can be exploited at any time without any additional information

**High Severity:** some additional information, access or action required (from the user, like clicking on injected link) for software to be exploited

**Medium Severity:** the impact is limited (for example, can only access limited information) or requires special conditions to achieve it (when server is configured in specific way)

**Low** - no bounty rewards, does not directly lead to vulnerability, but provides a possibility (like exposing software version, which can be mapped to specific vulnerabilities), old dependencies, server misconfiguration

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

11. **Cross-site scripting (XSS) without a working proof of concept.** An XSS report must include a working proof of concept that demonstrates script execution in an authenticated dashboard session. Pointing at a potential sink (for example a `v-html` binding or a DOM write) without an end-to-end demonstration of execution is not sufficient on its own, since the value reaching a sink may already be neutralized elsewhere in the request handling or rendering pipeline. Reports that show actual execution — including DOM-based XSS that originates from the URL or other client-controlled input — are in scope and welcome.
