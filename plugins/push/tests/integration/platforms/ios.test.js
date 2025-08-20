/**
 * @typedef {import("../../../api/new/types/queue").PushEvent} PushEvent
 * @typedef {import("../../../api/new/types/credentials").APNP8Credentials} APNP8Credentials
 */
const assert = require("assert");
const { describe, it } = require("mocha");
const { ObjectId } = require("mongodb");
const { send } = require("../../../api/new/platforms/ios");
const { credentialsDTOToObject } = require("../../../api/new/lib/dto");
const mockedData = require("../../mock/data");
const { IOS_TEST_TOKEN, IOS_TEST_CREDENTIALS } = process.env;

describe("IOS", () => {
    describe("push notification sender", () => {
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
            },
            appTimezone: "NA",
            trigger: mockedData.plainTrigger(),
            platformConfiguration: {
                setContentAvailable: false
            }
        };
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
        });
        it("should send multiple messages", async () => {
            const result = await Promise.all([
                send(pushEvent),
                send(pushEvent),
                send(pushEvent),
                send(pushEvent),
            ]);
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

    describe("credential validator", () => {
        it("should throw when there's a missing property", async () => {
            let invalidCredentials = /** @type {any} */({type: "apn_universal"});
            await assert.rejects(validateCredentials(invalidCredentials));
            invalidCredentials = /** @type {any} */({type: "fcm"});
            await assert.rejects(validateCredentials(invalidCredentials));
            invalidCredentials = /** @type {any} */({type: "fcm", serviceAccountFile: "test"});
            await assert.rejects(validateCredentials(invalidCredentials));
        });

        it("should throw when serviceAccountFile is not a json", async () => {
            const invalidCredentials = /** @type {FCMCredentials} */({
                type: "fcm",
                serviceAccountFile: "invalid",
                hash: "invalid"
            });
            await assert.rejects(validateCredentials(invalidCredentials));
        });

        it("should try and send a test message to validate the credential and then fail", async () => {
            const invalidCredentials = /** @type {FCMCredentials} */({
                _id: new ObjectId,
                type: "fcm",
                hash: "invalid",
                serviceAccountFile: "data:application/json;base64," + Buffer.from(JSON.stringify({
                    "type": "service_account",
                    "project_id": "...",
                    "private_key_id": "...",
                    "private_key": "...",
                    "client_email": "...",
                    "client_id": "...",
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_x509_cert_url": "...",
                    "universe_domain": "googleapis.com"
                })).toString('base64')
            });
            await assert.rejects(validateCredentials(invalidCredentials));
        });

        it("should validate credentials by sending a test message", async () => {
            if (!ANDROID_TEST_CREDENTIALS) {
                return console.log("ANDROID_TEST_TOKEN and/or "
                    + "ANDROID_TEST_CREDENTIALS are not defined, skipping the test");
            }
            const validCredentials = /** @type {FCMCredentials} */(
                credentialsDTOToObject(JSON.parse(ANDROID_TEST_CREDENTIALS))
            );
            await validateCredentials(validCredentials);
        });
    });

});
