import assert from 'assert';
import path from 'path';
import fsPromise from 'fs/promises';
import { describe, it } from 'mocha';
import { parseP12Certificate } from '../../../api/send/platforms/ios.ts';
import { InvalidCredentials } from '../../../api/lib/error.ts';

const __dirname = import.meta.dirname;

describe("IOS platform", () => {
    describe("Credential validator", () => {
        it("should parse a valid p12 certificate without passphrase correctly", async() => {
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

        it("should fail an invalid p12 certificate", async() => {
            const certificate = await fsPromise.readFile(
                path.join(
                    __dirname,
                    "../../mock/certificates/CertDev.p12"
                )
            );
            assert.throws(
                () => parseP12Certificate(certificate.toString("base64")),
                new InvalidCredentials("Not a universal (Sandbox & Production) certificate")
            );
        });

        it("shouldn't be able to parse a p12 certificate with incorrect secret", async() => {
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

        it("should parse a passphrase protected p12 certificate correctly", async() => {
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
