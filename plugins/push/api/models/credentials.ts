import { z } from "zod";
import { ObjectId } from "mongodb";
import { SecureContextOptions } from "node:tls";

// ---------------------------------------------------------------------------
// ObjectId helper
// ---------------------------------------------------------------------------

const ObjectIdSchema = z.instanceof(ObjectId);

// ---------------------------------------------------------------------------
// FCM
// ---------------------------------------------------------------------------

export const FCMCredentialsSchema = z.object({
    _id: ObjectIdSchema,
    type: z.literal("fcm"),
    serviceAccountFile: z.string(),
    hash: z.string(),
});
export type FCMCredentials = z.infer<typeof FCMCredentialsSchema>;

export const RawFCMCredentialsSchema = z.object({
    type: z.literal("fcm"),
    serviceAccountFile: z.string(),
});
export type RawFCMCredentials = z.infer<typeof RawFCMCredentialsSchema>;

// ---------------------------------------------------------------------------
// APN P12
// ---------------------------------------------------------------------------

export const APNP12CredentialsSchema = z.object({
    _id: ObjectIdSchema,
    type: z.literal("apn_universal"),
    cert: z.string(),
    secret: z.string(),
    bundle: z.string(),
    notAfter: z.date(),
    notBefore: z.date(),
    topics: z.array(z.string()),
    hash: z.string(),
});
export type APNP12Credentials = z.infer<typeof APNP12CredentialsSchema>;

export const RawAPNP12CredentialsSchema = z.object({
    type: z.literal("apn_universal"),
    cert: z.string(),
    secret: z.string(),
    fileType: z.literal("p12").optional(),
});
export type RawAPNP12Credentials = z.infer<typeof RawAPNP12CredentialsSchema>;

// ---------------------------------------------------------------------------
// APN P8
// ---------------------------------------------------------------------------

export const APNP8CredentialsSchema = z.object({
    _id: ObjectIdSchema,
    type: z.literal("apn_token"),
    bundle: z.string(),
    key: z.string(),
    keyid: z.string(),
    team: z.string(),
    hash: z.string(),
});
export type APNP8Credentials = z.infer<typeof APNP8CredentialsSchema>;

export const RawAPNP8CredentialsSchema = z.object({
    type: z.literal("apn_token"),
    bundle: z.string(),
    key: z.string(),
    keyid: z.string(),
    team: z.string(),
    fileType: z.literal("p8").optional(),
});
export type RawAPNP8Credentials = z.infer<typeof RawAPNP8CredentialsSchema>;

// ---------------------------------------------------------------------------
// APN (union)
// ---------------------------------------------------------------------------

export const APNCredentialsSchema = z.discriminatedUnion("type", [
    APNP12CredentialsSchema,
    APNP8CredentialsSchema,
]);
export type APNCredentials = z.infer<typeof APNCredentialsSchema>;

export const RawAPNCredentialsSchema = z.discriminatedUnion("type", [
    RawAPNP12CredentialsSchema,
    RawAPNP8CredentialsSchema,
]);
export type RawAPNCredentials = z.infer<typeof RawAPNCredentialsSchema>;

// ---------------------------------------------------------------------------
// TLSKeyPair (plain type — depends on node:tls SecureContextOptions)
// ---------------------------------------------------------------------------

export type TLSKeyPair = Required<Pick<SecureContextOptions, "key" | "cert">>;

// ---------------------------------------------------------------------------
// HMS
// ---------------------------------------------------------------------------

export const HMSCredentialsSchema = z.object({
    _id: ObjectIdSchema,
    type: z.literal("hms"),
    app: z.string(),
    secret: z.string(),
    hash: z.string(),
});
export type HMSCredentials = z.infer<typeof HMSCredentialsSchema>;

export const RawHMSCredentialsSchema = z.object({
    type: z.literal("hms"),
    app: z.string(),
    secret: z.string(),
});
export type RawHMSCredentials = z.infer<typeof RawHMSCredentialsSchema>;

// ---------------------------------------------------------------------------
// PlatformCredential (union)
// ---------------------------------------------------------------------------

export const PlatformCredentialSchema = z.discriminatedUnion("type", [
    FCMCredentialsSchema,
    APNP12CredentialsSchema,
    APNP8CredentialsSchema,
    HMSCredentialsSchema,
]);
export type PlatformCredential = z.infer<typeof PlatformCredentialSchema>;
