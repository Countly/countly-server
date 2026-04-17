import jwt from "jsonwebtoken";
import http2Wrapper from "http2-wrapper";
import nodeForge from "node-forge";
import { URL } from "url";
import { ObjectId } from "mongodb";
import { createHash } from "crypto";
import type { OutgoingHttpHeaders } from "http2";
import type { PushEvent } from "../../kafka/types.ts";
import type { Content, Message } from "../../models/message.ts";
import type { APNCredentials, APNP12Credentials, APNP8Credentials, RawAPNCredentials, RawAPNP8Credentials, TLSKeyPair } from "../../models/credentials.ts";
import type { ProxyConfiguration } from "../../lib/utils.ts";
import type { TemplateContext } from "../../lib/template.ts";
import { serializeProxyConfig, removeUPFromUserPropertyKey } from "../../lib/utils.ts";
import { InvalidCredentials, SendError, InvalidResponse, APNSErrors, InvalidDeviceToken } from "../../lib/error.ts";
import { PROXY_CONNECTION_TIMEOUT } from "../../constants/configs.ts";

export interface IOSConfig {
    setContentAvailable: boolean;
}

export interface IOSMessagePayload {
    aps: {
        "mutable-content"?: number; // gets set to 1 if the message has media or buttons
        sound?: string; // sound file name, default is 'default'
        badge?: number; // badge number
        alert?: {
            title?: string; // message title
            body?: string; // message content
            subtitle?: string; // message subtitle
        };
        "content-available"?: number; // set to 1 for silent push
    },
    c: {
        i: string; // message id as string
        a?: string; // message media url
        l?: string; // message link url
        b?: Array<{ // buttons
            t: string; // button text
            l: string; // button link
        }>;
        e?: { // extra user properties like: country code, city, source, etc.
            [key: string]: any;
            // av: "0:0" // extra user property: app version
        };
    },
    [key: string]: any; // custom json data
    // NORMAL MESSAGE EXAMPLE:
    // aps: {
    //     'mutable-content': 1,
    //     sound: 'default',
    //     badge: 12,
    //     alert: {
    //         title: 'message title',
    //         body: 'message content',
    //         subtitle: 'message subtitle'
    //     },
    //     'content-available': 1
    // },
    // c: {
    //     i: '689607f8899e1ae6f88173cc',
    //     a: 'https://someurl.com/something.png',
    //     l: 'https://someurl.com/',
    //     b: [{ t: 'button text', l: 'https://www.someurl.com' }],
    //     e: { av: '0:0' }
    // },
    // test: 'custom json data'
    //
    // SILENT MESSAGE EXAMPLE:
    // aps: { badge: 32, 'content-available': 1 },
    // c: {
    //   i: '689624ae899e1ae6f88173d7',
    //   e: { did: '426BCD17-3820-4D69-A8FC-F2C491817A74' }
    // },
    // test: 'custom json data'
}

interface JWTCache {
    token: string;
    createdAt: number;
}

interface ProxyCache {
    agent: any;
    lastUsedAt: number;
}

interface TLSKeyPairCache {
    keyPair: TLSKeyPair;
    lastUsedAt: number;
}

type P12CertificateContents = Omit<APNP12Credentials, "type" | "_id" | "cert" | "secret" | "hash"> & TLSKeyPair;

const PROXY_CACHE: { [serializedProxyConfig: string]: ProxyCache } = {};
const TOKEN_CACHE: { [credentialHash: string]: JWTCache } = {};
const TOKEN_TTL = 20 * 60 * 1000; // 20 mins
const TLS_KEY_PAIR_CACHE: { [hash: string]: TLSKeyPairCache } = {};

export function getAuthToken(credentials: APNCredentials): string | undefined {
    if (credentials.type !== "apn_token") {
        return;
    }
    const cache = TOKEN_CACHE[credentials.hash];
    if (cache && cache.createdAt + TOKEN_TTL > Date.now()) {
        return cache.token;
    }
    const token = jwt.sign(
        { iss: credentials.team, iat: Math.floor(Date.now() / 1000) },
        Buffer.from(credentials.key, "base64").toString(),
        { algorithm: "ES256", header: { alg: "ES256", kid: credentials.keyid } }
    );
    TOKEN_CACHE[credentials.hash] = { token, createdAt: Date.now() };
    return token;
}

