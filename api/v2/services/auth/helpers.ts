export function escapeRegEx(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function nowSec(): number {
    return Math.round(Date.now() / 1000);
}

export function stripPassword(input: unknown): Record<string, unknown> {
    if (typeof input !== 'object' || input === null) {
        return {};
    }

    const clone = { ...input as Record<string, unknown> };

    delete clone.password;

    return clone;
}
