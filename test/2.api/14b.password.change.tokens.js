const supertest = require('supertest');
const should = require('should');
const testUtils = require('../testUtils');
const authorize = require('../../api/utils/authorizer.js');

const request = supertest(testUtils.url);

// A password change revokes what the member signed in with before it: every token the
// member owns, of any purpose, and other dashboard sessions. A self-service
// change keeps the session that made it. Each case uses a member of its own and ends
// with that member deleted.

const PASSWORD = 'Tokens-0ld-p4ss!';
const NEW_PASSWORD = 'Tokens-n3w-p4ss!';

/**
 * @returns {Promise<{_id: string, api_key: string, username: string}>} a new global admin member
 */
async function createMember() {
    const suffix = Date.now() + '_' + Math.random().toString(36).slice(2);
    const args = { full_name: 'tokens ' + suffix, username: 'tokens_' + suffix, password: PASSWORD, email: 'tokens.' + suffix + '@mail.test', global_admin: true };
    const res = await request.get('/i/users/create').query({ api_key: testUtils.get('API_KEY_ADMIN'), args: JSON.stringify(args) });
    res.status.should.equal(200, res.text);
    return { _id: String(res.body._id), api_key: res.body.api_key, username: args.username };
}

/**
 * @param {string} memberId - member to delete
 */
async function deleteMember(memberId) {
    await request.get('/i/users/delete').query({ api_key: testUtils.get('API_KEY_ADMIN'), args: JSON.stringify({ user_ids: [memberId] }) });
}

/**
 * @param {string} memberId - token owner
 * @returns {Promise<object[]>} the member's tokens
 */
function tokensOf(memberId) {
    return testUtils.db.collection('auth_tokens').find({ owner: memberId }).toArray();
}

/**
 * Stores a token the way a dashboard sign-in in another browser does
 * @param {string} memberId - token owner
 * @returns {Promise<string>} the token
 */
function otherBrowserToken(memberId) {
    return new Promise((resolve, reject) => {
        authorize.save({
            db: testUtils.db,
            owner: memberId,
            purpose: 'LoggedInAuth',
            ttl: 1800,
            can_login: true,
            callback: (err, token) => (err ? reject(err) : resolve(token)),
        });
    });
}

/**
 * Creates a token through the API, as an integration does
 * @param {string} apiKey - the member's api_key
 * @returns {Promise<string>} the token
 */
async function integrationToken(apiKey) {
    const res = await request.get('/i/token/create').query({ api_key: apiKey, purpose: 'Integration', ttl: 0 });
    res.status.should.equal(200, res.text);
    return res.body.result;
}

/**
 * @param {string} token - a token
 * @returns {Promise<number>} the status of an API read with it
 */
async function apiStatus(token) {
    const res = await request.get('/o/apps/mine').query({ auth_token: token });
    return res.status;
}

/**
 * @param {string} token - a token
 * @returns {Promise<string>} where /login/token/:token sends the browser
 */
async function tokenLoginLocation(token) {
    const res = await request.get('/login/token/' + token).redirects(0);
    res.status.should.equal(302);
    return res.headers.location;
}

/**
 * Waits for the member to have no tokens left except the given ones
 * @param {string} memberId - token owner
 * @param {string[]} kept - token ids that stay
 * @returns {Promise} resolves once only the kept tokens are left
 */
