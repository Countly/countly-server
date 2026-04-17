import https from "https";
import { ObjectId } from "mongodb";
import { URLSearchParams } from "url";
import { HttpsProxyAgent } from "https-proxy-agent";
import { createHash } from "crypto";
import type { PushEvent } from "../../kafka/types.ts";
import type { Content, Message } from "../../models/message.ts";
import type { HMSCredentials, RawHMSCredentials } from "../../models/credentials.ts";
import type { ProxyConfiguration } from "../../lib/utils.ts";
import type { TemplateContext } from "../../lib/template.ts";
import { buildProxyUrl } from "../../lib/utils.ts";
import { mapMessageToPayload as mapMessageToAndroidPayload } from "./android.ts";
import { InvalidCredentials, SendError, InvalidResponse, InvalidDeviceToken, HMSErrors } from "../../lib/error.ts";
import { PROXY_CONNECTION_TIMEOUT } from "../../constants/configs.ts";

export interface HuaweiConfig {}

export interface HuaweiMessagePayload {
    message: {
        data: string; // JSON stringified data. should be in the form of: AndroidMessagePayload.data
        android: {};
        token?: string[]; // Huawei device token. being included in huawei push sender.
    }
    // EXAMPLE:
    // message: {
    //   data: '{"c.i":"689607f8899e1ae6f88173cc","c.m":"https://www.someurl.com/something.png","title":"message title","message":"message content","c.b":[{"t":"message text"}]}',
    //   android: {}
    // }
}

interface TokenCache {
    token?: string;
    expiryDate?: number;
    promise?: Promise<string>;
}

const TOKEN_CACHE: { [credentialHash: string]: TokenCache } = {};

export async function getAuthToken(credentials: HMSCredentials, proxy?: ProxyConfiguration): Promise<string> {
    if (credentials.hash in TOKEN_CACHE) {
        const cache = TOKEN_CACHE[credentials.hash];
        if (cache.token) {
            if (cache.expiryDate && cache.expiryDate > Date.now()) {
                return cache.token;
            }
        }
        else if (cache.promise) {
            return cache.promise;
        }
    }

    TOKEN_CACHE[credentials.hash] = {};

    const requestBody = (new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.app,
        client_secret: credentials.secret
    })).toString();

    let agent: HttpsProxyAgent<string> | undefined;
    if (proxy) {
        agent = new HttpsProxyAgent(buildProxyUrl(proxy), {
            keepAlive: true,
            timeout: PROXY_CONNECTION_TIMEOUT,
            rejectUnauthorized: proxy.auth,
        });
    }

    const promise = new Promise<string>((resolve, reject) => {
        let request = https.request({
            agent,
            hostname: 'oauth-login.cloud.huawei.com',
            path: '/oauth2/v3/token',
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': requestBody.length
            }
        }, response => {
            let data = '';
            response.on('data', (chunk: string) => data = data + chunk);
            response.on('end', () => {
                const raw = Object.entries(response.headers)
                    .map(([key, value]) => key + ": " + value)
                    .join("\n")
                    + "\n\n" + data;

                let parsed: any;
                try {
                    parsed = JSON.parse(data);
                }
                catch (error) {
                    return reject(new InvalidResponse(
                        "Auth: response is not a valid json",
                        raw
                    ));
                }

                if (response.statusCode === 200 && parsed?.access_token) {
                    const expiryDate = parsed.expires_in
                        ? Date.now() + Number(parsed.expires_in) * 1000 - 5 * 60 * 1000
                        : Date.now() + 30 * 60 * 1000;
                    TOKEN_CACHE[credentials.hash].token = parsed.access_token;
                    TOKEN_CACHE[credentials.hash].expiryDate = expiryDate;
                    return resolve(parsed.access_token);
                }

                if (parsed?.error_description) {
                    return reject(new SendError(
                        "Auth: " + parsed.error_description, raw
                    ));
                }

                return reject(new InvalidResponse("HMS auth: invalid response", raw));
            });
        });

        request.on('error', err => reject(err));
        request.end(requestBody);
    });

    TOKEN_CACHE[credentials.hash].promise = promise;
    return promise;
}

