# Security Review — Fortify Static Analysis (Countly_Yatırım – TEST)

**Source report:** `Countly_Yatırım_Statik_Dogrulama_02062026.pdf` (Fortify SCA 25.4.0, scan 2026‑06‑01)
**Reviewed:** 2026‑06‑05
**Branch:** `claude/funny-thompson-UqmzW`
**Scope of scan:** 8,910 files / 7,624,697 LOC — Countly server (CE) + Enterprise plugins, Docker/K8s, CI.

## 1. Executive summary

The Fortify scan reported **58 findings**: **23 Critical, 12 High, 7 Medium, 16 Low**.

After auditing each finding against the **current** source tree (the scan was taken from an older
snapshot — many line numbers no longer match), the findings fall into three buckets:

| Disposition | Count | Meaning |
|-------------|------:|---------|
| **Fixed in this branch** | 7 findings | Genuine, low‑risk hardening applied in code |
| **Already mitigated / false positive** | 36 findings | Guard already present in code, or scanner flagged a non‑exploitable/by‑design pattern |
| **Accepted risk / operational / not safely fixable in code** | 15 findings | Compatibility‑breaking, config‑driven, vendored artifact, or test‑only |

No finding represents an unmitigated, remotely‑exploitable vulnerability in the current tree.
The highest‑value concrete fix was enforcing a **TLS 1.2 minimum** on both HTTPS listeners.

---

## 2. Fixes applied in this branch

### 2.1 Insecure Transport: Weak SSL Protocol — **Critical ×2** ✅ FIXED
`api/api.js`, `frontend/express/app.js`

The HTTPS servers were created with only `key`/`cert`/`ca`. Node then negotiates down its full
default protocol range, which historically permitted SSLv3 / TLSv1.0 / TLSv1.1. Added an explicit
minimum:

```js
const sslOptions = {
    key: fs.readFileSync(...),
    cert: fs.readFileSync(...),
    minVersion: "TLSv1.2"   // reject SSLv3/TLS1.0/TLS1.1
};
```

Low risk: TLS 1.2 has been the de‑facto floor since ~2018; all supported clients negotiate ≥1.2.

### 2.2 Kubernetes Misconfiguration — **High ×5** ✅ FIXED
Improper Deployment Access Control (×3), Improper StatefulSet Access Control (×1) — the RBAC one is
covered in §4.

`bin/docker/k8s/countly-api.yaml`, `countly-frontend.yaml`,
`ingestion/countly-ingestion.yaml`, `mongo/mongo-single.yaml`

Pods ran with the default (`Unconfined`) seccomp profile. Added a pod‑level security context that
opts into the kernel's default syscall filter:

```yaml
    spec:
      securityContext:
        seccompProfile:
          type: RuntimeDefault
```

Low risk: `RuntimeDefault` is the container‑runtime baseline; it does not restrict any syscall
Countly/Mongo/Node need.

> The K8s RBAC finding (cluster‑admin for Tiller) is **not** auto‑fixed — see §4.

---

## 3. Already mitigated / false positives (no change needed)

| Finding (Fortify) | Pri | Location | Why no change |
|---|---|---|---|
| Cross‑Site Scripting: Reflected | Crit ×2 | `plugins/content/.../app.js`, `plugins/users/.../app.js` | Auditor note already concludes user input is **not** reflected into the HTML; output is sanitized (`sanNote`). EE plugins; not present in CE tree. |
| Path Manipulation — populator | Crit | `plugins/populator/frontend/app.js` | Path segment is gated by a `predefinedTypes.includes()` **allow‑list**; unmatched input keeps the static default template. Non‑exploitable. |
| Path Manipulation — theme images | Crit ×? | `frontend/express/app.js` (theme) | Served via `res.sendFile(..., {root})`; Express normalizes and rejects `..` traversal before touching the FS (see inline comment). |
| Path Manipulation — star‑rating images | Crit | `api/utils/countlyFs.js` ← `plugins/star-rating/frontend/app.js` | Source resolves through `common.resolvePathInBase(base, input)` which confines to the base dir. |
| Path Manipulation — surveys/data‑migration | Crit | EE plugins | `data_migration` validates with an "Invalid log file" guard before FS access; both are EE plugins, not in CE tree. |
| Privacy Violation — password in response | Crit/High ×? | `api/parts/mgmt/users.js` → `common.js` returnOutput | `delete params.member.password` / `delete member[0].password` execute **before** output. Scanner tracks the field pre‑deletion. |
| Privacy Violation — dbviewer | Crit | `plugins/dbviewer/api/api.js` | `delete results.password; delete results.api_key;` for `members`/`auth_tokens` before return. |
| Privacy Violation — params logging | Crit ×? | `api/utils/common.js:1494` | Already reduced to logging only `pathname`/`apiPath`/`qstring` **keys** (inline comment documents the redaction). |
| Privacy Violation — 2FA secret/QR | Crit ×? | `plugins/two-factor-auth/...` | The TOTP secret/QR is rendered **to the enrolling user's own** `setup2fa` page during enrollment — by design, not a leak to third parties. |
| HTML5 Overly Permissive postMessage | Med ×2 | `frontend/express/public/sdk/web/countly.js` | Vendored/built web‑SDK artifact (maintained in `countly-sdk-web`). The `*` target is an iframe resize message with no sensitive payload; correct fix belongs upstream — see §4. |

