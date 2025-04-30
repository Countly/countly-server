/**
 * @typedef {import("../../api/new/types/message.ts").Result} Result
 * @typedef {import("mongodb").Collection} Collection
 * @typedef {import("mongodb").Db} Db
 * @typedef {import("mongodb").FindCursor} FindCursor
 */
const assert = require("assert");
const { describe, it } = require("mocha");
const sinon = require("sinon");
const { buildUpdateQueryForResult } = require("../../api/new/resultor.js");

describe("Resultor should", () => {
    it("build the $inc operator recursively", () => {
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
        };
        const result = buildUpdateQueryForResult(resultObject);
        assert.deepStrictEqual(result, {
            "result.total": 155,
            "result.sent": 138,
            "result.errored": 17,
            "result.actioned": 48,
            "result.errors.error1": 2,
            "result.errors.error2": 1,
            "result.errors.error3": 2,
            "result.subs.i.total": 65,
            "result.subs.i.sent": 60,
            "result.subs.i.errored": 5,
            "result.subs.i.actioned": 22,
            "result.subs.i.errors.error1": 2,
            "result.subs.i.subs.en.total": 35,
            "result.subs.i.subs.en.sent": 33,
            "result.subs.i.subs.en.errored": 2,
            "result.subs.i.subs.en.actioned": 12,
            "result.subs.i.subs.en.errors.error1": 2,
            "result.subs.i.subs.tr.total": 30,
            "result.subs.i.subs.tr.sent": 27,
            "result.subs.i.subs.tr.errored": 3,
            "result.subs.i.subs.tr.actioned": 10,
            "result.subs.i.subs.tr.errors.error2": 1,
            "result.subs.i.subs.tr.errors.error3": 2,
            "result.subs.a.total": 70,
            "result.subs.a.sent": 62,
            "result.subs.a.errored": 8,
            "result.subs.a.actioned": 20,
            "result.subs.a.subs.en.total": 33,
            "result.subs.a.subs.en.sent": 31,
            "result.subs.a.subs.en.errored": 2,
            "result.subs.a.subs.en.actioned": 12,
            "result.subs.a.subs.tr.total": 37,
            "result.subs.a.subs.tr.sent": 31,
            "result.subs.a.subs.tr.errored": 6,
            "result.subs.a.subs.tr.actioned": 8,
            "result.subs.a.subs.tr.errors.error4": 4,
            "result.subs.a.subs.tr.errors.error5": 1,
            "result.subs.a.subs.tr.errors.error6": 1,
            "result.subs.h.total": 20,
            "result.subs.h.sent": 16,
            "result.subs.h.errored": 4,
            "result.subs.h.actioned": 6,
            "result.subs.h.subs.en.total": 20,
            "result.subs.h.subs.en.sent": 16,
            "result.subs.h.subs.en.errored": 4,
            "result.subs.h.subs.en.actioned": 6,
            "result.subs.h.subs.en.errors.error7": 4
        });
    });
});