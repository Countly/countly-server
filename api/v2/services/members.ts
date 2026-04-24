import { createRequire } from 'module';
import type { KillOtherSessionsOptions } from '../../../../web/src/shared/types/auth.js';
import { escapeRegEx } from './auth/helpers.ts';

const require = createRequire(import.meta.url);
const membersUtility = require('../../../frontend/express/libs/members.js');
const common = require('../../utils/common.js');

/**
 * Validates a password against the configured security policy.
 * Returns a localization key describing the failure, or null if the password is valid.
 */
export function validatePassword(password: string): string | null {
    const result = membersUtility.validatePassword(password);

    return result === false ? null : result;
}

/**
 * Invalidates other sessions and LoggedInAuth tokens for the given user.
 * Fire-and-forget: the underlying legacy implementation does not expose a completion signal.
 */
export function killOtherSessionsForUser(options: KillOtherSessionsOptions): void {
    membersUtility.killOtherSessionsForUser(
        options.userId,
        options.currentToken,
        options.currentSessionId,
        common.db
    );
}

export function countMembers(): Promise<number> {
    return new Promise((resolve, reject) => {
        common.db.collection('members').count(
            function(err: unknown, count: number) {
                if (err) {
                    return reject(err);
                }
                resolve(count);
            }
        );
    });
}

export function findMemberByEmail(email: string): Promise<Record<string, unknown> | null> {
    return new Promise((resolve, reject) => {
        common.db.collection('members').findOne(
            { email: { $regex: `^${escapeRegEx(email)}$`, $options: 'i' } },
            function(err: unknown, doc: Record<string, unknown> | null) {
                if (err) {
                    return reject(err);
                }
                resolve(doc);
            }
        );
    });
}

export function findMemberById(id: unknown): Promise<Record<string, unknown> | null> {
    return new Promise((resolve, reject) => {
        common.db.collection('members').findOne(
            { _id: id },
            function(err: unknown, doc: Record<string, unknown> | null) {
                if (err) {
                    return reject(err);
                }
                resolve(doc);
            }
        );
    });
}

export function insertMember(doc: Record<string, unknown>): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        common.db.collection('members').insert(
            doc,
            { safe: true },
            function(err: unknown, result: { ops: Record<string, unknown>[] }) {
                if (err) {
                    return reject(err);
                }
                resolve(result.ops[0]);
            }
        );
    });
}
