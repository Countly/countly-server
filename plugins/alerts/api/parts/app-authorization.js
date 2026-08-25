/**
 * @module plugins/alerts/api/parts/app-authorization
 * @description Decides whether a member may act on the apps an alert targets.
 *
 * The alert endpoints authorize the caller against params.qstring.app_id, which says
 * nothing about the apps the alert itself points at. Two further things have to be
 * checked and were not:
 *
 *  - the apps the *stored* alert targets, on any mutation addressed by _id. The
 *    submitted selectedApps is checked separately, but an update may leave that field
 *    out and keep whatever is stored, so the stored value needs its own check.
 *  - the owner's *current* access, at the moment an alert is sent. Nothing re-checked
 *    that once an alert was enabled, so one created before access was revoked kept
 *    emailing that app's metrics with no further action by anybody.
 *
 * createdBy is not a substitute for either. It says the member made the alert, not that
 * they may still act on the apps it targets.
 *
 * This lives in its own module because the request path and the scheduled job both need
 * it, including the legacy allowance below, and two copies of that would drift.
 */

'use strict';

const FEATURE_NAME = 'alerts';

/**
 * Apps a member reaches only through the legacy fields.
 *
 * Members created before the permission object have none, and the right helpers then
 * fall through to admin_of alone, so somebody who is merely user_of an app looks
 * unauthorized. Without this they would lose the ability to manage their own alerts, and
 * their alerts would stop being delivered. /o/alert/list makes the same allowance; all
 * three have to agree or an alert could be listed and not editable, or editable and not
 * delivered.
 *
 * @param {object} member - member object
 * @returns {string[]} app ids granted by the legacy fields, empty for modern members
 */
function legacyApps(member) {
    if (!member || typeof member.permission !== "undefined") {
        return [];
    }
    return Array.isArray(member.user_of) ? member.user_of.map(String) : [];
}

/**
 * Whether the member currently holds a right on every app in the list.
 *
 * An empty or missing list returns false: an alert that targets nothing is not something
 * to authorize permissively.
 *
 * @param {function} rightFn - hasCreateRight / hasUpdateRight / hasReadRight
 * @param {object} member - member object
 * @param {Array} apps - app ids the alert targets
 * @returns {boolean} true only when the member holds the right for every app
 */
function memberHasRightForAllApps(rightFn, member, apps) {
    if (!member || !Array.isArray(apps) || apps.length === 0) {
        return false;
    }
    if (member.global_admin) {
        return true;
    }
    const legacy = legacyApps(member);
    return apps.every(function(appId) {
        return rightFn(FEATURE_NAME, appId + "", member) || legacy.indexOf(appId + "") > -1;
    });
}

/**
 * Whether the member may read one app's alerts. Used by the scheduled job, which deals
 * with a single app rather than an alert's whole target list.
 *
 * @param {function} readRightFn - hasReadRight from rights.js
 * @param {object} member - member object
 * @param {string} appId - app id
 * @returns {boolean} true when the member may read that app's alerts
 */
function memberMayReadApp(readRightFn, member, appId) {
    if (!member) {
        return false;
    }
    if (member.global_admin) {
        return true;
    }
    return readRightFn(FEATURE_NAME, appId + "", member) || legacyApps(member).indexOf(appId + "") > -1;
}

module.exports = {
    FEATURE_NAME,
    legacyApps,
    memberHasRightForAllApps,
    memberMayReadApp
};
