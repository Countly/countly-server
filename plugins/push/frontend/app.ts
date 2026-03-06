import PLATFORM_KEYMAP from "../api/new/constants/platform-keymap.ts";
import { createRequire } from 'module';
import type { Db } from "mongodb";
import type { Application } from "express"

const require = createRequire(import.meta.url);
const common: import('../../../types/common.d.ts').Common = require('../../../api/utils/common.js');
const log = common.log('push:frontend');
const platformEnvCombinedKeys = Object.values(PLATFORM_KEYMAP).map(k => k.combined).flat();

export async function init(_app: Application, db: Db) {
    log.d('Ensuring messages index');

    try {
        await db.collection('messages').createIndexes([
            {
                name: 'main',
                key: {
                    app: 1,
                    state: 1,
                    'trigger.kind': 1,
                    'trigger.start': 1
                }
            },
        ]);
    }
    catch(_err){
        // ignore errors
    }

    const apps = await db.collection('apps').find().toArray();
    for (let i = 0; i < apps.length; i++) {
        const appId = apps[i]._id;
        try {
            await db.collection(`app_users${appId}`).createIndexes(
                platformEnvCombinedKeys.map(
                    key => ({
                        name: 'tk' + key,
                        key: { ['tk' + key]: 1 },
                        sparse: true
                    })
                )
            );
        }
        catch(_err) {
            // ignore errors
        }
    }
}