/** @typedef {import("../../../api/new/types/message.ts").Result} Result */
const assert = require("assert");
const { describe, it, beforeEach, after, before } = require("mocha");
const { applyResultRecursively } = require("../../../api/new/lib/result");

describe("Message result", () => {
    it("should prepare the mongo query by result object recursively", () => {
        /** @type {{[key: string]: Result}} */
        const messageDoc = {
            result: {
                total: 0,
                sent: 0,
                actioned: 0,
                errored: 0,
                errors: {},
                subs: {
                    i: {
                        total: 0,
                        sent: 0,
                        actioned: 0,
                        errored: 0,
                        errors: {},
                        subs: {
                            en: {
                                total: 0,
                                sent: 0,
                                actioned: 0,
                                errored: 0,
                                errors: {},
                                subs: {}
                            }
                        }
                    }
                }
            }
        };
        /** @type {Result} */
        const resultObject = {
            total: 155,
            sent: 138,
            actioned: 48,
            errored: 17,
            errors: {},
            subs: {
                i: {
                    total: 65,
                    sent: 60,
                    actioned: 22,
                    errored: 5,
                    errors: {},
                    subs: {
                        en: {
                            total: 35,
                            sent: 33,
                            actioned: 12,
                            errored: 2,
                            errors: {
                                error1: 2
                            },
                            subs: {}
                        },
                        tr: {
                            total: 30,
                            sent: 27,
                            actioned: 10,
                            errored: 3,
                            errors: {
                                error2: 1,
                                error3: 2,
                            },
                            subs: {}
                        }
                    }
                },
                a: {
                    total: 70,
                    sent: 62,
                    actioned: 20,
                    errored: 8,
                    errors: {},
                    subs: {
                        en: {
                            total: 33,
                            sent: 31,
                            actioned: 12,
                            errored: 2,
                            errors: {},
                            subs: {}
                        },
                        tr: {
                            total: 37,
                            sent: 31,
                            actioned: 8,
                            errored: 6,
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
                    total: 20,
                    sent: 16,
                    actioned: 6,
                    errored: 4,
                    errors: {},
                    subs: {
                        en: {
                            total: 20,
                            sent: 16,
                            actioned: 6,
                            errored: 4,
                            errors: {
                                error7: 4
                            },
                            subs: {}
                        }
                    }
                }
            }
        }
        applyResultRecursively(messageDoc, resultObject);
        assert.deepStrictEqual(messageDoc.result, resultObject);
    });
});