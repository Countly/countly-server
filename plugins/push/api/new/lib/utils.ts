import { URL } from "url";
import type { Db } from "mongodb";
import type { PlatformKey, PlatformEnvKey } from "../types/message.ts";
import type { ResultEvent } from "../types/queue.ts";
import PLATFORM_KEYMAP from "../constants/platform-keymap.ts";
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);

const common: any = require('../../../../../api/utils/common');
const { processEvents: processInternalEvents } = require('../../../../../api/parts/data/events');
const { updateDataPoints } = require('../../../../server-stats/api/parts/stats');

export interface DrillAPI {
    fetchUsers(params: any, cb: (err: Error, uids: string[]) => void, db: Db): void;
}

export interface PluginConfiguration {
    messageTimeout?: number;
    messageResultsTTL?: number;
    proxy?: ProxyConfiguration;
}

export interface ProxyConfiguration {
    host: string;
    port: string;
    pass?: string;
    user?: string;
    auth: boolean;
}

export interface PushPluginConfig {
    message_timeout?: number; // should be 3600000 by default. timeout for a message not sent yet (for TooLateToSend errors)
    message_results_ttl?: number; // should be 7776000000 (90 days) by default. how long to keep message results
    proxyhost?: string;
    proxyport?: string;
    proxyuser?: string;
    proxypass?: string;
    proxyunauthorized?: boolean;
}

type PlainObject = { [key: string]: any };

export async function loadPluginConfiguration(): Promise<PluginConfiguration> {
    const pushConfig = common.plugins.getConfig("push") as PushPluginConfig;
    const config: PluginConfiguration = {
        messageResultsTTL: pushConfig.message_results_ttl,
        messageTimeout: pushConfig.message_timeout
    };
    if (pushConfig.proxyhost && pushConfig.proxyport) {
        config.proxy = {
            host: pushConfig.proxyhost,
            port: pushConfig.proxyport,
            auth: !(pushConfig.proxyunauthorized || false),
            user: pushConfig.proxyuser,
            pass: pushConfig.proxypass
        };
    }
    return config;
}

export function buildProxyUrl(config: ProxyConfiguration): URL {
    const proxyUrl = new URL("http://google.com");
    proxyUrl.host = config.host;
    proxyUrl.port = config.port;
    if (config.user) {
        proxyUrl.username = config.user;
    }
    if (config.pass) {
        proxyUrl.password = config.pass;
    }
    return proxyUrl;
}

export function serializeProxyConfig(config?: ProxyConfiguration): string {
    const KEY_ORDER: Array<keyof ProxyConfiguration> = ["auth", "host", "pass", "port", "user"];
    return config
        ? KEY_ORDER.map(key => config[key]).join("-")
        : "undefined";
}

export function loadDrillAPI(): DrillAPI | undefined {
    if (typeof (global as any).it === "function") {
        try {
            return require("../../../../drill/api/api").drill;
        }
        catch (err) {
            return;
        }
    }
    else {
        const pluginManager = require("../../../../pluginManager");
        const plugins = pluginManager.getPluginsApis();
        return plugins.drill.drill;
    }
}

export function sanitizeMongoPath(path: string): string {
    return path.replace(/\./g, '\uff0e')
        .replace(/\$/g, '\uff04')
        .replace(/\\/g, '\uff3c');
}

export function updateInternalsWithResults(results: ResultEvent[], log: any): void {
    const messageIndexedEvents: { [messageId: string]: ResultEvent[] } = {};
    for (let i = 0; i < results.length; i++) {
        const mid = results[i].messageId.toString();
        if (!(mid in messageIndexedEvents)) {
            messageIndexedEvents[mid] = [];
        }
        messageIndexedEvents[mid].push(results[i]);
    }
    for (let mid in messageIndexedEvents) {
        const events = messageIndexedEvents[mid];
        const trigger = events[0].trigger;
        const isAutoTrigger = ["cohort", "event"].includes(trigger.kind);
        const isApiTrigger = trigger.kind === "api";
        const params = {
            qstring: {
                events: [
                    {
                        key: "[CLY]_push_sent",
                        count: events.length,
                        segmentation: {
                            i: mid,
                            a: isAutoTrigger,
                            t: isApiTrigger,
                            p: events[0].platform,
                            ap: String(isAutoTrigger) + events[0].platform,
                            tp: String(isApiTrigger) + events[0].platform,
                        }
                    }
                ]
            },
            app_id: events[0].appId,
            appTimezone: events[0].appTimezone,
            time: common.initTimeObj(events[0].appTimezone),
        };
        log.d('Recording %d [CLY]_push_sent\'s: %j', events.length, params);
        processInternalEvents(params).catch(
            (err: Error) => {
                log.e('Error while recording %d [CLY]_push_sent\'s: %j', events.length, params, err);
            }
        ).then(() => log.d('Recorded %d [CLY]_push_sent\'s: %j', events.length, params));
        updateDataPoints(common.writeBatcher, events[0].appId.toString(), 0, {"p": events.length});
    }
}

export function flattenObject(ob: PlainObject): PlainObject {
    var toReturn: { [key: string]: any } = {};
    for (var i in ob) {
        if (!Object.prototype.hasOwnProperty.call(ob, i)) {
            continue;
        }
        if ((typeof ob[i]) === 'object' && ob[i] !== null) {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!Object.prototype.hasOwnProperty.call(flatObject, x)) {
                    continue;
                }
                toReturn[i + '.' + x] = flatObject[x];
            }
        }
        else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
}

export function removeUPFromUserPropertyKey(key: string): string {
    return key.replace(/^up\./, "");
}

export function guessThePlatformFromUserAgentHeader(userAgent: string): PlatformKey | undefined {
    if (userAgent.includes('Android') && userAgent.includes('Huawei')) {
        return "h";
    }
    if (userAgent.includes("Android")) {
        return "a";
    }
    if (userAgent.includes("iOS")) {
        return "i";
    }
}

export function extractTokenFromQuerystring(qstring: PlainObject): [PlatformKey, PlatformEnvKey, string, string] | undefined {
    if (qstring.android_token !== undefined && (!qstring.token_provider || qstring.token_provider === 'FCM')) {
        const token = qstring.android_token === 'BLACKLISTED' ? '' : qstring.android_token;
        return [
            "a",
            "p",
            token,
            common.md5Hash(JSON.stringify(token))
        ];
    }
    else if (qstring.ios_token !== undefined && qstring.test_mode in PLATFORM_KEYMAP.i.environmentMap) {
        return [
            "i",
            PLATFORM_KEYMAP.i.environmentMap[qstring.test_mode],
            qstring.ios_token,
            common.md5Hash(JSON.stringify(qstring.ios_token))
        ];
    }
    else if (qstring.android_token !== undefined && ["HMS", "HPK"].includes(qstring.token_provider)) {
        const token = qstring.android_token === 'BLACKLISTED' ? '' : qstring.android_token;
        return [
            "h",
            "p",
            token,
            common.md5Hash(JSON.stringify(token))
        ];
    }
}
