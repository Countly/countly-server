/**
 * @typedef {import("../../../api/new/types/credentials").APNP12Credentials} APNP12Credentials
 * @typedef {import("../../../api/new/types/credentials").APNP8Credentials} APNP8Credentials
 * @typedef {import("../../../api/new/types/credentials").APNCredentials} APNCredentials
 */
const assert = require("assert");
const path = require("path");
const fsPromise = require("fs/promises");
const { describe, it } = require("mocha");
const { parseP12Certificate } = require("../../../api/new/platforms/ios");

describe("IOS platform", () => {
    describe("credential validator", () => {
        it("should parse a valid p12 certificate without passphrase correctly", async () => {
            const certificate = await fsPromise.readFile(
                path.join(
                    __dirname,
                    "../../mock/certificates/Cert.p12"
                )
            );
            const result = parseP12Certificate(certificate.toString("base64"));
            assert(result.bundle.length > 0);
            assert(result.cert.length > 0);
            assert(result.key.length > 0);
            assert(result.notAfter.getTime() > 0);
            assert(result.notBefore.getTime() > 0);
            assert(result.topics.length > 0);
        });

        it("should fail an invalid p12 certificate", async () => {
            const certificate = await fsPromise.readFile(
                path.join(
                    __dirname,
                    "../../mock/certificates/CertDev.p12"
                )
            );
            assert.throws(
                () => parseP12Certificate(certificate.toString("base64")),
                new Error("Not a universal (Sandbox & Production) certificate")
            );
        });

        it("shouldn't be able to parse a p12 certificate with incorrect secret", async () => {
            const certificate = await fsPromise.readFile(
                path.join(
                    __dirname,
                    "../../mock/certificates/CertWithPassphrase.p12"
                )
            );
            assert.throws(
                () => parseP12Certificate(certificate.toString("base64"), "wrongpassphrase"),
                new Error("PKCS#12 MAC could not be verified. Invalid password?")
            );
        });

        it("should parse a passphrase protected p12 certificate correctly", async () => {
            const certificate = await fsPromise.readFile(
                path.join(
                    __dirname,
                    "../../mock/certificates/CertWithPassphrase.p12"
                )
            );
            const result = parseP12Certificate(certificate.toString("base64"), "tokyo");
            assert(result.bundle.length > 0);
            assert(result.cert.length > 0);
            assert(result.key.length > 0);
            assert(result.notAfter.getTime() > 0);
            assert(result.notBefore.getTime() > 0);
            assert(result.topics.length > 0);
        });
    });
});