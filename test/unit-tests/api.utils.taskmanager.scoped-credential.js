/**
 * A token limited to some apps resolves to its owner, so being the task's creator
 * must not carry it to the owner's tasks on other apps: it acts on, reads and lists
 * only tasks whose every app it reaches. The owner's own credential, and global
 * admins, are unaffected.
 */
const should = require('should');

const rights = require('../../api/utils/rights.js');
const taskmanager = require('../../api/utils/taskmanager.js');

const OWNER_ID = 'b'.repeat(24);
const APP_A = 'a'.repeat(23) + '1';
const APP_B = 'a'.repeat(23) + '2';

/**
 * Permission granting everything on the given apps
 * @param {string[]} apps - app ids
 * @returns {object} permission object
 */
function adminOf(apps) {
    const permission = {_: {a: apps.slice(), u: [apps.slice()]}, c: {}, r: {}, u: {}, d: {}};
    apps.forEach((appId) => {
        ['c', 'r', 'u', 'd'].forEach((type) => {
            permission[type][appId] = {all: true, allowed: {}};
        });
    });
    return permission;
}

/**
 * Permission granting read of one feature on one app
 * @param {string} appId - app id
 * @returns {object} permission object
 */
function userOf(appId) {
    return {_: {a: [], u: [[appId]]}, c: {}, r: {[appId]: {all: false, allowed: {core: true}}}, u: {}, d: {}};
}

const owner = {_id: OWNER_ID, permission: adminOf([APP_A, APP_B])};
const globalOwner = {_id: OWNER_ID, global_admin: true};

/**
 * The member a request carries when it authenticates with a token of `member`
 * limited by `tokenPermission`, as rights.js builds it
 * @param {object} member - token owner
 * @param {object} tokenPermission - token_permission
 * @returns {object} params with the bounded member
 */
function scopedParams(member, tokenPermission) {
    const scoped = rights.intersectPermission(member, tokenPermission);
    delete scoped.api_key;
    scoped.scoped_credential = true;
    return {member: scoped, token_data: {_id: 'tok', token_permission: tokenPermission}};
}

const taskOnA = {_id: 't1', creator: OWNER_ID, app_id: APP_A, global: false};
const taskOnB = {_id: 't2', creator: OWNER_ID, app_id: APP_B, global: false};
const globalTaskOnB = {_id: 't3', creator: OWNER_ID, app_id: APP_B};
const multiAppTask = {_id: 't4', creator: OWNER_ID, app_id: APP_A, app_ids: [APP_A, APP_B], global: false};
const appLessTask = {_id: 't5', creator: OWNER_ID, app_id: 'undefined', global: false};

