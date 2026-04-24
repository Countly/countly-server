import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const common = require('../../../utils/common.js');

// TODO: make this value configurable in setting security tab once the page is added to the new dashboard
export const PASSWORD_RESET_TTL_SECONDS = 600;

export function findResetToken(prid: string): Promise<Record<string, unknown> | null> {
    return new Promise((resolve, reject) => {
        common.db.collection('password_reset').findOne(
            { prid },
            function(err: unknown, doc: Record<string, unknown> | null) {
                if (err) {
                    return reject(err);
                }
                resolve(doc);
            }
        );
    });
}

export function insertResetToken(prid: string, userId: unknown, timestamp: number): Promise<void> {
    return new Promise((resolve, reject) => {
        common.db.collection('password_reset').insert(
            { prid, user_id: userId, timestamp },
            { safe: true },
            function(err: unknown) {
                if (err) {
                    return reject(err);
                }
                resolve();
            }
        );
    });
}

export function removeResetToken(prid: string): void {
    common.db.collection('password_reset').remove({ prid }, function() {});
}
