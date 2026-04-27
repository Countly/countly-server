export { nowSec } from '../utils/time.ts';

export function escapeRegEx(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripPassword(input: unknown): Record<string, unknown> {
    if (typeof input !== 'object' || input === null) {
        return {};
    }

    const clone = { ...input as Record<string, unknown> };

    delete clone.password;

    return clone;
}