export async function send(pushEvent: PushEvent): Promise<string> {
    const credentials = pushEvent.credentials as HMSCredentials;
    const authToken = await getAuthToken(credentials, pushEvent.proxy);

    let agent: HttpsProxyAgent<string> | undefined;
    if (pushEvent.proxy) {
        agent = new HttpsProxyAgent(buildProxyUrl(pushEvent.proxy), {
            keepAlive: true,
            timeout: PROXY_CONNECTION_TIMEOUT,
            rejectUnauthorized: pushEvent.proxy.auth,
        });
    }
    const huaweiContent = pushEvent.payload as HuaweiMessagePayload;
    huaweiContent.message.token = [pushEvent.token];
    const payload = JSON.stringify(huaweiContent);
    delete huaweiContent.message.token;

    return new Promise<string>((resolve, reject) => {
        const request = https.request({
            agent: agent,
            hostname: 'push-api.cloud.huawei.com',
            path: '/v1/' + credentials.app + '/messages:send',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': "Bearer " + authToken,
                "Content-Length": payload.length
            },
        }, (response) => {
            let data = "";
            response.on("data", (chunk: string) => data += chunk);
            response.on("end", () => {
                const raw = Object.entries(response.headers)
                    .map(([key, value]) => key + ": " + value)
                    .join("\n")
                    + "\n\n" + data;

                let parsed: any;
                try {
                    parsed = JSON.parse(data);
                }
                catch (error) {
                    return reject(new InvalidResponse(
                        "HMS response body couldn't be parsed",
                        raw
                    ));
                }

                if (response.statusCode === 200
                    && parsed?.code === "80000000") {
                    return resolve(raw);
                }

                if (parsed?.code && parsed.code in HMSErrors) {
                    const { message, mapsTo } = HMSErrors[parsed.code];
                    const combined = parsed.code + ": " + message;
                    if (mapsTo) {
                        return reject(new mapsTo(combined, raw));
                    }
                    return reject(new SendError(combined, raw));
                }

                return reject(new InvalidResponse("Invalid response", raw));
            });
        });
        request.on("error", reject);
        request.end(payload);
    });
}

export async function validateCredentials(
    unvalidatedCreds: RawHMSCredentials,
    proxyConfig?: ProxyConfiguration
): Promise<{ creds: HMSCredentials; view: HMSCredentials }> {
    if (unvalidatedCreds.type !== "hms") {
        throw new InvalidCredentials("Invalid credentials type");
    }
    const requiredFields: Array<keyof RawHMSCredentials> = ["app", "secret"];
    for (const field of requiredFields) {
        if (!unvalidatedCreds[field] || typeof unvalidatedCreds[field] !== "string") {
            throw new InvalidCredentials(
                `Invalid HMSCredentials: ${field} is required and must be a string`
            );
        }
    }
    if (unvalidatedCreds.app.length < 6 || unvalidatedCreds.app.length > 32) {
        throw new InvalidCredentials(
            "Invalid HMSCredentials: app length must be between 6 and 32 characters"
        );
    }
    if (unvalidatedCreds.secret.length !== 64) {
        throw new InvalidCredentials(
            "Invalid HMSCredentials: secret length must be 64 characters"
        );
    }
    const creds: HMSCredentials = {
        ...unvalidatedCreds,
        _id: new ObjectId(),
        hash: createHash("sha256").update(JSON.stringify(unvalidatedCreds))
            .digest("hex")
    };
    const view: HMSCredentials = {
        ...creds,
        secret: `HPK secret "${creds.secret.slice(0, 10)}...${creds.secret.slice(-10)}"`,
    };
    try {
        await send({
            credentials: creds,
            appId: new ObjectId,
            messageId: new ObjectId,
            scheduleId: new ObjectId,
            uid: "1",
            token: Math.random() + '',
            payload: {
                message: {
                    data: '{"c.i":"' + Math.random() + '","title":"test","message":"test"}',
                    android: {}
                }
            },
            platform: "h",
            env: "p",
            language: "en",
            platformConfiguration: {},
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
            return { creds, view };
        }
        throw error;
    }
    throw new InvalidCredentials("Test connection failed for an unknown reason.");
}

export function mapMessageToPayload(messageDoc: Message, content: Content, context: TemplateContext): HuaweiMessagePayload {
    const androidPayload = mapMessageToAndroidPayload(messageDoc, content, context);
    const payload: HuaweiMessagePayload = {
        message: {
            data: JSON.stringify(androidPayload.data),
            android: {},
        }
    };
    return payload;
}
