import { ObjectId } from "mongodb";
import { SecureContextOptions } from "node:tls";


export interface FCMCredentials {
    _id: ObjectId;
    serviceAccountFile: string;
    type: "fcm";
    hash: string;
}

export interface APNP12Credentials {
    type: "apn_universal";
    _id: ObjectId;
    cert: string;
    secret: string;
    bundle: string;
    notAfter: Date;
    notBefore: Date;
    topics: string[];
    hash: string;
}

export interface APNP8Credentials {
    type: "apn_token";
    _id: ObjectId;
    bundle: string;
    key: string;
    keyid: string;
    team: string;
    hash: string;
}

export type TLSKeyPair = Required<Pick<SecureContextOptions, "key"|"cert">>;

export type APNCredentials = APNP12Credentials | APNP8Credentials;

export interface HMSCredentials {
    _id: ObjectId;
    app: string;
    secret: string;
    type: "hms";
    hash: string;
}

export type PlatformCredential = FCMCredentials | APNCredentials | HMSCredentials;
