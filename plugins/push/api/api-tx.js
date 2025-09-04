/**
 * @typedef {import("./new/types/schedule").AudienceFilter} AudienceFilter
 * @typedef {import("./new/types/message").Message} Message
 * @typedef {import("mongodb").Collection<Message>} MessageCollection
 */

const { Filter, Content, ValidationError } = require("./send"),
    common = require("../../../api/utils/common"),
    log = common.log("push:api:tx");

const { createSchedule } = require("./new/scheduler");

/**
 * Add notification to API message
 *
 * @param {object} params params object
 *
 * @api {POST} i/push/message/push Message / API / add users
 * @apiName message push
 * @apiDescription Add notifications to previously created message with API trigger
 * @apiGroup Push Notifications
 *
 * @apiQuery {ObjectID} app_id application id
 * @apiBody {ObjectID} _id Message ID
 * @apiBody {Date} start Date to send notifications on
 * @apiBody {Object} filter User profile filter to limit recipients of this message, must not be empty
 * @apiBody {String} [filter.user] JSON with app_usersAPPID collection filter
 * @apiBody {String} [filter.drill] Drill plugin filter in JSON format
 * @apiBody {ObjectID[]} [filter.geos] Array of geo IDs
 * @apiBody {String[]} [filter.cohorts] Array of cohort IDs
 * @apiBody {Object[]} contents Array of contents, see message/create for details
 * @apiBody {Object} [variables] Custom variables object ({var1: 2, var2: 'Yes'})
 *
 * @apiSuccess {ObjectId} total Number of notifications added
 *
 * @apiUse PushError
 * @apiError NotAPI The app is not found
 * @apiErrorExample NotAPI
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["Message is not api"]
 *      }
 * @apiError WrongDate No credentials for selected platform
 * @apiErrorExample WrongDate
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["Message start date is later than start date"]
 *      }
 */
module.exports.apiPush = async (params) => {
    let data = common.validateArgs(
        params.qstring,
        {
            app_id: { type: "ObjectID", required: true },
            _id: { type: "ObjectID", required: true },
            start: { type: "Date", required: false },
            filter: { type: Filter.scheme, required: true },
            contents: {
                type: Content.scheme,
                array: true,
                required: false,
                nonempty: true,
                "min-length": 1,
            },
            variables: {
                type: "Object",
            },
        },
        true,
    );
    if (!data.result) {
        throw new ValidationError(data.errors);
    }
    /** @type {MessageCollection} */
    const collection = common.db.collection("messages");
    const message = await collection.findOne({
        _id: data.obj._id,
        app: data.obj.app_id,
    });
    if (!message) {
        return common.returnMessage(params, 404, {
            errors: ["Message not found"]
        });
    }
    const trigger = message.triggers.find((t) => t.kind === "api");
    if (!trigger) {
        return common.returnMessage(params, 400, {
            errors: ["Message is not transactional"]
        });
    }
    const start = data.obj.start ?? new Date();
    if (trigger.start.getTime() > start.getTime()) {
        return common.returnMessage(params, 400, {
            errors: ["Message start date is later than start date"]
        });
    }
    log.i("Scheduling transactional message:", JSON.stringify(data.obj));
    try {
        const schedule = await createSchedule(
            common.db,
            data.obj.app_id,
            data.obj._id,
            start,
            false,
            undefined,
            false,
            data.obj.filter,
            {
                contents: data.obj.contents,
                variables: data.obj.variables,
            },
        );
        common.returnOutput(params, { schedule });
    }
    catch (err) {
        log.e("Error while scheduling the message", err);
        return common.returnMessage(params, 500, {
            errors: "Error while scheduling the message: " + error.message
        });
    }
};
