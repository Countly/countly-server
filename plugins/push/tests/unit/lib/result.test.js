/** @typedef {import("../../../api/new/types/message.ts").Result} Result */
const assert = require("assert");
const { describe, it, beforeEach, after, before } = require("mocha");
const { buildUpdateQueryForResult } = require("../../../api/new/resultor.js");

describe("Message result", () => {
    /** @type {Result} */
    const resultObject = {
        total: 155, sent: 138, actioned: 48, errored: 17,
        errors: {
            error1: 2,
            error2: 1,
            error3: 2,
        },
        subs: {
            i: {
                total: 65, sent: 60, actioned: 22, errored: 5,
                errors: {
                    error1: 2
                },
                subs: {
                    en: {
                        total: 35, sent: 33, actioned: 12, errored: 2,
                        errors: {
                            error1: 2
                        },
                        subs: {}
                    },
                    tr: {
                        total: 30, sent: 27, actioned: 10, errored: 3,
                        errors: {
                            error2: 1,
                            error3: 2,
                        },
                        subs: {}
                    }
                }
            },
            a: {
                total: 70, sent: 62, actioned: 20, errored: 8,
                errors: {},
                subs: {
                    en: {
                        total: 33, sent: 31, actioned: 12, errored: 2,
                        errors: {},
                        subs: {}
                    },
                    tr: {
                        total: 37, sent: 31, actioned: 8, errored: 6,
                        errors: {
                            error4: 4,
                            error5: 1,
                            error6: 1,
                        },
                        subs: {}
                    }
                }
            },
            h: {
                total: 20, sent: 16, actioned: 6, errored: 4,
                errors: {},
                subs: {
                    en: {
                        total: 20, sent: 16, actioned: 6, errored: 4,
                        errors: {
                            error7: 4
                        },
                        subs: {}
                    }
                }
            }
        }
    }
    it("should create the $inc operator recursively", () => {
        const result = buildUpdateQueryForResult(resultObject);
        console.log(JSON.stringify(result, null, 2));
    });
});