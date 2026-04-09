import { createRequire } from 'module';
import express from 'express';
import type { MemberPublic } from '../../../../web/src/shared/types/auth.js';
import type { AppPublic } from '../../../../web/src/shared/types/app.js';
import type { ObjectId } from 'mongodb';

const require = createRequire(import.meta.url);
const common = require('../../utils/common.js');
const { validateUser } = require('../../utils/rights.js');
const log = require('../../utils/log.js')('v2:apps');

interface AppDocument {
    _id: ObjectId;
    name: string;
    key: string;
    category: string;
    country: string;
    timezone: string;
    type: string;
    salt?: string;
    checksum_salt?: string;
    created_at: number;
    edited_at?: number;
    owner: string;
    seq: number;
    has_image: boolean;
    locked?: boolean;
    plugins?: Record<string, any>;
}

const router = express.Router();

// GET /v2/apps - list apps the current user has access to
router.get('/', async(req, _res) => {
    const params = req.countlyParams;

    try {
        await validateUser(params);

        const { member } = params;

        if (member.global_admin) {
            const apps: AppDocument[] = await common.db.collection('apps').find({}).toArray();

            common.returnOutput(params, apps.map((app) => formatApp(app, 'admin')));
        }
        else {
            const adminOfIds = getAdminAppIds(member);
            const userOfIds = getUserAppIds(member);
            const allIds = [...new Set([...adminOfIds, ...userOfIds])];

            const apps: AppDocument[] = await common.db.collection('apps').find({
                _id: { $in: allIds.map((id: string) => common.db.ObjectID(id)) }
            }).toArray();

            common.returnOutput(params, apps.map((app) => {
                const role = adminOfIds.includes(app._id.toString()) ? 'admin' as const : 'user' as const;
                return formatApp(app, role);
            }));
        }
    }
    catch (err) {
        log.e('GET /v2/apps error: %j', err);
    }
});

// GET /v2/apps/:id - get a single app
router.get('/:id', async(req, _res) => {
    const params = req.countlyParams;

    try {
        await validateUser(params);

        const { member } = params;
        const appId = req.params.id;

        if (!hasAccessToApp(member, appId)) {
            return common.returnMessage(params, 403, 'No access to this app');
        }

        const app: AppDocument | null = await common.db.collection('apps').findOne({ _id: common.db.ObjectID(appId) });

        if (!app) {
            return common.returnMessage(params, 404, 'App not found');
        }

        const role = member.global_admin || getAdminAppIds(member).includes(appId) ? 'admin' as const : 'user' as const;
        common.returnOutput(params, formatApp(app, role));
    }
    catch (err) {
        log.e('GET /v2/apps/:id error: %j', err);
    }
});

const formatApp = (app: AppDocument, role: 'admin' | 'user'): AppPublic => ({
    _id: app._id.toString(),
    name: app.name,
    key: app.key,
    type: app.type,
    category: app.category,
    timezone: app.timezone,
    country: app.country,
    salt: app.salt || app.checksum_salt || '',
    created_at: app.created_at,
    role,
});

const getAppIds = (arr: string[]): string[] => {
    if (!arr) {
        return [];
    }

    return arr.map((id) => id.toString());
};

const getAdminAppIds = (member: MemberPublic): string[] =>
    member.permission
        ? getAppIds(member.permission._.a)
        : getAppIds((member as any).admin_of);

const getUserAppIds = (member: MemberPublic): string[] =>
    member.permission
        ? getAppIds(member.permission._.u?.flat())
        : getAppIds((member as any).user_of);

const hasAccessToApp = (member: MemberPublic, appId: string): boolean => {
    if (member.global_admin) {
        return true;
    }

    return getAdminAppIds(member).includes(appId) || getUserAppIds(member).includes(appId);
};

export default router;
