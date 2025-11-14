import { ObjectId } from "mongodb";
import { SecureContextOptions } from "node:tls";

export interface FCMCredentials {
    _id: ObjectId;
    type: "fcm";
    serviceAccountFile: string;
    hash: string;
}

export type UnvalidatedFCMCredentials = Omit<FCMCredentials, "_id" | "hash">;

export interface APNP12Credentials {
    _id: ObjectId;
    type: "apn_universal";
    cert: string;
    secret: string;
    bundle: string;
    notAfter: Date;
    notBefore: Date;
    topics: string[];
    hash: string;
}

export type UnvalidatedAPNP12Credentials = Omit<APNP12Credentials, "_id" | "bundle" | "notAfter" | "notBefore" | "topics" | "hash"> & { fileType?: "p12" };

export interface APNP8Credentials {
    _id: ObjectId;
    type: "apn_token";
    bundle: string;
    key: string;
    keyid: string;
    team: string;
    hash: string;
}

export type UnvalidatedAPNP8Credentials = Omit<APNP8Credentials, "_id" | "hash"> & { fileType?: "p8" };

export type APNCredentials = APNP12Credentials | APNP8Credentials;

export type UnvalidatedAPNCredentials = UnvalidatedAPNP12Credentials | UnvalidatedAPNP8Credentials;

export type TLSKeyPair = Required<Pick<SecureContextOptions, "key"|"cert">>;

export interface HMSCredentials {
    _id: ObjectId;
    type: "hms";
    app: string;
    secret: string;
    hash: string;
}

export type UnvalidatedHMSCredentials = Omit<HMSCredentials, "_id" | "hash"> ;

export type PlatformCredential = FCMCredentials | APNCredentials | HMSCredentials;
