import firebaseAdmin from "firebase-admin";
import https from "https";
import { HttpsProxyAgent } from "https-proxy-agent";
import { ObjectId } from "mongodb";
import { createHash } from "crypto";
import type { PushEvent } from "../../kafka/types.ts";
import type { Content, Message } from "../../models/message.ts";
import type { ProxyConfiguration } from "../../lib/utils.ts";
import type { FCMCredentials, RawFCMCredentials } from "../../models/credentials.ts";
import type { TemplateContext } from "../../lib/template.ts";
import { buildProxyUrl, serializeProxyConfig, flattenObject, removeUPFromUserPropertyKey } from "../../lib/utils.ts";
import { InvalidCredentials, SendError, FCMErrors } from "../../lib/error.ts";
import { PROXY_CONNECTION_TIMEOUT, SEND_TIMEOUT } from "../../constants/configs.ts";

export interface AndroidConfig {}

export interface AndroidMessagePayload {
    data: {
        title?: string; // message title
        message?: string; // message content
        "c.i": string; // message id as string
        "c.m"?: string; // message media url
        "c.l"?: string; // message link url
        "c.b"?: string; // buttons: stringified array of objects in the form of: Array<{ t: string; l: string; }>; (button text and link)
        "c.li"?: string; // message icon
        badge?: string; // badge: stringified badge number
        sound?: string;
        // keeping this here for "custom json data" and "extra user properties"
        [key: string]: any;
        // test: 'custom json data for android', // custom json
        // "c.e.cc": string; // extra user property: country code
        // "c.e.cty": string; // extra user property: city
    };
    android?: {
        ttl?: number; // time to live in milliseconds (fcm sets it to 4 weeks (2419200000 ms) by default)
    };
    // EXAMPLE:
    // data: {
    //     'c.i': '689607f8899e1ae6f88173cc',
    //     'c.m': 'https://www.someurl.com/something.png',
    //     sound: 'default',
    //     badge: 32,
    //     'c.l': 'https://www.someurl.com',
    //     title: 'message title',
    //     message: 'message content',
    //     'c.b': [{ t: 'button text', l: 'https://www.someurl.com' } ],
    //     test: 'custom json data',
    //     'c.e.cc': 'us',
    //     'c.e.cty': 'Böston 墨尔本',
    //     'c.e.src': 'Android',
    //     'c.li': 'test-icon'
    // }
    // android: {
    //   ttl: 2419200000
    // }
}

interface FirebaseError extends Error {
    code: string;
}

const appProxyMap = new WeakMap<firebaseAdmin.app.App, ProxyConfiguration>();

export function isProxyConfigurationUpdated(app: firebaseAdmin.app.App, newProxy?: ProxyConfiguration): boolean {
    const oldSerialized = serializeProxyConfig(appProxyMap.get(app));
    const newSerialized = serializeProxyConfig(newProxy);
    return oldSerialized !== newSerialized;
}

export async function send(pushEvent: PushEvent): Promise<string> {
    const creds = pushEvent.credentials as FCMCredentials;
    const appName = creds.hash;
    let firebaseApp = firebaseAdmin.apps.find(
        app => app ? app.name === appName : false
    );
    // delete the old application if proxy configuration is updated
    if (firebaseApp) {
        if (isProxyConfigurationUpdated(firebaseApp, pushEvent.proxy)) {
            appProxyMap.delete(firebaseApp);
            await firebaseApp.delete();
            firebaseApp = undefined;
        }
    }
    // create the application instance
    if (!firebaseApp) {
        const buffer = Buffer.from(
            creds.serviceAccountFile.replace(/^[^,]+,/, ""),
            "base64"
        );
        const serviceAccountObject = JSON.parse(buffer.toString("utf8"));
        let agent: https.Agent;
        if (pushEvent.proxy) {
            agent = new HttpsProxyAgent(buildProxyUrl(pushEvent.proxy), {
                keepAlive: true,
                timeout: PROXY_CONNECTION_TIMEOUT,
                rejectUnauthorized: pushEvent.proxy.auth,
            });
        }
        else {
            agent = new https.Agent({ keepAlive: true, timeout: SEND_TIMEOUT });
        }
        firebaseApp = firebaseAdmin.initializeApp({
            httpAgent: agent,
            credential: firebaseAdmin.credential.cert(
                serviceAccountObject,
                agent
            ),
        }, appName);
        // save proxy object to track its state
        if (pushEvent.proxy) {
            appProxyMap.set(firebaseApp, pushEvent.proxy);
        }
    }
    try {
        const messageId = await firebaseApp.messaging().send({
            token: pushEvent.token,
            ...pushEvent.payload
        });
        return messageId;
    }
    catch (error) {
        if (error && typeof error === "object" && "code" in error) {
            const err = error as FirebaseError;
            const firebaseError = FCMErrors[err.code];
            if (!firebaseError) {
                throw error;
            }
            const { libraryKey, message: defaultMessage, mapsTo } = firebaseError;
            const combinedMessage = libraryKey + ": " + (
                err.message ? err.message : defaultMessage
            );
            if (mapsTo) {
                throw new mapsTo(combinedMessage);
            }
            else {
                throw new SendError(combinedMessage);
            }
        }
        throw error;
    }
}