async function untilOnly(memberId, kept) {
    const expected = [...kept].sort();
    let ids = [];
    for (let attempt = 0; attempt < 50; attempt++) {
        ids = (await tokensOf(memberId)).map((t) => t._id).sort();
        if (JSON.stringify(ids) === JSON.stringify(expected)) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    ids.should.eql(expected);
}

/**
 * @param {string} memberId - member to reset
 * @returns {Promise<string>} a reset link id for the member
 */
async function resetLink(memberId) {
    const prid = 'tokens-test-' + Date.now() + Math.random().toString(36).slice(2);
    await testUtils.db.collection('password_reset').insertOne({ prid, user_id: testUtils.db.ObjectID(memberId), timestamp: Math.round(Date.now() / 1000) });
    return prid;
}

describe('Password change revokes tokens', function() {
    describe('reset through the dashboard reset page', function() {
        let member;
        let tokens;

        before(async function() {
            member = await createMember();
            tokens = [await otherBrowserToken(member._id), await integrationToken(member.api_key)];
            (await tokensOf(member._id)).should.have.length(2);
            (await apiStatus(tokens[0])).should.equal(200);
            (await apiStatus(tokens[1])).should.equal(200);
        });

        after(async function() {
            await deleteMember(member._id);
        });

        it('resets the password', async function() {
            const prid = await resetLink(member._id);
            const agent = supertest.agent(testUtils.url);
            const page = await agent.get('/reset/' + prid);
            page.status.should.equal(200);
            const res = await agent.post('/reset').type('form').send({ password: NEW_PASSWORD, again: NEW_PASSWORD, prid, _csrf: testUtils.CSRFfromBody(page.text) }).redirects(0);
            res.status.should.equal(302);
            res.headers.location.should.equal('/login');
        });

        it('leaves the member no tokens', async function() {
            (await tokensOf(member._id)).should.have.length(0);
        });

        it('refuses the old tokens on the API', async function() {
            (await apiStatus(tokens[0])).should.equal(400);
            (await apiStatus(tokens[1])).should.equal(400);
        });

        it('refuses the old login token at /login/token', async function() {
            (await tokenLoginLocation(tokens[0])).should.equal('/login?message=login.result');
        });
    });

    describe('self-service change on the dashboard', function() {
        let member;
        let agent;
        let currentToken;
        let others;

        before(async function() {
            member = await createMember();
            agent = supertest.agent(testUtils.url);
            const loginPage = await agent.get('/login');
            const login = await agent.post('/login').type('form').send({ username: member.username, password: PASSWORD, _csrf: testUtils.CSRFfromBody(loginPage.text) }).redirects(0);
            login.status.should.equal(302);
            const own = await tokensOf(member._id);
            own.should.have.length(1);
            currentToken = own[0]._id;
            others = [await otherBrowserToken(member._id), await integrationToken(member.api_key)];
        });

        after(async function() {
            await deleteMember(member._id);
        });

        it('changes the password', async function() {
            const dashboard = await agent.get('/dashboard');
            dashboard.status.should.equal(200);
            const csrf = /"csrf_token":"([^"]+)"/.exec(dashboard.text);
            should.exist(csrf, 'csrf token on the dashboard page');
            const res = await agent.post('/user/settings').type('form').send({
                username: member.username,
                full_name: 'tokens',
                api_key: member.api_key,
                old_pwd: PASSWORD,
                new_pwd: NEW_PASSWORD,
                _csrf: csrf[1],
            });
            res.status.should.equal(200, res.text);
            res.text.should.not.equal('false');
        });

        it('keeps only the current session token', async function() {
            const ids = (await tokensOf(member._id)).map((t) => t._id);
            ids.should.eql([currentToken]);
        });

        it('keeps the current session working', async function() {
            (await apiStatus(currentToken)).should.equal(200);
            const dashboard = await agent.get('/dashboard').redirects(0);
            dashboard.status.should.equal(200);
        });

        it('refuses the other tokens', async function() {
            (await apiStatus(others[0])).should.equal(400);
            (await apiStatus(others[1])).should.equal(400);
            (await tokenLoginLocation(others[0])).should.equal('/login?message=login.result');
        });
    });

    describe('change by an administrator', function() {
        let member;
        let tokens;

        before(async function() {
            member = await createMember();
            tokens = [await otherBrowserToken(member._id), await integrationToken(member.api_key)];
        });

        after(async function() {
            await deleteMember(member._id);
        });

        it('changes the password', async function() {
            const res = await request.get('/i/users/update').query({ api_key: testUtils.get('API_KEY_ADMIN'), args: JSON.stringify({ user_id: member._id, password: NEW_PASSWORD }) });
            res.status.should.equal(200, res.text);
        });

        it('revokes every token the member owns', async function() {
            await untilOnly(member._id, []);
            (await apiStatus(tokens[0])).should.equal(400);
            (await apiStatus(tokens[1])).should.equal(400);
            (await tokenLoginLocation(tokens[0])).should.equal('/login?message=login.result');
        });

        it('signs in with the new password', async function() {
            const agent = supertest.agent(testUtils.url);
            const loginPage = await agent.get('/login');
            const login = await agent.post('/login').type('form').send({ username: member.username, password: NEW_PASSWORD, _csrf: testUtils.CSRFfromBody(loginPage.text) }).redirects(0);
            login.status.should.equal(302);
            login.headers.location.should.equal('/dashboard');
        });
    });

    describe('the same reset link submitted twice at once', function() {
        let member;

        before(async function() {
            member = await createMember();
        });

        after(async function() {
            await deleteMember(member._id);
        });

        it('sets the password once', async function() {
            const prid = await resetLink(member._id);
            const agents = [supertest.agent(testUtils.url), supertest.agent(testUtils.url)];
            const pages = await Promise.all(agents.map((agent) => agent.get('/reset/' + prid)));
            const passwords = ['Tokens-first-p4ss!', 'Tokens-second-p4ss!'];
            const results = await Promise.all(agents.map((agent, i) => agent.post('/reset').type('form')
                .send({ password: passwords[i], again: passwords[i], prid, _csrf: testUtils.CSRFfromBody(pages[i].text) })
                .redirects(0)));
            results.filter((res) => res.headers.location === '/login').should.have.length(1);
            const logins = [];
            for (const password of passwords) {
                const agent = supertest.agent(testUtils.url);
                const loginPage = await agent.get('/login');
                logins.push(await agent.post('/login').type('form').send({ username: member.username, password, _csrf: testUtils.CSRFfromBody(loginPage.text) }).redirects(0));
            }
            logins.filter((res) => res.headers.location === '/dashboard').should.have.length(1);
        });
    });


    describe('locking a member through /i/users/update', function() {
        let member;
        let tokens;

        before(async function() {
            member = await createMember();
            tokens = [await otherBrowserToken(member._id), await integrationToken(member.api_key)];
        });

        after(async function() {
            await deleteMember(member._id);
        });

        it('revokes every token', async function() {
            const res = await request.get('/i/users/update').query({ api_key: testUtils.get('API_KEY_ADMIN'), args: JSON.stringify({ user_id: member._id, locked: true }) });
            res.status.should.equal(200, res.text);
            await untilOnly(member._id, []);
            (await apiStatus(tokens[0])).should.equal(400);
            (await apiStatus(tokens[1])).should.equal(400);
        });
    });


    describe('deleting a member', function() {
        it('revokes every token through /i/users/delete', async function() {
            const member = await createMember();
            const tokens = [await otherBrowserToken(member._id), await integrationToken(member.api_key)];
            await deleteMember(member._id);
            (await tokensOf(member._id)).should.have.length(0);
            for (const token of tokens) {
                (await apiStatus(token)).should.equal(400);
            }
        });
    });
});
