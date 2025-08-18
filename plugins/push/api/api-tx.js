/**
 * @typedef {import("./new/types/schedule").AudienceFilter} AudienceFilter
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
 *          "errors": ["Message start date is later than push date"]
 *      }
 */
module.exports.apiPush = async (params) => {
    let data = common.validateArgs(
        params.qstring,
        {
            app_id: { type: "ObjectID", required: true },
            _id: { type: "ObjectID", required: true },
            start: { type: "Date", required: true },
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
    log.i("Scheduling transactional message:", JSON.stringify(data.obj));
    const schedule = await createSchedule(
        common.db,
        data.obj.app_id,
        data.obj._id,
        data.obj.start,
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
};
