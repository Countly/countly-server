# Security Policy

Security is very important to us. If you discover any issue regarding security, please disclose the information responsibly by sending an email to security@count.ly and not by creating a GitHub issue.

Software related security bugs with a severity of medium or higher are eligible for a bug bounty reward. Rewards, and the amount of any reward, are at our discretion, and we determine the severity of a report against this policy. A single reward is made per root cause, to the first person to send us an actionable report of it, regardless of how many endpoints, parameters or requests that root cause is reachable through.

Reporting privately and giving us time to release a fix is a condition of eligibility. Publishing a finding, in any form, before a fix is released ends eligibility for a reward.

# What is in scope

In scope is the source code of the Countly products in our public repositories, tested on a deployment you control.

Out of scope, and not eligible for a reward, is everything else, including our marketing website and other public web properties, hosted or demo instances, our own infrastructure, and any third party service we happen to use. Findings there may still be reported and we will forward them internally, but they carry no reward.

Please test against your own installation. Testing against a hosted, shared or production instance, or any testing that degrades service or touches data that is not yours, is not eligible and may end participation in the programme.

# Vulnerability levels

The levels are ordered on what an attacker must already have, before impact is considered. A finding that requires no account always grades above one that requires an account. That ordering follows from Countly being deployed as a single-tenant application: whoever holds a dashboard account is someone the deployment has already extended trust to, so a finding that requires an account is bounded by an internal trust boundary, whereas one that requires no account is not bounded at all.

We assess a report against a default deployment. Where the impact depends on a condition outside the product, for example a target service's own configuration, how a customer has set up an SDK, or a deployment choice an operator made, we grade on what is reachable with the shipped defaults.

**Critical Severity:** no account is needed, and no additional information or special conditions either. It can be exploited as it stands, and the impact reaches the highest permissions in the system, up to full takeover.

**High Severity:** no account is needed, but exploitation requires additional information or special conditions. A credential that ships inside the customer's own application, such as an app key, is not an account for this purpose, since it can be read out of any deployed application or website.

**Medium Severity:** an account is required, and the impact is either data an application has collected from its end users, or a credential that grants access. Gaining permissions the account was not granted counts too, whether at a higher level or at the same level on an application where it holds no role, where what is gained is access to data or to a credential.

Obtaining something the account can already reach through supported use of the product is not an escalation and is not Medium. Neither is an effect that changes no data and grants no access, such as replacing one image with another, or a change that the owner reverses by repeating a normal action.

Descriptive information about the deployment itself, such as which applications and members exist and what they are called, is not sufficient for Medium on its own. In a single-tenant deployment that is ordinarily known to colleagues already, so a finding limited to it is Low.

**Low** - no bounty rewards. Either the business impact is small, or reproduction depends on a chain of conditions so unlikely that it does not amount to a practical attack. This applies at any level of access: a finding that needs no account is still Low when what it yields does not matter, such as exposing a software version, which can be mapped to specific vulnerabilities, old dependencies, or server misconfiguration. Hardening improvements, defence in depth suggestions, and findings whose only effect is cosmetic or non functional are Low.

**Exclusions (out of scope — not eligible for bounty)**

The following are out of scope. They may still be reported, and configuration issues will be forwarded to the relevant parties, but they do not qualify for a bounty reward:

1. **Deployment and server configuration.** Server-specific and deployment-specific configuration issues, due to the on-premises nature of our software (TLS setup and cipher choice, reverse-proxy/CORS/header configuration, response headers, cookie flags, exposed ports, OS/database hardening, rate-limiting tuning, mail related DNS records such as SPF, DKIM and DMARC, etc.). These are forwarded to the relevant departments/parties/companies but carry no bounty guarantee.

2. **Findings that need privileged or already sufficient access.** Anything that requires global admin, a server operator, database access, or another fully trusted role. "A global admin can do X across the system" is by design: global admin is a fully trusted role, and features whose documented purpose is to operate across applications for global administrators are working as intended. Also out of scope are findings that require the attacker to already hold rights equal to or greater than the access obtained, that depend on a credential the account holder was deliberately given or chose to share, or that depend on knowing a non-enumerable identifier of another tenant that is only ever exposed to authorized users.

3. **Issues already known to us.** Reports covering an issue, or an area of the codebase, that we had already identified before the report was received are not eligible, whether or not remediation had begun and whether or not the fix has been released. This includes anything recorded in our internal tracking, noted in source comments, commit messages, branches or pull requests, already fixed in the current code, or otherwise queued for review. Areas pending review are not published, so a report may be declined on this basis without a public record existing beforehand. It also covers duplicates, where only the first actionable report of a root cause is eligible, and further instances of a root cause already reported to us, whether by you or by someone else: having identified a root cause, enumerating the remaining places it applies is part of that finding rather than a new one. Independently discovered, genuinely distinct root causes remain welcome.

4. **Unsupported, deprecated, or non-default functionality.** Plugins that are not enabled by default, i.e. not listed in `plugins/plugins.default.json`, features that are deprecated or no longer supported, and behaviour that only appears under a non-default configuration. In addition, the `consolidate` and `errorlogs` plugins are out of scope even though they are enabled by default. The click and scroll heatmap feature is no longer supported, which covers the `/o/actions` endpoint, the on-site heatmap overlay it serves, and the tokens minted to view a heatmap. Page view analytics in the `views` plugin remain in scope.

5. **No working proof of concept.** Issues without a demonstrated, working proof of concept against current code, including findings from source reading, static analysis or automated scanners alone, and reports where a potential sink is identified but execution or disclosure is not shown. This covers cross-site scripting in particular: an XSS report must demonstrate actual script execution in an authenticated dashboard session, since a value reaching a sink may already be neutralized elsewhere in the request handling or rendering pipeline. XSS with a working end-to-end proof of concept, including DOM-based XSS originating from the URL or other client-controlled input, is in scope and welcome. Also excluded are self-inflicted issues, such as self-XSS or pasting attacker scripts into one's own console or session, and missing best-practice hardening that does not itself lead to an exploit.

6. **Denial of service and resource exhaustion.** Volumetric or application-level denial of service, resource exhaustion, expensive queries or requests, algorithmic complexity, and anything whose impact is availability or cost rather than confidentiality or integrity.

7. **Attacks that need a compromised client or a network position.** Findings that depend on a rooted, jailbroken or already compromised device, a malicious browser extension, an attacker-controlled network position or machine-in-the-middle, an outdated or end-of-life browser or platform, or physical access to a device. Social engineering and phishing of our staff, our customers or their users is also out of scope.

8. **Third-party dependencies and services.** Vulnerabilities in third-party libraries, packages or services without a demonstrated exploit through Countly, including reports that name a published advisory in a dependency we ship. We track dependency advisories separately.

9. **Best-practice and informational findings.** Reports whose impact is not demonstrated, including missing or misconfigured headers, cookie attributes, user or account enumeration and differing error messages, clickjacking on pages with no sensitive action, open redirects without a demonstrated consequence, content or text spoofing without script execution, tabnabbing, host header handling without impact, version disclosure, and similar.

10. **Hooks custom-code effects.** The Hooks plugin's custom-code effect runs operator-supplied JavaScript and is being migrated to a stronger isolation model (`isolated-vm`) in an upcoming release, which removes the existing execution surface entirely. Issues that depend on the behaviour of the current custom-code sandbox (for example escaping or abusing the bundled sandbox's built-in helpers) are out of scope. Note that the Hooks plugin already requires an authenticated account with the relevant per-app hooks permission, and the custom-code effect executes code the operator themselves configured.
