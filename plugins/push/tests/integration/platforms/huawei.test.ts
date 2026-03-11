import type { PushEvent } from '../../../api/types/queue.ts';
import type { HMSCredentials } from '../../../api/types/credentials.ts';
import assert from 'assert';
import { describe, it } from 'mocha';
import { ObjectId } from 'mongodb';
import { getAuthToken, send, validateCredentials } from '../../../api/send/platforms/huawei.ts';
import { credentialsDTOToObject } from '../../../api/lib/dto.ts';
import * as mockedData from '../../mock/data.ts';

const { HUAWEI_TEST_TOKEN, HUAWEI_TEST_CREDENTIALS } = process.env;

describe("Huawei integration", () => {
    if (!HUAWEI_TEST_CREDENTIALS) {
        return console.log("HUAWEI_TEST_CREDENTIALS is not defined, "
            + "skipping Huawei integration tests");
    }
    let credentials: HMSCredentials;
    try {
        credentials = credentialsDTOToObject(JSON.parse(HUAWEI_TEST_CREDENTIALS)) as HMSCredentials;
    }
    catch (error) {
        return console.log("HUAWEI_TEST_CREDENTIALS couldn't be parsed, "
            + "skipping Huawei integration tests");
    }

    describe("Oauth authenticator and token retriever", () => {
        it("should be able to retrieve an access token", async() => {
            const token = await getAuthToken(credentials);
            assert(typeof token === "string" && token.length > 0);
        }).timeout(20000);
    });

    describe("Push notification sender", () => {
        if (!HUAWEI_TEST_TOKEN) {
            return console.log(
                "HUAWEI_TEST_TOKEN are not defined, skipping sender tests",
            );
        }
        const pushEvent: PushEvent = {
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
            payload: {
                message: {
                    data: '{"c.i":"67e3da4a7818317f3db65ccd","title":"xxx","message":"xxx"}',
                    android: {},
                },
            },
            appTimezone: "NA",
            trigger: mockedData.plainTrigger(),
            platformConfiguration: {}
        };

        it("should send the message successfully", async() => {
            const result = await send(pushEvent);
            const parsed = JSON.parse(result.split("\n\n")[1]);
            assert(parsed.code === "80000000");
            assert(parsed.msg === "Success");
            assert("requestId" in parsed);
        }).timeout(20000);

        it("should send multiple messages with the same token", async() => {
            const result = await Promise.all([
                send(pushEvent),
                send(pushEvent),
                send(pushEvent),
                send(pushEvent),
            ]);
        }).timeout(20000);

        it("should send the message successfully through a proxy server", async() => {
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

    describe("Credential validator", () => {
        it("shouldn't be able to validate invalid credentials", async() => {
            await assert.rejects(validateCredentials({
                app: "invalidapp",
                secret: Array(64).fill("a").join(""),
                type: "hms"
            } as any));
        }).timeout(20000);

        it("should validate credentials by sending a test message", async() => {
            await validateCredentials(credentials);
        }).timeout(20000);
    });
});
