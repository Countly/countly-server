/**
 * @typedef {import("../../../api/new/types/queue").PushEvent} PushEvent
 * @typedef {import("../../../api/new/types/credentials").FCMCredentials} FCMCredentials
 */
const assert = require("assert");
const { describe, it } = require("mocha");
const { ObjectId } = require("mongodb");
const { send } = require("../../../api/new/platforms/android");
const { credentialsDTOToObject } = require("../../../api/new/lib/dto");

describe("Android sender", () => {
    const { ANDROID_TEST_TOKEN, ANDROID_TEST_CREDENTIALS } = process.env;
    if (!ANDROID_TEST_TOKEN || !ANDROID_TEST_CREDENTIALS) {
        return console.log("ANDROID_TEST_TOKEN and/or "
            + "ANDROID_TEST_CREDENTIALS are not defined, skipping tests");
    }
    /** @type {FCMCredentials} */
    let credentials;
    try {
        credentials = /** @type {FCMCredentials} */(
            credentialsDTOToObject(JSON.parse(ANDROID_TEST_CREDENTIALS))
        );
    }
    catch(error) {
        return console.log("ANDROID_TEST_CREDENTIAL couldn't be parsed,"
            + "skipping tests");
    }
    /** @type {PushEvent} */
    const pushEvent = {
        appId: new ObjectId,
        messageId: new ObjectId,
        scheduleId: new ObjectId,
        token: ANDROID_TEST_TOKEN,
        credentials,
        saveResult: false,
        env: "p",
        language: "en",
        platform: "a",
        uid: "1",
        message: {
            data: {
                "c.i": "67c9bb34630cd98e0fb95a14",
                title: "test",
                message: "test",
                sound: "default"
            }
        },
    }
    /** @type {PushEvent} */
    const pushEventWithProxy = {
        ...pushEvent,
        proxy: {
            host:"localhost",
            auth: false,
            port: "8124"
        }
    }
    it("should send the message successfully", async () => {
        const result = await send(pushEvent);
        assert(result.match(/^projects\//));
    });
    it("should send the message successfully through a proxy server", async () => {
        // console.time("sequential");
        // for (let i = 0; i < 50; i++) {
        //     await send(pushEventWithProxy);
        //     // const result = await send(pushEventWithProxy);
        //     // assert(result.match(/^projects\//));
        // }
        // console.timeEnd("sequential");

        // console.time("parallel");
        // await send(pushEventWithProxy);
        // await send(pushEventWithProxy);
        // const messages = Array(1000).fill(pushEventWithProxy);
        // const result = await Promise.all(messages.map(m => send(m)));
        // console.log(JSON.stringify(result, null, 2));
        // console.timeEnd("parallel");
    }).timeout(100000);
});