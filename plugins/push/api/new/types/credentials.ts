export interface FCMCredentials {
    serviceAccountFile: string;
    type: "fcm";
    hash: string;
}

export interface APNP12Credentials {
    bundle: string;
    cert: string;
    notAfter: Date;
    notBefore: Date;
    secret: string;
    topics: string[];
    type: "apn_universal";
    hash: string;
}

export interface APNP8Credentials {
    bundle: string;
    key: string;
    keyid: string;
    team: string;
    type: "apn_token";
    hash: string;
}

export type APNCredentials = APNP12Credentials | APNP8Credentials;

export interface HMSCredentials {
    app: string;
    secret: string;
    type: "hms";
    hash: string;
}

export type SomeCredential = FCMCredentials | APNCredentials | HMSCredentials;
