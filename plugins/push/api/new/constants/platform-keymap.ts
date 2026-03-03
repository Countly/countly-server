import type { PlatformKey, PlatformEnvKey, PlatformCombinedKey } from "../types/message.ts";

interface PlatformKeymapEntry {
    title: string;
    aliasFor: PlatformKey[];
    environments: PlatformEnvKey[];
    environmentMap: Record<string, PlatformEnvKey>;
    combined: PlatformCombinedKey[];
    environmentTitles: Partial<Record<PlatformEnvKey, string>>;
}

export default {
    "a": {
        "title": "Android",
        "aliasFor": ["a", "h"],
        "environments": ["p"],
        "environmentMap": {
            "0": "p"
        },
        "combined": ["ap", "hp"],
        "environmentTitles": {
            "p": "Android Firebase Token"
        }
    },
    "i": {
        "title": "IOS",
        "aliasFor": ["i"],
        "environments": ["p", "d", "a"],
        "environmentMap": { // this is used to map environment numbers sdk send to server to their keys
            "0": "p",
            "1": "d",
            "2": "a"
        },
        "environmentTitles": {
            "p": "iOS Production Token",
            "d": "iOS Development Token",
            "a": "iOS AdHoc / TestFlight Token"
        },
        "combined": ["ip", "id", "ia"]
    },
    "h": {
        "title": "Huawei",
        "aliasFor": ["h"],
        "environments": ["p"],
        "environmentMap": {
            "0": "p"
        },
        "combined": ["hp"],
        "environmentTitles": {
            "p": "Android Huawei Token"
        }
    }
} as Record<PlatformKey, PlatformKeymapEntry>;
