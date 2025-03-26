/**
 * @typedef {import("../../../api/new/types/queue").PushEvent} PushEvent
 * @typedef {import("../../../api/new/types/credentials").HMSCredentials} HMSCredentials
 */
const assert = require("assert");
const { describe, it } = require("mocha");
const { ObjectId } = require("mongodb");
const { send } = require("../../../api/new/platforms/huawei");
const { credentialsDTOToObject } = require("../../../api/new/lib/dto");

describe("Huawei sender", () => {
    const { HUAWEI_TEST_TOKEN, HUAWEI_TEST_CREDENTIALS } = process.env;
    if (!HUAWEI_TEST_TOKEN || !HUAWEI_TEST_CREDENTIALS) {
        return console.log(
            "HUAWEI_TEST_TOKEN and/or " +
                "HUAWEI_TEST_CREDENTIALS are not defined, skipping tests",
        );
    }
    /** @type {HMSCredentials} */
    let credentials;
    try {
        credentials = /** @type {HMSCredentials} */ (
            credentialsDTOToObject(JSON.parse(HUAWEI_TEST_CREDENTIALS))
        );
    } catch (error) {
        return console.log(
            "HUAWEI_TEST_CREDENTIALS couldn't be parsed," + "skipping tests",
        );
    }
    /** @type {PushEvent} */
    const pushEvent = {
        appId: new ObjectId(),
        messageId: new ObjectId(),
        scheduleId: new ObjectId(),
        token: HUAWEI_TEST_TOKEN,
        credentials,
        saveResult: false,
        env: "p",
        language: "en",
        platform: "h",
        uid: "1",
        message: {
            message: {
                data: '{"c.i":"67e3da4a7818317f3db65ccd","title":"xxx","message":"xxx"}',
                android: {},
            },
        },
    };
    it("should send the message successfully", async () => {
        const result = await send(pushEvent);
        const parsed = JSON.parse(result.split("\n\n")[1]);
        assert(parsed.code === "80000000");
        assert(parsed.msg === "Success");
        assert("requestId" in parsed);
    }).timeout(20000);
    it("should send multiple messages with the same token", async () => {
        const result = await Promise.all([
            send(pushEvent),
            send(pushEvent),
            send(pushEvent),
            send(pushEvent),
        ]);
        console.log(result);
    }).timeout(20000);
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
