/**
 * @module plugins/hooks/api/ssrf-protection
 * @description SSRF (Server-Side Request Forgery) protection utilities
 * for the Hooks plugin's HTTPEffect.
 *
 * Provides IP blocklist checking, DNS-level validation, and URL safety
 * verification to prevent requests to internal/private network addresses,
 * cloud metadata endpoints, and other dangerous targets.
 *
 * Uses ipaddr.js for robust IP address parsing and range classification,
 * covering all RFC-defined private, reserved, loopback, link-local,
 * multicast, carrier-grade NAT, and documentation ranges for both
 * IPv4 and IPv6 (including IPv4-mapped IPv6 and NAT64).
 *
 *  - URL parse time validation with DNS (isUrlSafe)
 *  - Protocol restriction (only http/https)
 *  - Redirects disabled (followRedirect: false via getSsrfSafeOptions)
 *  - Revalidation after template expansion (when doing request in http effect)
 */

'use strict';

const dns = require('dns');
const net = require('net');
const { URL } = require('url');
const ipaddr = require('ipaddr.js');

/**
 * Allowed URL protocols for outbound requests.
 */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Hostnames known to serve cloud metadata / internal services.
 * Checked as exact match (case-insensitive).
 */
const BLOCKED_HOSTNAMES = new Set([
    'metadata.google.internal',
    'metadata.goog',
    'metadata.google.com',
    'kubernetes.default.svc',
    'kubernetes.default',
    'kubernetes',
]);

/**
 * Check whether an IP address (v4 or v6) is private/reserved/internal.
 *
 * Uses ipaddr.js range() classification. Only 'unicast' addresses are
 * considered safe. All other ranges are blocked:
 *  - unspecified  (0.0.0.0/8, ::)
 *  - loopback     (127.0.0.0/8, ::1)
 *  - private      (10/8, 172.16/12, 192.168/16)
 *  - linkLocal    (169.254/16, fe80::/10)
 *  - multicast    (224/4, ff00::/8)
 *  - broadcast    (255.255.255.255)
 *  - reserved     (192.0.0/24, 192.0.2/24, 192.88.99/24, 198.18/15,
 *                  198.51.100/24, 203.0.113/24, 240/4, 2001:db8::/32)
 *  - carrierGradeNat (100.64/10)
 *  - uniqueLocal  (fc00::/7)
 *  - ipv4Mapped   (::ffff:0:0/96 — unwrapped and re-checked as IPv4)
 *  - rfc6052      (64:ff9b::/96 NAT64)
 *  - discard      (100::/64)
 *
 * @param {string} ip - IP address string
 * @returns {boolean} true if the IP should be blocked
 */
function isBlockedIP(ip) {
    let parsed;
    try {
        parsed = ipaddr.parse(ip);
    }
    catch (e) {
        // Unparseable IP — block to be safe
        return true;
    }

    const range = parsed.range();

    // IPv4-mapped IPv6 (::ffff:x.x.x.x): unwrap and check the inner IPv4
    if (range === 'ipv4Mapped' && parsed.isIPv4MappedAddress()) {
        return parsed.toIPv4Address().range() !== 'unicast';
    }

    return range !== 'unicast';
}

/**
 * Check whether a hostname is a known dangerous internal service.
 *
 * @param {string} hostname - The hostname to check (will be lowercased)
 * @returns {boolean} true if the hostname should be blocked
 */
function isBlockedHostname(hostname) {
    const lower = hostname.toLowerCase();

    // Exact match against known dangerous hosts
    if (BLOCKED_HOSTNAMES.has(lower)) {
        return true;
    }

    // Block "localhost" and variants
    if (lower === 'localhost' || lower.endsWith('.localhost')) {
        return true;
    }

    // Block .internal TLD (used by GCP metadata and internal services)
    if (lower.endsWith('.internal')) {
        return true;
    }

    return false;
}

/**
 * Strip IPv6 brackets from a hostname if present.
 * new URL('http://[::1]/').hostname returns '[::1]' with brackets,
 * but net.isIP() and our IP checkers expect '::1' without brackets.
 *
 * @param {string} hostname - hostname possibly wrapped in brackets
 * @returns {string} hostname with brackets stripped if it was a bracketed IPv6
 */
function stripIPv6Brackets(hostname) {
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
        return hostname.slice(1, -1);
    }
    return hostname;
}

/**
 * Validate a URL string for SSRF safety.
 *
 * @param {string} urlString - The URL to validate
 */
async function isUrlSafe(urlString) {
    // Must be a non-empty string
    if (!urlString || typeof urlString !== 'string') {
        return { safe: false, error: 'URL must be a non-empty string' };
    }

    // Parse the URL
    let parsed;
    try {
        parsed = new URL(urlString);
    }
    catch (e) {
        return { safe: false, error: 'Invalid URL: ' + e.message };
    }

    // Protocol restriction
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
        return { safe: false, error: `Protocol "${parsed.protocol}" is not allowed. Only http and https are permitted.` };
    }

    // Block credentials in URL (user:pass@host)
    if (parsed.username || parsed.password) {
        return { safe: false, error: 'URLs with embedded credentials are not allowed' };
    }

    const hostname = parsed.hostname;

    // Check against blocked hostnames
    if (isBlockedHostname(hostname)) {
        return { safe: false, error: `Hostname "${hostname}" is blocked` };
    }

    // Strip IPv6 brackets for IP checks (URL parser returns [::1], net.isIP expects ::1)
    const bareHostname = stripIPv6Brackets(hostname);

    // If hostname is an IP literal, check it directly
    if (net.isIP(bareHostname)) {
        if (isBlockedIP(bareHostname)) {
            return { safe: false, error: `IP address "${bareHostname}" is in a private/reserved range` };
        }
        // IP is public — OK at parse time
        return { safe: true, error: null };
    }

    // Hostname is a domain name — resolve it to check the IP
    try {
        const address = await new Promise((resolve, reject) => {
            dns.lookup(hostname, (err, addr) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(addr);
                }
            });
        });

        if (isBlockedIP(address)) {
            return { safe: false, error: `Hostname "${hostname}" resolves to private/reserved IP "${address}"` };
        }
    }
    catch (e) {
        return { safe: false, error: `DNS resolution failed for "${hostname}": ${e.message}` };
    }

    return { safe: true, error: null };
}

/**
 * Build got-compatible request options with SSRF protection baked in.
 *
 * Disables redirects to prevent redirect-based SSRF bypasses.
 *
 * @param {object} requestOptions - base request options (uri, timeout, headers, etc.)
 * @returns {object} the same options object with SSRF settings injected
 */
function getSsrfSafeOptions(requestOptions) {
    const options = Object.assign({}, requestOptions);

    // Disable redirects entirely — prevents redirect-based SSRF bypasses
    options.followRedirect = false;

    return options;
}

module.exports = {
    isUrlSafe,
    getSsrfSafeOptions,
};
