import type { MemberPublic } from '../../../../web/src/shared/types/auth.js';

declare global {
    namespace Express {
        interface Request {
            countlyParams: {
                qstring: Record<string, any>;
                req: import('express').Request;
                res: import('express').Response;
                fullPath: string;
                v2: boolean;
                member: MemberPublic;
                app?: {
                    _id: string;
                    name: string;
                    country: string;
                    timezone: string;
                    type: string;
                    locked?: boolean;
                    plugins?: Record<string, any>;
                };
                app_id?: string;
                app_cc?: string;
                appTimezone?: string;
                time?: any;
                [key: string]: any;
            };
        }
    }
}

export {};