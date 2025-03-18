import { ObjectId } from "mongodb";
import { SecureContextOptions } from "node:tls";


export interface FCMCredentials {
    _id: ObjectId;
    serviceAccountFile: string;
    type: "fcm";
    hash: string;
}

export interface APNP12Credentials {
    _id: ObjectId;
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
    _id: ObjectId;
    bundle: string;
    key: string;
    keyid: string;
    team: string;
    type: "apn_token";
    hash: string;
}

export type TLSKeyPair = Pick<SecureContextOptions, "key"|"cert">;

export type APNCredentials = APNP12Credentials | APNP8Credentials;

export interface HMSCredentials {
    _id: ObjectId;
    app: string;
    secret: string;
    type: "hms";
    hash: string;
}

export type SomeCredential = FCMCredentials | APNCredentials | HMSCredentials;
