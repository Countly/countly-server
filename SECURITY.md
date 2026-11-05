# Security Policy

Security is very important to us. If you discover a security issue in Countly, please report it privately by email to security@count.ly, or through GitHub's private vulnerability reporting ("Report a vulnerability" on this repository's Security tab), not by opening a public GitHub issue or pull request.

# No bug bounty

Countly does not run a bug bounty programme. We do not offer, promise or negotiate payment, rewards or swag for security reports, and a report does not create any obligation to pay. Please do not send reports in expectation of a reward, and do not attach payment details.

Reports are still very welcome, and they are part of how we keep Countly secure.

# What happens to a report

- **Every report is evaluated.** Each report that reaches security@count.ly is recorded and assessed by our team against this policy, and we act on what we confirm: valid issues are fixed and released according to their severity.
- **Replies are not guaranteed.** We receive a high volume of reports, many of them duplicates or automated. We cannot promise to acknowledge or answer every report, to give status updates, or to discuss our assessment. Not hearing back does not mean a report was not read.
- **Fixes ship in regular releases.** Security fixes are released through our normal release process and noted in the changelog. We do not commit to a timeline for any single report.
- **Duplicates.** Once a root cause is known to us, further reports of it, or of other places the same root cause applies, are recorded against the original assessment.

# How to report

A report we can act on quickly includes:

- the affected product and version, or the commit you tested;
- the component, endpoint or file involved;
- clear steps to reproduce on a deployment you control, and a working proof of concept;
- what an attacker needs beforehand (no account, an app key, a member account with specific rights, and so on) and what they gain.

Please send one root cause per report, in plain text or Markdown, and avoid sending the same finding more than once. Reports produced by scanners or AI tools without a verified, working reproduction will be given low priority.

If you are a Countly customer with a support agreement, please also raise the issue through your support channel.

# Testing and disclosure

- Test only against a deployment you control. Do not test against our hosted, shared, demo or production instances, our websites or infrastructure, or any third-party service, and do not access, change or delete data that is not yours.
- Do not run tests that degrade service for anyone else, and do not use social engineering or phishing against our staff, customers or their users.
- Keep the details private until a fix has been released, and give us reasonable time to release one. We may publish our own advisory once a fix is available.
- We will not pursue legal action against good-faith research that follows this policy.

# Supported versions

Security fixes are made on the current release line. Older releases may not receive fixes, so please test against the latest release or the `master` branch.

# How we assess severity

We use the levels below to decide how urgently a confirmed issue is fixed. They are ordered on what an attacker must already have, before impact is considered. A finding that requires no account always grades above one that requires an account. That ordering follows from Countly being deployed as a single-tenant application: whoever holds a dashboard account is someone the deployment has already extended trust to, so a finding that requires an account is bounded by an internal trust boundary, whereas one that requires no account is not bounded at all.

We assess a report against a default deployment. Where the impact depends on a condition outside the product, for example a target service's own configuration, how a customer has set up an SDK, or a deployment choice an operator made, we grade on what is reachable with the shipped defaults.

**Critical:** no account is needed, and no additional information or special conditions either. It can be exploited as it stands, and the impact reaches the highest permissions in the system, up to full takeover.

**High:** no account is needed, but exploitation requires additional information or special conditions. A credential that ships inside the customer's own application, such as an app key, is not an account for this purpose, since it can be read out of any deployed application or website.

**Medium:** an account is required, and the impact is either data an application has collected from its end users, or a credential that grants access. Gaining permissions the account was not granted counts too, whether at a higher level or at the same level on an application where it holds no role, where what is gained is access to data or to a credential.

Obtaining something the account can already reach through supported use of the product is not an escalation and is not Medium. Neither is an effect that changes no data and grants no access, such as replacing one image with another, or a change that the owner reverses by repeating a normal action.

Descriptive information about the deployment itself, such as which applications and members exist and what they are called, is not sufficient for Medium on its own. In a single-tenant deployment that is ordinarily known to colleagues already, so a finding limited to it is Low.

