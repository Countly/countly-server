import { createRequire } from 'module';
import argon2 from 'argon2';
import crypto from 'crypto';
import { escapeRegEx, nowSec } from './helpers.ts';

const require = createRequire(import.meta.url);
const common = require('../../../utils/common.js');

export function isArgon2Hash(hash: string): boolean {
    return Boolean(hash && hash.startsWith('$argon2'));
}

export async function passwordMatchesHash(password: string, storedHash: string): Promise<boolean> {
    const secret = common.config.passwordSecret || "";
    const effectivePassword = password + secret;

    try {
        if (isArgon2Hash(storedHash)) {
            return await argon2.verify(storedHash, effectivePassword);
        }

        const sha1 = crypto.createHmac('sha1', '').update(effectivePassword).digest('hex');
        const sha512 = crypto.createHmac('sha512', '').update(effectivePassword).digest('hex');

        return storedHash === sha1 || storedHash === sha512;
    }
    catch {
        return false;
    }
}

export function updateMemberPassword(id: unknown, hashedPassword: string): Promise<void> {
    return new Promise((resolve, reject) => {
        common.db.collection('members').updateOne(
            { _id: id },
            { $set: { password: hashedPassword, password_changed: nowSec() } },
            function(err: unknown) {
                if (err) {
                    return reject(err);
                }
                resolve();
            }
        );
    });
}

export function updateMemberPasswordWithHistory(
    id: unknown,
    newHash: string,
    oldHash: string,
    rotationLimit: number
): Promise<void> {
    return new Promise((resolve, reject) => {
        common.db.collection('members').updateOne(
            { _id: id },
            {
                $set: { password: newHash, password_changed: nowSec() },
                $push: { password_history: { $each: [oldHash], $slice: -rotationLimit } }
            },
            function(err: unknown) {
                if (err) {
                    return reject(err);
                }
                resolve();
            }
        );
    });
}

export async function verifyCredentials(usernameOrEmail: string, password: string): Promise<any | null> {
    const trimmedUsernameOrEmail = `${usernameOrEmail}`.trim();

    const member = await new Promise<any>((resolve, reject) => {
        common.db.collection('members').findOne(
            {
                $or: [
                    { username: trimmedUsernameOrEmail },
                    { email: { $regex: `^${escapeRegEx(trimmedUsernameOrEmail)}$`, $options: 'i' }}
                ]
            },
            function(err: any, doc: any) {
                if (err) {
                    return reject(err);
                }
                resolve(doc);
            }
        );
    });

    if (!member) {
        return null;
    }

    if (member.locked) {
        const err: any = new Error('User account is locked');
        err.code = 'ACCOUNT_LOCKED';
        throw err;
    }

    const match = await passwordMatchesHash(password, member.password);

    if (!match) {
        return null;
    }

    if (!isArgon2Hash(member.password)) {
        const secret = common.config.passwordSecret || "";
        const argon2Hash = await argon2.hash(password + secret);
        common.db.collection('members').updateOne(
            { _id: member._id },
            { $set: { password: argon2Hash } }
        );
    }

    return member;
}
