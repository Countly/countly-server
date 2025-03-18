/**
 * @typedef {import("../../../api/new/types/queue").PushEvent} PushEvent
 */
const assert = require("assert");
const { describe, it } = require("mocha");
const { ObjectId } = require("mongodb");
const { send } = require("../../../api/new/platforms/android");

describe("Android sender", () => {
    /** @type {PushEvent} */
    const pushEvent = {
        appId: new ObjectId,
        messageId: new ObjectId,
        scheduleId: new ObjectId,
        env: "p",
        language: "en",
        platform: "a",
        uid: "1",
        token: "eC1ybCrTSG-S6nbLec7QCo:APA91bGbvsvRa3nj23crxQAGYBJVkUQfgcUNU50B5P_P4Xrp8C563DN7l_8v4W_y0wYZ3MMTXOF1L7re3d9d1nR4C0JwYh5B_pL8eH2NG3ePfmCUY4B-V_U",
        message: {
            data: {
                "c.i": "67c9bb34630cd98e0fb95a14",
                title: "test",
                message: "test",
                sound: "default"
            }
        },
        credentials: {
            type: "fcm",
            _id: new ObjectId,
            hash: "lorem",
            serviceAccountFile: "data:application/json;base64,ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiY291bnRseXRlc3QtZjk2YzMiLAogICJwcml2YXRlX2tleV9pZCI6ICJhMDFkNDkzYzYyYjRhYWU1Mzc1YTcwNjYyODVlZDk4Zjg3OGJhMmY0IiwKICAicHJpdmF0ZV9rZXkiOiAiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdlFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLY3dnZ1NqQWdFQUFvSUJBUUN6bGp3S0czSXVnUUJUXG53RlBRRFNZakJEczh3NFRrdlI0cDdxM0lkcHRLM3JPYjJON0hDUGZRcm1Ja1AzSlUrYWZWR3M0VFduTENueVllXG5QTUZyUlFncU04K2hnazhxM3hJL2RBU2U5ZzBJUmlKRFBLSWo1N2F1RzFtbHQrTFhWaXVPYmdrbnkrNVI4ZXN6XG5IVWErTWc4cU1zWjdWTG5wREcvUTM4ZVdWcW0wMDlnYmRsYlhJamc1KzlyRGIvRnA1T1hyZ2hTVXpOSzJxY0dTXG52QjVkRXlTKzZWRjBQM0Izb1V6OG9oakpoYjdnZmYvdjFUZVFuNTFUNmRpbEphaDBYbk1qRTNqdzBqeUpMeHpCXG44bGZOWGFOOVI2UU92dGxPalNYRnV4dk83T0ZLRkIzaWRrM2FFcWcveVlVR1NNTXpkM1V3YXNTSUpsa2kybVhzXG5ncGtBaUpKeEFnTUJBQUVDZ2dFQUN6SGM5dTcvRHljUTAzMEp2SGtWWE5seFYrTUM4R29FUWdPVVBHQW9ZMkpwXG5Pb01xWC8za2ROTVV0Y01VRXMxU25sWXRiUnpBOVV1THloYS9kK1cxdkpabzViTXZKdDBBKzRqMVFNalZ4eU9ZXG5GSU9URitua2hBdEZ3SzdWMVN2cDlkYjdleCtiUmtCdVhrdi9ra1pNbGw5K2xVYm9KVDdyNUNRUEFsclBUc0QxXG5nNXIyR09NODBnQ2U3UFRZdTBWYndseUQ2am80ZEoyMVJQRGx1ZWVOWm5rc3lRdXZEY3NsWVQzRnRJMms1ZnAvXG5tWUdRN0piZE1oemJRZ0RzeVlvczB4OW5JajJYOS96N3pSTTJlL3RaTU01cjhnc2REdUFjWDhHVlduSnlUdGUwXG5kdmlGdGxSbGxDaGxSMVFxNHhEQWh3WWozWEtwMmp1aTBYZk9uWTl3Z1FLQmdRRDcxRmZ3WHVmMDhod3dIZUIzXG5NTUkrYUZhWEVEVTEzTmpYeE0xcGpLQ1o2SCtjWEU4NFVROEJuOVk5ZDJuaHlhZWl1ek14WjJPdHpyOHlCUE41XG5JbDJyUWFwMko5VzMwUWVMaHFGY3BRbklMSUNMZUlabjBuR0JNcFE0V1N2UVRkbUVGUEpSK2ttdGpaVnJFcVBpXG5Ec1ZQUGVwK29lb21iMUVQNW9VSm5wZmdNd0tCZ1FDMmo1eDBtV1d2a1k4UXV3d2MrUmFFUlgzNndZaTlWMnl6XG5mMWVsYnJKQWJ4RHdjVTcxdC9xemhyVmRMaU9nWHhBcWZXcVBvbVZ1bjV0eE9ZQWhTK0tqU1pWOFZRNUNpQTJZXG5uMDRWbkM1dm05U3E4RmpxMTl0d2NvY25OOFdkUlNCVFhtb2Z0TFV1OXRlYW95MXVEdWxtb1RTNnBWTWloUktMXG5WOTk1L2MwT3l3S0JnQWhiaUx1YWVyby9XcjRpRDdRRTh6MWMreHF5V0FHOG5abXpsMW1jYUN3VGNrQy9NNFhiXG44dEtMK25FNXlGTE0vWHBDR2pYV2g1RmFIakJMeDhUS1ppOXIwM3R1WVFKanRvdGo0WEVRclIxdWxLbU1TM0dnXG5vMUcxV3dQdnVhdUZHZVh2U0FkK2RmbURqR1RzVG5JUEtXOHl6OWg2Q1NwVFlXNVVxUytqaXNqUEFvR0JBS3NIXG5UWWE2c3RYUkl0dUVzR3R3TzlUOUdYSFMzOXlxUzQ2NXJRMng3OUtIZXJJWEpPYjBUaXpqOVlMdkY3ZEZkK3FtXG5oaTg3NzVTOGVDNlJ0T1Q4cDcxYjBXeWlibktMN1ZqZlhaTEhONFdkMHBXMkIwY3pwRVByTjR6Wkpnd1pWNWhpXG42ajc3MTRYQkFPbkJGMjExRU5ueUNta1ZPeFlxM3QybUhCbTRXT1FUQW9HQVViaXRCRkkwTUFkSkVSSEp1M2EvXG52ZnFiMHFsOExXVlpYMHNZYU5ROFVLRlZQK3FXVHlVUVJ5VXA4blRWTGhXYXZRUW5zOXJNZFl1cmFEYkZwbXRtXG5GaStrNENRY3U5TXJqSEZyKzNmVmRRU1hSdjZtY2duWmpmYVQzc0hheE9ma2dla2VHUXRmenA0QzB6VEYvY3VDXG4zcDhYTlNxR3lsZ1FlbGREOXI2REswUT1cbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cbiIsCiAgImNsaWVudF9lbWFpbCI6ICJmaXJlYmFzZS1hZG1pbnNkay16ZGpldUBjb3VudGx5dGVzdC1mOTZjMy5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgImNsaWVudF9pZCI6ICIxMDI0NDE4Njg3NzU5MTUwMjM3NjciLAogICJhdXRoX3VyaSI6ICJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvYXV0aCIsCiAgInRva2VuX3VyaSI6ICJodHRwczovL29hdXRoMi5nb29nbGVhcGlzLmNvbS90b2tlbiIsCiAgImF1dGhfcHJvdmlkZXJfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLAogICJjbGllbnRfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9yb2JvdC92MS9tZXRhZGF0YS94NTA5L2ZpcmViYXNlLWFkbWluc2RrLXpkamV1JTQwY291bnRseXRlc3QtZjk2YzMuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJ1bml2ZXJzZV9kb21haW4iOiAiZ29vZ2xlYXBpcy5jb20iCn0K"
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
        // const result = await send(pushEvent);
        // assert(result.match(/^projects\//));
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
        await send(pushEventWithProxy);
        await send(pushEventWithProxy);
        const messages = Array(1000).fill(pushEventWithProxy);
        const result = await Promise.all(messages.map(m => send(m)));
        // console.log(JSON.stringify(result, null, 2));
        // console.timeEnd("parallel");
    }).timeout(100000);
});