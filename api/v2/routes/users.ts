import { createRequire } from 'module';
import express from 'express';

const require = createRequire(import.meta.url);
const common = require('../../utils/common.js');
const { validateUser } = require('../../utils/rights.js');
const log = require('../../utils/log.js')('v2:users');

const router = express.Router();

router.get('/me', async(req, _res) => {
    const params = req.countlyParams;

    try {
        await validateUser(params);

        const { member } = params;

        common.returnOutput(params, {
            _id: member._id.toString(),
            full_name: member.full_name,
            username: member.username,
            email: member.email,
            global_admin: member.global_admin === true,
            lang: member.lang,
            api_key: member.api_key,
            permission: member.permission
        });
    }
    catch (err) {
        log.e('GET /v2/users/me error: %j', err);
    }
});

export default router;