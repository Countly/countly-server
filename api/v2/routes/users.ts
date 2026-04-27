import { createRequire } from 'module';
import express from 'express';

const require = createRequire(import.meta.url);
const common = require('../../utils/common.js');
const { validateUser } = require('../../utils/rights.js');
const log = require('../../utils/log.js')('v2:users');

// Mirrors AVAILABLE_LOCALES on the frontend (web/src/i18n.ts).
const ALLOWED_LANGS = ['en', 'tr', 'cs'] as const;
type AllowedLang = (typeof ALLOWED_LANGS)[number];

const router = express.Router();

function formatMember(member: any, langOverride?: string) {
    return {
        _id: member._id.toString(),
        full_name: member.full_name,
        username: member.username,
        email: member.email,
        global_admin: member.global_admin === true,
        lang: langOverride ?? member.lang,
        api_key: member.api_key,
        permission: member.permission,
    };
}

router.get('/me', async(req, _res) => {
    const params = req.countlyParams;

    try {
        await validateUser(params);
        const { member } = params;

        common.returnOutput(params, formatMember(member));
    }
    catch (err) {
        log.e('GET /v2/users/me error: %j', err);
    }
});

router.patch('/me', async(req, _res) => {
    const params = req.countlyParams;

    try {
        await validateUser(params);
        const { member } = params;

        const body = (req.body || {}) as { lang?: unknown };

        // Whitelist: only `lang` is mutable through this endpoint for now.
        // Reject any unrecognized field so future additions are explicit.
        const allowedKeys = new Set(['lang']);
        const unknownKeys = Object.keys(body).filter((k) => !allowedKeys.has(k));

        if (unknownKeys.length > 0) {
            return common.returnMessage(params, 400, `Unknown field(s): ${unknownKeys.join(', ')}`);
        }

        const updates: Record<string, unknown> = {};

        if ('lang' in body) {
            if (typeof body.lang !== 'string' || !ALLOWED_LANGS.includes(body.lang as AllowedLang)) {
                return common.returnMessage(params, 400, `Invalid lang code; expected one of: ${ALLOWED_LANGS.join(', ')}`);
            }
            updates.lang = body.lang;
        }

        if (Object.keys(updates).length === 0) {
            return common.returnMessage(params, 400, 'No updateable fields provided');
        }

        await new Promise<void>((resolve, reject) => {
            common.db.collection('members').updateOne(
                { _id: member._id },
                { $set: updates },
                (err: unknown) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                }
            );
        });

        common.returnOutput(params, formatMember(member, updates.lang as string | undefined));
    }
    catch (err) {
        log.e('PATCH /v2/users/me error: %j', err);
    }
});

export default router;