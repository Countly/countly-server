import type { PushEvent } from '../../../api/types/queue.ts';
import type { APNP8Credentials, APNP12Credentials } from '../../../api/types/credentials.ts';
import assert from 'assert';
import { describe, it } from 'mocha';
import { ObjectId } from 'mongodb';
import { send, validateCredentials } from '../../../api/send/platforms/ios.ts';
import { credentialsDTOToObject } from '../../../api/lib/dto.ts';
import * as mockedData from '../../mock/data.ts';

const { IOS_TEST_TOKEN, IOS_TEST_CREDENTIALS_P8, IOS_TEST_CREDENTIALS_P12 } = process.env;

describe("IOS integration", () => {
    describe("Push notification sender", () => {
        if (!IOS_TEST_TOKEN || !IOS_TEST_CREDENTIALS_P8) {
            return console.log("IOS_TEST_TOKEN and/or IOS_TEST_CREDENTIALS_P8 "
                + "are not defined, skipping sender tests");
        }
        let credentials: APNP8Credentials;
        try {
            credentials = credentialsDTOToObject(JSON.parse(IOS_TEST_CREDENTIALS_P8)) as APNP8Credentials;
        }
        catch (error) {
            return console.log("IOS_TEST_CREDENTIAL couldn't be parsed,"
                + "skipping tests");
        }
        const pushEvent: PushEvent = {
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
            payload: {
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

        it("should send the message successfully", async() => {
            await send(pushEvent);
        });

        it("should send multiple messages", async() => {
            await Promise.all([
                send(pushEvent),
                send(pushEvent),
                send(pushEvent),
                send(pushEvent),
            ]);
        }).timeout(20000);

        it("should send the message successfully through a proxy server", async() => {
            // TODO: Implement a real proxy server test
            console.log("PLACEHOLDER TEST");
            const pushEventWithProxy: PushEvent = {
                ...pushEvent,
                proxy: {
                    host: "localhost",
                    auth: false,
                    port: "8124"
                }
            };
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
        it("should validate p12 credentials by sending a test message", async() => {
            if (!IOS_TEST_CREDENTIALS_P12) {
                return console.log("IOS_TEST_CREDENTIALS_P12 is not defined, "
                    + "skipping the p12 validation test");
            }
            const creds = JSON.parse(IOS_TEST_CREDENTIALS_P12);
            creds.cert = "data:application/x-pkcs12;base64," + creds.cert;
            const validCredentials = credentialsDTOToObject(creds) as APNP12Credentials;
            await validateCredentials(validCredentials);
        });

        it("should validate p8 credentials by sending a test message", async() => {
            if (!IOS_TEST_CREDENTIALS_P8) {
                return console.log("IOS_TEST_CREDENTIALS_P8 is not defined, "
                    + "skipping the p8 validation test");
            }
            const creds = JSON.parse(IOS_TEST_CREDENTIALS_P8);
            creds.key = "data:application/x-pkcs8;base64," + creds.key;
            const validCredentials = credentialsDTOToObject(creds) as APNP8Credentials;
            await validateCredentials(validCredentials);
        });
    });
});
