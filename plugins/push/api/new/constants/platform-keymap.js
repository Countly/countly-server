/**
 * @typedef {import("../types/message").PlatformKey} PlatformKey
 * @typedef {import("../types/message").PlatformEnvKey} PlatformEnvKey
 * @typedef {import("../types/message").PlatformCombinedKeys} PlatformCombinedKeys
 */
/**
 * Platform keymap for different environments.
 * @type {Record<PlatformKey, { title: string; aliasFor: PlatformKey[]; environments: PlatformEnvKey[]; environmentMap: Record<string, PlatformEnvKey>; combined: PlatformCombinedKeys[]; environmentTitles: Record<PlatformEnvKey, string> }>}
 */
module.exports = {
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
        "environmentTitles" : {
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
}