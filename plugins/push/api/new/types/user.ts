import { PlatformCombinedKeys } from "./message";

// contains only the required properties for push
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
