/**
 * @typedef {import("../../../api/new/types/queue").PushEvent} PushEvent
 * @typedef {import("../../../api/new/types/credentials").APNP8Credentials} APNP8Credentials
 */
const assert = require("assert");
const { describe, it } = require("mocha");
const { ObjectId } = require("mongodb");
const { send } = require("../../../api/new/platforms/ios");
const { credentialsDTOToObject } = require("../../../api/new/lib/dto");

describe("IOS sender", () => {
    const { IOS_TEST_TOKEN, IOS_TEST_CREDENTIALS } = process.env;
    if (!IOS_TEST_TOKEN || !IOS_TEST_CREDENTIALS) {
        return console.log("IOS_TEST_TOKEN and/or "
            + "IOS_TEST_CREDENTIALS are not defined, skipping tests");
    }
    /** @type {APNP8Credentials} */
    let credentials;
    try {
        credentials = /** @type {APNP8Credentials} */(
            credentialsDTOToObject(JSON.parse(IOS_TEST_CREDENTIALS))
        );
    }
    catch(error) {
        return console.log("IOS_TEST_CREDENTIAL couldn't be parsed,"
            + "skipping tests");
    }
    /** @type {PushEvent} */
    const pushEvent = {
        appId: new ObjectId,
        messageId: new ObjectId,
        scheduleId: new ObjectId,
        token: IOS_TEST_TOKEN,
        credentials,
        saveResult: false,
        env: "d",
        language: "en",
        platform: "i",
        uid: "1",
        message: {
            aps: {
                alert: {
                    title: "testa",
                    body: "testa"
                },
                sound: "default"
            },
            c: {
                i: "67d18d33119f2e488125e787"
            }
        }
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
        console.log(result);
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
