import { ObjectId } from "mongodb";
import { PushError } from "./new/lib/error.ts";
import platforms from "./new/constants/platform-keymap.ts";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const common: import('../../../types/common.d.ts').Common = require('../../../api/utils/common');

const allAppUserFields = [...new Set(
    Object.values(platforms)
        .map(platform => platform.combined)
        .flat()
        .map(combined => `tk${combined}`)
)];

async function reset(ob: any) {
    if (!ob?.appId) {
        return;
    }
    const aid = new ObjectId(ob.appId);
    await Promise.all([
        common.db.collection('messages').deleteMany({app: aid}).catch(() => {}),
        common.db.collection('push').deleteMany({a: aid}).catch(() => {}),
        common.db.collection(`push_${aid}`).drop().catch(() => {}),
        common.db.collection('apps').findOne({_id: aid}).catch(() => {}).then((app: any) => {
            if (app && app.plugins && app.plugins.push) {
                return Promise.all(Object.values(app.plugins.push).map(async(cfg: any) => {
                    if (cfg && cfg._id) {
                        return common.db.collection('creds').deleteOne({_id: cfg._id});
                    }
                }).concat([
                    common.db.collection('apps').updateOne({a: aid}, {$unset: {'plugins.push': 1}}).catch(() => {})
                ]));
            }
        }),
    ]);
}

async function clear(ob: { appId?: string; }) {
    if (!ob?.appId) {
        return;
    }
    const aid = new ObjectId(ob.appId);
    await Promise.all([
        common.db.collection('messages').deleteMany({app: aid}).catch(() => {}),
        common.db.collection(`push_${aid}`).drop().catch(() => {}),
        common.db.collection('push').deleteMany({a: aid}).catch(() => {}),
    ]);
}

async function removeUsers(appId: string | ObjectId, uids: string[], error: string = 'consent') {
    const $unset: Record<string, 1> = Object.fromEntries(allAppUserFields.map(field => [field, 1]));
    await common.db.collection(`app_users${appId}`).updateMany({uid: {$in: uids}}, {$unset});

    if (error === 'consent') {
        await common.db.collection(`push_${appId}`).updateMany({_id: {$in: uids}}, {$set: {tk: {}}});
    }
    else if (error === 'purge') {
        await common.db.collection(`push_${appId}`).deleteMany({_id: {$in: uids}});
    }
    else {
        throw new PushError('Invalid error value in removeUsers');
    }
}

export { reset, clear, removeUsers };
