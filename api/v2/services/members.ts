import { createRequire } from 'module';
import type { KillOtherSessionsOptions } from '../../../../web/src/shared/types/auth.js';

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