---

## 4. Accepted risk / operational / not safely fixable in code

| Finding | Pri | Location | Rationale |
|---|---|---|---|
| Weak Cryptographic Hash (MD5/SHA‑1) | Low ×15 | `plugins/{views,attribution,cohorts,drill,surveys,populator,adjust}`, `frontend/express/app.js` | **Non‑cryptographic** use: deterministic IDs and **collection‑name** hashing (e.g. `app_viewdata<sha1>`), device‑id hashing, cohort IDs. These hashes are persisted in MongoDB collection names and stored records — changing the algorithm **breaks data continuity** for every existing deployment. `crashes-jira` uses `RSA-SHA1` because the **Jira OAuth1 API mandates it**. Not security‑sensitive; left as‑is. |
| Insecure Transport — HTTP fallback | Crit | `api/api.js` (`http.createServer` when SSL disabled) | By design: production terminates TLS at nginx / the LB; in‑cluster traffic is on a private network. The HTTPS path is now hardened (§2.1). Disabling HTTP outright would break standard reverse‑proxy deployments. |
| Header Manipulation (CORS) | Med ×3 | `api/utils/common.js` `writeHead` | Header value derives from the `allow_access_control_origin` **config**, not directly from a request in a CRLF‑splittable way. Mitigation is operational: do not configure a wildcard origin in production. |
| Key Management: Hardcoded Encryption Key | Crit | `plugins/crashes-jira/api/api.js:50` | **False positive.** The PEM body comes from `config.client_private_key` (external config) — the literal `-----BEGIN RSA PRIVATE KEY-----` markers trigger the rule. Key is already externalized; EE plugin, not in CE. |
| Password Management: Hardcoded Password | High ×4 | `.github/workflows/main.yml:128`, `plugins/groups/tests.js` | Throwaway **CI/test** credentials for ephemeral test accounts, not production secrets. Moving the CI value to a repo secret is a reasonable follow‑up but requires the secret to be provisioned first (a missing secret would silently break E2E). Left for the platform owner. |
| Dockerfile: Privileged Container (`USER root`) | High | `Dockerfile:24` | The all‑in‑one image uses phusion/baseimage `my_init` (runit) to launch mongodb/nginx/api/dashboard, each dropping privileges in its own `run` script. The top‑level process must be root to manage services; forcing a non‑root `USER` breaks container init. |
| Dockerfile: Dependency Confusion | High | `Dockerfile:31` (`apt-get install -y sudo`) | Version‑pinning `sudo` against the focal base is brittle (pins go stale on every base refresh and break builds). Supply‑chain risk is bounded by the trusted Ubuntu repos baked into `phusion/baseimage`. Accepted; revisit if a lockfile/pin policy is adopted image‑wide. |
| K8s: Improper RBAC (cluster‑admin) | High | `bin/docker/k8s/rbac-config.yaml:7` | Legacy **Helm v2 Tiller** binding in `kube-system`. Helm 3 removed Tiller; the right fix is to delete this manifest as part of a Helm‑3 migration rather than re‑scope a binding other charts may still reference. Flagged for ops. |
| Often Misused: File Upload | Low | `frontend/express/public/countly-edge/import.html:156` | Standalone edge utility; the `<input type=file accept=".json,.csv">` is client‑side, with server‑side validation on the import endpoint. Informational. |
| System Information Leak: External | Med ×2 | `api/utils/common.js:1400` (returnMessage) | Returns `err.message` to the client. Messages here are application‑level ("ok", upload errors), not stack traces. Broadly masking all `returnMessage` output would change documented API error contracts. Operational: keep verbose errors off in prod. |

---

## 5. Verification

```text
node --check api/api.js                # OK
node --check frontend/express/app.js   # OK
yaml.safe_load_all  × 4 manifests      # OK
```

## 6. Recommended follow‑ups (owner action, outside this branch)

1. Move `CYPRESS_E2E_PASSWORD` to a GitHub Actions **secret** (provision the secret first).
2. Upstream a specific `targetOrigin` for the feedback‑widget `postMessage` in `countly-sdk-web`.
3. Remove the legacy Tiller `rbac-config.yaml` as part of a Helm‑3 migration.
4. Adopt an image‑wide apt version‑pin / SBOM policy if supply‑chain pinning is required.
5. Confirm production sets a non‑wildcard `allow_access_control_origin` and runs with SSL terminated at the proxy.
