export interface FCMCredentials {
    serviceAccountFile: string;
    type: string; // fcm
    hash: string;
}

export interface APNP12Credentials {
    bundle: string;
    cert: string;
    notAfter: Date;
    notBefore: Date;
    secret: string;
    topics: string[];
    type: string; // value is "apn_universal" when its APNP12Credentials
    hash: string;
}

export interface APNP8Credentials {
    bundle: string;
    key: string;
    keyid: string;
    team: string;
    type: string; // value is "apn_token" when its APNP8Credentials
    hash: string;
}

export type APNCredentials = APNP12Credentials | APNP8Credentials;

export interface HMSCredentials {
    app: string;
    secret: string;
    type: string; // hms
    hash: string;
}

export type SomeCredential = FCMCredentials | APNCredentials | HMSCredentials;