**Low:** either the business impact is small, or reproduction depends on a chain of conditions so unlikely that it does not amount to a practical attack. This applies at any level of access: a finding that needs no account is still Low when what it yields does not matter, such as exposing a software version. Hardening improvements, defence in depth suggestions, and findings whose only effect is cosmetic or non functional are Low.

# What we do not treat as vulnerabilities

The following may still be reported, and configuration issues will be passed on to the relevant parties, but we do not treat them as security vulnerabilities in Countly:

1. **Deployment and server configuration.** Server-specific and deployment-specific configuration, due to the on-premises nature of our software: TLS setup and cipher choice, reverse-proxy, CORS and header configuration, response headers, cookie flags, exposed ports, OS and database hardening, rate-limiting tuning, mail DNS records such as SPF, DKIM and DMARC, and similar.

2. **Findings that need privileged or already sufficient access.** Anything that requires global admin, a server operator, database access, or another fully trusted role. "A global admin can do X across the system" is by design: global admin is a fully trusted role, and features whose documented purpose is to operate across applications for global administrators are working as intended. Also covered are findings that require the attacker to already hold rights equal to or greater than the access obtained, that depend on a credential the account holder was deliberately given or chose to share, or that depend on knowing a non-enumerable identifier that is only ever exposed to authorized users.

3. **Unsupported, deprecated, or non-default functionality.** Plugins that are not enabled by default, i.e. not listed in `plugins/plugins.default.json`, features that are deprecated or no longer supported, and behaviour that only appears under a non-default configuration. The `consolidate` and `errorlogs` plugins are also excluded even though they are enabled by default. The click and scroll heatmap feature is no longer supported, which covers the `/o/actions` endpoint, the on-site heatmap overlay it serves, and the tokens minted to view a heatmap. Page view analytics in the `views` plugin remain in scope.

4. **No working proof of concept.** Issues without a demonstrated, working proof of concept against current code, including findings from source reading, static analysis or automated scanners alone, and reports where a potential sink is identified but execution or disclosure is not shown. A cross-site scripting report must demonstrate actual script execution in an authenticated dashboard session, since a value reaching a sink may already be neutralized elsewhere in the request handling or rendering pipeline. Self-inflicted issues, such as self-XSS or pasting scripts into one's own console or session, are excluded.

5. **Denial of service and resource exhaustion.** Volumetric or application-level denial of service, resource exhaustion, expensive queries or requests, algorithmic complexity, and anything whose impact is availability or cost rather than confidentiality or integrity.

6. **Attacks that need a compromised client or a network position.** Findings that depend on a rooted, jailbroken or already compromised device, a malicious browser extension, an attacker-controlled network position or machine-in-the-middle, an outdated or end-of-life browser or platform, or physical access to a device.

7. **Third-party dependencies and services.** Vulnerabilities in third-party libraries, packages or services without a demonstrated exploit through Countly, including reports that only name a published advisory in a dependency we ship. We track dependency advisories separately.

8. **Best-practice and informational findings.** Reports whose impact is not demonstrated, including missing or misconfigured headers, cookie attributes, user or account enumeration and differing error messages, clickjacking on pages with no sensitive action, open redirects without a demonstrated consequence, content or text spoofing without script execution, tabnabbing, host header handling without impact, version disclosure, and similar.

9. **By-design behaviour of the SDK ingestion API.** The SDK write API is authenticated only by the public app key and cannot verify which device a request comes from, so sending data, consent changes or device-id merges for a device id is expected behaviour, not a vulnerability.

10. **Hooks custom-code effects.** The Hooks plugin's custom-code effect runs operator-supplied JavaScript. Issues that depend on the behaviour of its current sandbox, such as escaping or abusing the bundled sandbox's built-in helpers, are excluded. The Hooks plugin requires an authenticated account with the relevant per-app hooks permission, and the custom-code effect runs code the operator configured.