export function getProxyAgent(config?: ProxyConfiguration): any {
    if (!config) {
        return;
    }
    const serializedProxyConfig = serializeProxyConfig(config);
    if (serializedProxyConfig in PROXY_CACHE) {
        PROXY_CACHE[serializedProxyConfig].lastUsedAt = Date.now();
        return PROXY_CACHE[serializedProxyConfig].agent;
    }
    const proxyOptions: any = {
        url: "http://" + config.host + ":" + config.port,
        headers: { connection: "keep-alive" }
    };
    if (config.user || config.pass) {
        const basicAuth = Buffer.from(config.user + ':' + config.pass)
            .toString('base64');
        if (proxyOptions.headers) {
            proxyOptions.headers["Proxy-Authorization"] = "Basic " + basicAuth;
        }
    }
    const agent = new (http2Wrapper as any).proxies.Http2OverHttp({
        timeout: PROXY_CONNECTION_TIMEOUT,
        proxyOptions
    });
    PROXY_CACHE[serializedProxyConfig] = {
        lastUsedAt: Date.now(),
        agent
    };
    return agent;
}

export function getTlsKeyPair(credentials: APNP12Credentials): TLSKeyPair {
    const cache = TLS_KEY_PAIR_CACHE[credentials.hash];
    if (cache) {
        cache.lastUsedAt = Date.now();
        return cache.keyPair;
    }
    const { cert, key } = parseP12Certificate(
        credentials.cert, credentials.secret
    );
    const keyPair: TLSKeyPair = { cert, key };
    TLS_KEY_PAIR_CACHE[credentials.hash] = { keyPair, lastUsedAt: Date.now() };
    return keyPair;
}

export function parseP12Certificate(certificate: string, secret?: string): P12CertificateContents {
    const result: Partial<P12CertificateContents> & { topics: string[] } = {
        cert: undefined,
        key: undefined,
        notBefore: undefined,
        notAfter: undefined,
        bundle: undefined,
        topics: [],
    };
    const buffer = nodeForge.util.decode64(certificate);
    const asn1 = nodeForge.asn1.fromDer(buffer);
    const p12 = nodeForge.pkcs12.pkcs12FromAsn1(asn1, false, secret);
    const cert = p12.getBags({
        bagType: nodeForge.pki.oids.certBag
    })?.[nodeForge.pki.oids.certBag]?.[0];
    const pk = p12.getBags({
        bagType: nodeForge.pki.oids.pkcs8ShroudedKeyBag
    })?.[nodeForge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    if (!cert || !pk || !cert.cert || !pk.key) {
        throw new InvalidCredentials('Failed to get TLS key pairs from credentials');
    }
    result.cert = nodeForge.pki.certificateToPem(cert.cert);
    result.key = nodeForge.pki.privateKeyToPem(pk.key);
    p12.safeContents.forEach(safeContents => {
        safeContents.safeBags.forEach(safeBag => {
            if (safeBag.cert) {
                if (safeBag.cert.validity) {
                    if (safeBag.cert.validity.notBefore) {
                        result.notBefore = safeBag.cert.validity.notBefore;
                    }
                    if (safeBag.cert.validity.notAfter) {
                        result.notAfter = safeBag.cert.validity.notAfter;
                    }
                }
                var tpks = safeBag.cert.getExtension({
                    id: '1.2.840.113635.100.6.3.6'
                } as any);
                if (tpks && (tpks as any).value) {
                    let strValue = ((tpks as any).value as string)
                        .replace(/0[\x00-\x1f\(\)!]/gi, '');
                    strValue = strValue.replace('\f\f', '\f');
                    let value = strValue.split('\f')
                        .map(s => s.replace(/[^A-Za-z\-\.]/gi, '').trim());
                    value = value.map(
                        s => s.replace(/^[^A-Za-z\.]/, "").trim()
                    );
                    value.shift();
                    for (var i = 0; i < value.length; i++) {
                        for (var j = 0; j < value.length; j++) {
                            if (i !== j && value[j].indexOf(value[i]) === 0) {
                                if (result.topics.indexOf(value[i]) === -1
                                    && value[i]
                                    && value[i].indexOf('.') !== -1
                                    && value[i].indexOf(".") !== 0
                                ) {
                                    result.topics.push(value[i]);
                                }
                                if (result.topics.indexOf(value[j]) === -1
                                    && value[j]
                                    && value[j].indexOf('.') !== -1
                                    && value[j].indexOf(".") !== 0
                                ) {
                                    result.topics.push(value[j]);
                                }
                            }
                        }
                    }
                }
            }
        });
    });
    if (result.topics.length === 0) {
        throw new InvalidCredentials('Not a universal (Sandbox & Production) certificate');
    }
    if (!result.notBefore || !result.notAfter) {
        throw new InvalidCredentials('No validity dates in the certificate');
    }
    result.topics.sort((a, b) => a.length - b.length);
    result.bundle = result.topics[0];
    return result as P12CertificateContents;
}

export async function send(pushEvent: PushEvent): Promise<string> {
    const hostname = pushEvent.env === "d"
        ? "api.development.push.apple.com"
        : "api.push.apple.com";
    const url = new URL("https://" + hostname + ":2197");
    const credentials = pushEvent.credentials as APNCredentials;
    const headers: OutgoingHttpHeaders = {
        ":method": "POST",
        ":path": "/3/device/" + pushEvent.token,
        ":scheme": url.protocol.replace(/:$/, ""),
        ":authority": url.host,
        "apns-topic": credentials.bundle,
    };
    const options: any = {
        headers,
        agent: getProxyAgent(pushEvent.proxy)
    };
    if (credentials.type === "apn_token") {
        headers.authorization = "Bearer " + getAuthToken(credentials);
    }
    else if (credentials.type === "apn_universal") {
        const keyPair = getTlsKeyPair(credentials);
        options.key = keyPair.key;
        options.cert = keyPair.cert;
    }
    const platformConfig = pushEvent.platformConfiguration as IOSConfig;
    if (platformConfig.setContentAvailable) {
        headers["apns-priority"] = 5;
    }

    const request = (http2Wrapper as any).request(url, options);

    return new Promise<string>((resolve, reject) => {
        request.on("error", reject);
        request.on("response", (response: any) => {
            let data = "";
            response.on("data", (chunk: string) => data += chunk);
            response.on("end", () => {
                const raw = Object.entries(response.headers as Record<string, string>)
                    .map(([key, value]) => key + ": " + value)
                    .join("\n")
                    + "\n\n" + data;
                const status = response.statusCode;

                if (status === 200) {
                    return resolve(raw);
                }

                if (!status) {
                    return reject(new InvalidResponse(
                        "APNs response doesn't have a valid status code",
                        raw
                    ));
                }
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.reason && parsed.reason in APNSErrors) {
                        const { message, mapsTo } = APNSErrors[parsed.reason];
                        const combined = parsed.reason + ": " + message;
                        if (mapsTo) {
                            return reject(new mapsTo(combined, raw));
                        }
                        return reject(new SendError(combined, raw));
                    }
                }
                catch (error) {
                    return reject(new InvalidResponse(
                        "APNs response body couldn't be parsed",
                        raw
                    ));
                }
                return reject(
                    new InvalidResponse("Invalid response", raw)
                );
            });
        });
        request.end(JSON.stringify(pushEvent.payload));
    });
}

