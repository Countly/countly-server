import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const preventBruteforce = require('../../../../frontend/express/libs/preventBruteforce.js');

export function isBruteforceBlocked(username: string): Promise<{ blocked: boolean; fails: number }> {
    return new Promise((resolve) => {
        preventBruteforce.isBlocked("login", username, function(blocked: boolean, fails: number) {
            resolve({ blocked, fails });
        });
    });
}

export function isForgotBlocked(ip: string | undefined): Promise<{ blocked: boolean; fails: number }> {
    if (!ip) {
        return Promise.resolve({ blocked: false, fails: 0 });
    }

    return new Promise((resolve) => {
        preventBruteforce.isBlocked("forgot", ip, function(blocked: boolean, fails: number) {
            resolve({ blocked, fails });
        });
    });
}

export function recordFailedLogin(username: string): void {
    preventBruteforce.fail("login", username);
}

export function recordForgotFail(ip: string | undefined): void {
    preventBruteforce.fail("forgot", ip || 'Undefined IP');
}

export function resetFailedLogins(username: string): void {
    preventBruteforce.reset("login", username);
}
