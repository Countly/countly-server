const testUtils = require('../../../test/testUtils'),
    supertest = require('supertest').agent(testUtils.url),
    should = require('should');

// Test users lookup (o/push/test-users), used to pick push test users without the drill &
// users plugins. Covers the device ID search, listing configured test users, saving them
// through app settings, app scoping and push read permission.
const uniq = 'pushtu' + Date.now(),
    dids = {
        alpha1: uniq + '-alpha-1',
        alpha2: uniq + '-alpha-2',
        dot: uniq + '.beta',
        x: uniq + 'Xbeta',
        other: uniq + '-alpha-other-app',
    };

let aid = '',
    app_key = '',
    api_key = '',
    otherAid = '',
    otherAppKey = '',
    memberId = '',
    memberApiKey = '',
    uids = {};

/**
 * Create a user by starting a session
 *
 * @param {string} appKey app key
 * @param {string} did device id
 */
async function createUser(appKey, did) {
    await supertest.post(`/i?app_key=${appKey}&device_id=${encodeURIComponent(did)}`)
        .send({begin_session: 1})
        .expect(200);
}

/**
 * Call the test users lookup
 *
 * @param {object} query query string parameters on top of api_key & app_id
 * @param {string} key api key
 * @param {string} app app id
 * @returns {Promise} supertest response
 */
function lookup(query, key = api_key, app = aid) {
    let qs = Object.assign({api_key: key, app_id: app}, query);
    return supertest.get('/o/push/test-users?' + Object.keys(qs).map(k => k + '=' + encodeURIComponent(qs[k])).join('&'));
}

describe('PUSH TEST USERS', () => {
    it('should set up users, a second app and a member with push read rights', async() => {
        aid = testUtils.get('APP_ID');
        api_key = testUtils.get('API_KEY_ADMIN');
        app_key = testUtils.get('APP_KEY');

        let res = await supertest.get('/i/apps/create?api_key=' + api_key + '&args=' + encodeURIComponent(JSON.stringify({name: uniq, type: 'mobile'})))
            .expect(200);
        otherAid = res.body._id;
        otherAppKey = res.body.key;
        should.exist(otherAid);

        let permission = {_: {a: [], u: [[aid]]}, c: {}, r: {}, u: {}, d: {}};
        permission.r[aid] = {all: false, allowed: {push: true}};
        res = await supertest.get('/i/users/create?api_key=' + api_key + '&args=' + encodeURIComponent(JSON.stringify({
            full_name: uniq,
            username: uniq,
            password: 'p4ssw0rD!' + uniq,
            email: uniq + '@mail.test',
            permission
        }))).expect(200);
        memberId = res.body._id;
        memberApiKey = res.body.api_key;
        should.exist(memberApiKey);

        for (let k of ['alpha1', 'alpha2', 'dot', 'x']) {
            await createUser(app_key, dids[k]);
        }
        await createUser(otherAppKey, dids.other);
    }).timeout(20000);

    it('should find users by part of their device ID', async() => {
        let res = await lookup({search: uniq + '-ALPHA'}).expect(200);
        res.body.map(u => u.did).should.eql([dids.alpha1, dids.alpha2]);
        res.body.forEach(u => {
            u.should.have.properties('_id', 'uid', 'did');
            Object.keys(u).sort().should.eql(['_id', 'did', 'uid']);
            uids[u.did] = u.uid;
        });
    });

    it('should treat the search text literally', async() => {
        let res = await lookup({search: uniq + '.b'}).expect(200);
        res.body.map(u => u.did).should.eql([dids.dot]);

        res = await lookup({search: uniq + '.*'}).expect(200);
        res.body.should.eql([]);
    });

    it('should not return users of another app', async() => {
        let res = await lookup({search: '-alpha-other-app'}).expect(200);
        res.body.should.eql([]);

        res = await lookup({search: uniq + '-alpha-other-app'}, api_key, otherAid).expect(200);
        res.body.map(u => u.did).should.eql([dids.other]);
    });

    it('should list users by uid', async() => {
        let res = await lookup({uids: [uids[dids.alpha2], 'no-such-uid'].join(',')}).expect(200);
        res.body.map(u => u.did).should.eql([dids.alpha2]);
    });

    it('should require search or uids', async() => {
        let res = await lookup({}).expect(400);
        res.body.errors.should.eql(['One of search & uids parameters is required']);

        // an empty search would match every user
        res = await lookup({search: '  '}).expect(400);
        res.body.errors.should.eql(['One of search & uids parameters is required']);
    });

    it('should allow a member with push read rights on the app', async() => {
        let res = await lookup({search: uniq + '-alpha'}, memberApiKey).expect(200);
        res.body.length.should.equal(2);
    });

    it('should refuse a member without push rights on the app', async() => {
        await lookup({search: uniq + '-alpha'}, memberApiKey, otherAid).expect(401);
    });

    it('should save looked up users as test users and list them back', async() => {
        let test = {uids: [uids[dids.alpha1], uids[dids.alpha2]].join(',')};
        await supertest.get('/i/apps/update/plugins?api_key=' + api_key + '&app_id=' + aid + '&args=' + encodeURIComponent(JSON.stringify({push: {test}})))
            .expect(200);

        let res = await supertest.get('/o/apps/details?api_key=' + api_key + '&app_id=' + aid).expect(200);
        res.body.app.plugins.push.test.uids.split(',').sort().should.eql(test.uids.split(',').sort());

        res = await lookup({uids: test.uids}).expect(200);
        res.body.map(u => u.did).should.eql([dids.alpha1, dids.alpha2]);
    });

    it('should clean up', async() => {
        await supertest.get('/i/apps/update/plugins?api_key=' + api_key + '&app_id=' + aid + '&args=' + encodeURIComponent(JSON.stringify({push: {test: {}}})))
            .expect(200);
        await supertest.get('/i/users/delete?api_key=' + api_key + '&args=' + encodeURIComponent(JSON.stringify({user_ids: [memberId]})))
            .expect(200);
        await supertest.get('/i/apps/delete?api_key=' + api_key + '&args=' + encodeURIComponent(JSON.stringify({app_id: otherAid})))
            .expect(200);
    }).timeout(10000);
});