export async function validateCredentials(
    unvalidatedCreds: RawAPNCredentials,
    proxyConfig?: ProxyConfiguration
): Promise<{ creds: APNCredentials; view: APNCredentials }> {
    if (unvalidatedCreds.type === "apn_universal") {
        if (typeof unvalidatedCreds.cert !== "string" || !unvalidatedCreds.cert) {
            throw new InvalidCredentials(
                "Invalid APNP12Credentials: cert is " +
                "required and must be a string"
            );
        }
        if (unvalidatedCreds.cert.indexOf(';base64,') === -1) {
            throw new InvalidCredentials(
                "Invalid APNP12Credentials: certificate must "
                + "be a base64 encoded P12 file"
            );
        }
        const mime = unvalidatedCreds.cert.substring(
            0,
            unvalidatedCreds.cert.indexOf(';base64,')
        );
        const allowedMimes = [
            "data:application/x-pkcs12",
            "data:application/pkcs12",
            "data:application/octet-stream"
        ];
        if (
            !allowedMimes.includes(mime)
            || (mime === 'data:application/octet-stream'
                && unvalidatedCreds.fileType !== 'p12')
        ) {
            throw new InvalidCredentials(
                "Invalid APNP12Credentials: certificate must "
                + "be a base64 encoded P12 file"
            );
        }
        const cleanedCert = unvalidatedCreds.cert.substring(
            unvalidatedCreds.cert.indexOf(',') + 1
        );
        const {/* eslint-disable no-unused-vars */key, cert, ...content } = parseP12Certificate(
            cleanedCert,
            unvalidatedCreds.secret
        );
        if (content.notBefore.getTime() > Date.now()) {
            throw new InvalidCredentials('Certificate is not valid yet');
        }
        if (content.notAfter.getTime() < Date.now()) {
            throw new InvalidCredentials('Certificate is expired');
        }
        const _creds = { ...unvalidatedCreds, ...content, cert: cleanedCert };
        const creds: APNP12Credentials = {
            ..._creds,
            _id: new ObjectId,
            hash: createHash("sha256").update(JSON.stringify(_creds))
                .digest("hex")
        };
        const view = {
            ...creds,
            cert: "APN Sandbox & Production Certificate (P12)"
        };
        await credentialTest(creds, proxyConfig);
        return { creds, view };
    }
    else { // creds.type === "apn_token"
        const requiredFields: Array<keyof RawAPNP8Credentials> = ["key", "keyid", "bundle", "team"];
        for (const field of requiredFields) {
            if (!unvalidatedCreds[field] || typeof unvalidatedCreds[field] !== "string") {
                throw new InvalidCredentials(
                    `Invalid APNP8Credentials: ${field} is required`
                );
            }
        }
        if (unvalidatedCreds.key.indexOf(';base64,') === -1) {
            throw new InvalidCredentials(
                "Invalid APNP8Credentials: key must be a base64 encoded P8 file"
            );
        }
        let mime = unvalidatedCreds.key.substring(
            0,
            unvalidatedCreds.key.indexOf(';base64,')
        );
        const allowedMimes = [
            "data:application/x-pkcs8",
            "data:application/pkcs8",
            "data:application/octet-stream"
        ];
        if (
            !allowedMimes.includes(mime)
            || (mime === "data:application/octet-stream"
                && unvalidatedCreds.fileType !== "p8")
        ) {
            throw new InvalidCredentials(
                "Invalid APNP8Credentials: key must " +
                "be a base64 encoded P8 file"
            );
        }
        unvalidatedCreds.key = unvalidatedCreds.key.substring(
            unvalidatedCreds.key.indexOf(',') + 1
        );
        const _creds = { ...unvalidatedCreds };
        const creds: APNP8Credentials = {
            ..._creds,
            _id: new ObjectId,
            hash: createHash("sha256").update(JSON.stringify(_creds))
                .digest("hex")
        };
        const view = { ...creds, key: 'APN Key File (P8)' };
        await credentialTest(creds, proxyConfig);
        return { creds, view };
    }
}