describe('long tasks and scoped credentials', function() {
    describe('taskApps', function() {
        it('reads app_ids when the task has them, else app_id', function() {
            taskmanager.taskApps(multiAppTask).should.eql([APP_A, APP_B]);
            taskmanager.taskApps(taskOnB).should.eql([APP_B]);
        });
        it('treats a task made outside an app as having none', function() {
            taskmanager.taskApps(appLessTask).should.eql([]);
            taskmanager.taskApps({app_id: ''}).should.eql([]);
            taskmanager.taskApps(null).should.eql([]);
        });
    });

    describe('isAuthorizedFor', function() {
        const onA = scopedParams(owner, adminOf([APP_A])).member;
        const onAOfGlobal = scopedParams(globalOwner, adminOf([APP_A])).member;
        const readerOnA = scopedParams(owner, userOf(APP_A)).member;

        it('lets a token act on its owner\'s task of an app it reaches', function() {
            taskmanager.isAuthorizedFor(onA, taskOnA).should.equal(true);
            taskmanager.isAuthorizedFor(readerOnA, taskOnA).should.equal(true);
        });
        it('refuses a token its owner\'s task of an app it does not reach', function() {
            taskmanager.isAuthorizedFor(onA, taskOnB).should.equal(false);
            taskmanager.isAuthorizedFor(readerOnA, taskOnB).should.equal(false);
        });
        it('refuses a token of a global admin its owner\'s task of another app', function() {
            taskmanager.isAuthorizedFor(onAOfGlobal, taskOnB).should.equal(false);
            taskmanager.isAuthorizedFor(onAOfGlobal, taskOnA).should.equal(true);
        });
        it('requires every app of a multi-app task', function() {
            taskmanager.isAuthorizedFor(scopedParams(owner, adminOf([APP_A])).member, multiAppTask).should.equal(false);
            taskmanager.isAuthorizedFor(scopedParams(owner, adminOf([APP_B])).member, multiAppTask).should.equal(false);
            taskmanager.isAuthorizedFor(scopedParams(owner, adminOf([APP_A, APP_B])).member, multiAppTask).should.equal(true);
        });
        it('lets a token read its own task of a shared collection, filed under the apps it reaches', function() {
            //a DB Viewer aggregation of events_data/drill_events through a token limited to
            //APP_A and APP_B is filed under exactly those apps
            const sharedTask = {_id: 't6', creator: OWNER_ID, app_id: APP_A, app_ids: [APP_A, APP_B], global: false};
            const onBoth = scopedParams(owner, userOf(APP_A)).member;
            taskmanager.isAuthorizedFor(scopedParams(owner, adminOf([APP_A, APP_B])).member, sharedTask).should.equal(true);
            taskmanager.isReadableBy(scopedParams(owner, adminOf([APP_A, APP_B])).member, sharedTask).should.equal(true);
            taskmanager.isAuthorizedFor(onBoth, Object.assign({}, sharedTask, {app_ids: undefined})).should.equal(true);
        });
        it('does not let the admin of one app act on another member\'s task holding data of several', function() {
            const adminOfA = {_id: 'c'.repeat(24), permission: adminOf([APP_A])};
            const otherOwnersTask = Object.assign({}, multiAppTask, {creator: 'd'.repeat(24)});
            taskmanager.isAuthorizedFor(adminOfA, otherOwnersTask).should.equal(false);
            taskmanager.isAuthorizedFor({_id: 'c'.repeat(24), permission: adminOf([APP_A, APP_B])}, otherOwnersTask).should.equal(true);
            taskmanager.isAuthorizedFor(adminOfA, Object.assign({}, taskOnA, {creator: 'd'.repeat(24)})).should.equal(true);
        });
        it('refuses a token its owner\'s task made outside any app', function() {
            taskmanager.isAuthorizedFor(onA, appLessTask).should.equal(false);
        });
        it('leaves the owner\'s own credential reaching every task they created', function() {
            const limitedOwner = {_id: OWNER_ID, permission: userOf(APP_A)};
            [taskOnA, taskOnB, multiAppTask, appLessTask].forEach((task) => {
                taskmanager.isAuthorizedFor(limitedOwner, task).should.equal(true);
                taskmanager.isAuthorizedFor(owner, task).should.equal(true);
            });
        });
        it('leaves global admins reaching every task', function() {
            [taskOnA, taskOnB, multiAppTask, appLessTask].forEach((task) => {
                taskmanager.isAuthorizedFor(globalOwner, task).should.equal(true);
            });
        });
    });

    describe('isReadableBy', function() {
        const onA = scopedParams(owner, adminOf([APP_A])).member;
        it('refuses a token its owner\'s global task of an app it does not reach', function() {
            taskmanager.isReadableBy(onA, globalTaskOnB).should.equal(false);
        });
        it('refuses a token its owner\'s private task of an app it does not reach', function() {
            taskmanager.isReadableBy(onA, taskOnB).should.equal(false);
        });
        it('lets a token read a task of an app it reaches', function() {
            taskmanager.isReadableBy(onA, taskOnA).should.equal(true);
            taskmanager.isReadableBy(onA, Object.assign({}, globalTaskOnB, {app_id: APP_A})).should.equal(true);
        });
        it('keeps a global task readable by any member without a scoped credential', function() {
            taskmanager.isReadableBy({_id: 'c'.repeat(24), permission: userOf(APP_A)}, globalTaskOnB).should.equal(true);
        });
    });

    describe('createTask', function() {
        it('stores the apps of a task holding data of several, and none otherwise', function() {
            const writes = [];
            const db = {
                collection: () => ({
                    replaceOne: (query, doc) => {
                        writes.push(doc);
                        return Promise.resolve({});
                    },
                    update: (query, doc) => {
                        writes.push(doc.$set || doc);
                        return Promise.resolve({});
                    },
                    updateOne: (query, doc) => {
                        writes.push(doc.$set || doc);
                        return Promise.resolve({});
                    }
                })
            };
            taskmanager.createTask({db, id: 'x1', app_id: APP_A, app_ids: [APP_A, APP_B], creator: OWNER_ID});
            taskmanager.createTask({db, id: 'x2', app_id: APP_A, creator: OWNER_ID});
            writes.length.should.equal(2);
            writes[0].should.have.property('app_ids', [APP_A, APP_B]);
            writes[1].should.not.have.property('app_ids');
        });
    });

    describe('scopedListClause', function() {
        it('adds nothing for a request without a scoped credential', function() {
            should(taskmanager.scopedListClause({member: owner})).equal(null);
            should(taskmanager.scopedListClause({member: owner, token_data: {_id: 'session'}})).equal(null);
        });
        it('limits a scoped caller to tasks whose every app it reaches', function() {
            const clause = taskmanager.scopedListClause(scopedParams(owner, adminOf([APP_A])));
            clause.should.eql({app_id: {$in: [APP_A]}, $nor: [{app_ids: {$elemMatch: {$nin: [APP_A]}}}]});
        });
        it('limits a token of a global admin to the token apps', function() {
            const clause = taskmanager.scopedListClause(scopedParams(globalOwner, adminOf([APP_A])));
            clause.should.have.property('app_id', {$in: [APP_A]});
        });
    });
});
