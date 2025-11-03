import { PlatformCombinedKeys } from "./message";

// contains only the required properties. other ones are denoted with "[key: string]: any". which are
// only populated from app_user to be used inside the template.
export interface User {
    [key: string]: any;
    _id: string;
    uid: string;
    did: string;
    la?: string;
    tz?: string;
    tk?: TokenRecord[]; // populated from push_{APPID}
}

// document from push_{APPID}
export interface TokenRecord {
    _id: string; // matches with User.uid
    tk: {
        [key in PlatformCombinedKeys]?: string;
    }
}