export async function validateCredentials(
    unvalidatedCreds: RawFCMCredentials,
    proxyConfig?: ProxyConfiguration
): Promise<{ creds: FCMCredentials; view: FCMCredentials }> {
    const { serviceAccountFile, type } = unvalidatedCreds;
    if (type !== "fcm") {
        throw new InvalidCredentials("Invalid credentials type");
    }
    if (!serviceAccountFile) {
        throw new InvalidCredentials("Service account file is required");
    }
    let mime = serviceAccountFile.indexOf(';base64,') === -1
        ? null
        : serviceAccountFile.substring(
            0,
            serviceAccountFile.indexOf(';base64,')
        );
    if (mime !== "data:application/json") {
        throw new InvalidCredentials("Service account file must be a base64 encoded JSON file");
    }
    const serviceAccountJSON = Buffer.from(
        serviceAccountFile.substring(serviceAccountFile.indexOf(',') + 1),
        'base64'
    ).toString('utf8');
    let serviceAccountObject: any;
    try {
        serviceAccountObject = JSON.parse(serviceAccountJSON);
    }
    catch (error) {
        throw new InvalidCredentials(
            "Service account file is not a valid JSON: "
            + (error instanceof SyntaxError ? error.message : "Unknown error")
        );
    }
    if (typeof serviceAccountObject !== "object"
        || Array.isArray(serviceAccountObject)
        || serviceAccountObject === null
        || !serviceAccountObject.project_id
        || !serviceAccountObject.private_key
        || !serviceAccountObject.client_email) {
        throw new InvalidCredentials("Service account file is not a valid Firebase service account JSON");
    }
    const credentials: FCMCredentials = {
        ...unvalidatedCreds,
        _id: new ObjectId,
        serviceAccountFile,
        hash: createHash("sha256").update(serviceAccountJSON).digest("hex")
    };
    try {
        await send({
            credentials,
            appId: new ObjectId,
            messageId: new ObjectId,
            scheduleId: new ObjectId,
            uid: "1",
            token: Math.random() + '',
            payload: {
                data: {
                    'c.i': Math.random() + '',
                    title: 'test',
                    message: 'test',
                    sound: 'default'
                }
            },
            platform: "a",
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
        const invalidTokenErrorMessage = "INVALID_ARGUMENT: The registration token is not a valid FCM registration token";
        if (error instanceof SendError && error.message === invalidTokenErrorMessage) {
            return {
                creds: credentials,
                view: {
                    ...credentials,
                    serviceAccountFile: "service-account.json"
                }
            };
        }
        throw error;
    }
    throw new InvalidCredentials("Test connection failed for an unknown reason.");
}

export function mapMessageToPayload(messageDoc: Message, content: Content, context: TemplateContext): AndroidMessagePayload {
    const payload: AndroidMessagePayload = {
        data: {
            "c.i": messageDoc._id.toString(),
        }
    };
    if (content.buttons && content.buttons.length) {
        payload.data["c.b"] = JSON.stringify(
            content.buttons.map(button => ({
                t: button.title,
                l: button.url
            }))
        );
    }
    if (content.sound) {
        payload.data.sound = content.sound;
    }
    if (content.badge) {
        payload.data.badge = String(content.badge);
    }
    if (content.title) {
        payload.data.title = content.title;
    }
    if (content.message) {
        payload.data.message = content.message;
    }
    if (content.url) {
        payload.data['c.l'] = content.url;
    }
    if (content.media) {
        payload.data['c.m'] = content.media;
    }
    if (content.data) {
        const data = JSON.parse(content.data);
        Object.assign(payload.data, flattenObject(data));
    }
    if (content.extras && content.extras.length && typeof context === "object") {
        for (const userPropKey of content.extras) {
            const key = removeUPFromUserPropertyKey(userPropKey);
            if (key in context) {
                let value = context[key];
                if (value !== undefined && value !== null) {
                    if (typeof value === "object") {
                        value = JSON.stringify(value);
                    }
                    else if (typeof value !== "string") {
                        value = String(value);
                    }
                    payload.data[`c.e.${key}`] = value;
                }
            }
        }
    }
    if (content.specific && content.specific.length) {
        const largeIconItem = content.specific.find(
            specific => typeof specific.large_icon === "string"
        );
        if (largeIconItem) {
            payload.data["c.li"] = largeIconItem.large_icon as string;
        }
    }
    if (content.expiration) {
        if (!payload.android) {
            payload.android = {};
        }
        payload.android.ttl = content.expiration;
    }
    return payload;
}