export async function credentialTest(creds: APNCredentials, proxyConfig?: ProxyConfiguration): Promise<boolean> {
    try {
        await send({
            credentials: creds,
            appId: new ObjectId,
            messageId: new ObjectId,
            scheduleId: new ObjectId,
            uid: "1",
            token: Math.random() + '',
            payload: {
                aps: {
                    sound: 'default',
                    alert: {
                        title: 'test',
                        body: 'test'
                    }
                },
                c: { i: Math.random() + '' }
            },
            platform: "i",
            env: "p",
            language: "en",
            platformConfiguration: {
                setContentAvailable: false
            },
            trigger: {
                kind: "plain",
                start: new Date(),
            },
            appTimezone: "NA",
            proxy: proxyConfig,
        });
    }
    catch (error) {
        if (error instanceof InvalidDeviceToken) {
            return true;
        }
        throw error;
    }
    throw new InvalidCredentials("Test connection failed for an unknown reason.");
}

export function mapMessageToPayload(messageDoc: Message, content: Content, context: TemplateContext): IOSMessagePayload {
    const payload: IOSMessagePayload = {
        aps: {},
        c: { i: messageDoc._id.toString() }
    };
    if (content.buttons && content.buttons.length) {
        payload.c.b = content.buttons.map((b) => ({ t: b.title, l: b.url }));
        payload.aps["mutable-content"] = 1;
    }
    if (content.sound) {
        payload.aps.sound = content.sound;
    }
    if (content.badge) {
        payload.aps.badge = content.badge;
    }
    if (content.title || content.message) {
        payload.aps.alert = {};
        if (content.title) {
            payload.aps.alert.title = content.title;
        }
        if (content.message) {
            payload.aps.alert.body = content.message;
        }
    }
    if (content.url) {
        payload.c.l = content.url;
    }
    if (content.media) {
        payload.c.a = content.media;
        payload.aps["mutable-content"] = 1;
    }
    if (content.data) {
        const data = JSON.parse(content.data);
        Object.assign(payload, data);
    }
    if (
        content.extras
        && content.extras.length
        && typeof context === "object"
    ) {
        for (const userPropKey of content.extras) {
            const key = removeUPFromUserPropertyKey(userPropKey);
            if (key in context) {
                let value = context[key];
                if (value !== undefined && value !== null) {
                    if (!payload.c.e) {
                        payload.c.e = {};
                    }
                    payload.c.e[key] = value;
                }
            }
        }
    }
    if (content.specific && content.specific.length) {
        const platformSpecifics = content.specific
            .reduce((acc, item) => ({ ...acc, ...item }), {} as { [key: string]: string | number | boolean });
        if (platformSpecifics.subtitle) {
            payload.aps.alert = payload.aps.alert || {};
            payload.aps.alert.subtitle = platformSpecifics.subtitle as string;
        }
        if (platformSpecifics.setContentAvailable) {
            payload.aps["content-available"] = 1;
        }
    }
    return payload;
}
