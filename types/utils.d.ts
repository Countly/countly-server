/**
 * Module for common utility functions separated from common module
 * Provides encryption and decryption functions using configurable algorithms
 */

/**
 * Encrypts text using specified algorithm and key
 * @param text - The text to encrypt
 * @param key - Encryption key (defaults to config.encryption.key)
 * @param iv - Initialization vector (defaults to random bytes)
 * @param algorithm - Encryption algorithm (defaults to config.encryption.algorithm)
 * @param input_encoding - Input text encoding (defaults to config.encryption.input_encoding)
 * @param output_encoding - Output encoding (defaults to config.encryption.output_encoding)
 * @returns Encrypted string
 */
export declare function encrypt(text: string, key?: string, iv?: string | Buffer, algorithm?: string, input_encoding?: string, output_encoding?: string): string;

/**
 * Decrypts encrypted text using specified algorithm and key
 * @param crypted - The encrypted text to decrypt
 * @param key - Decryption key (defaults to config.encryption.key)
 * @param iv - Initialization vector (extracted from encrypted string if not provided)
 * @param algorithm - Decryption algorithm (defaults to config.encryption.algorithm)
 * @param input_encoding - Input encoding (defaults to config.encryption.output_encoding)
 * @param output_encoding - Output text encoding (defaults to config.encryption.input_encoding)
 * @returns Decrypted string
 */
export declare function decrypt(crypted: string, key?: string, iv?: string | Buffer, algorithm?: string, input_encoding?: string, output_encoding?: string): string;

/**
 * Decrypts text using legacy decryption method
 * @param crypted - The encrypted text to decrypt
 * @param key - Decryption key (defaults to config.encryption.key)
 * @param iv - Initialization vector
 * @param algorithm - Decryption algorithm (defaults to config.encryption.algorithm)
 * @param input_encoding - Input encoding
 * @param output_encoding - Output text encoding
 * @returns Decrypted string
 */
export declare function decrypt_old(crypted: string, key?: string, iv?: string, algorithm?: string, input_encoding?: string, output_encoding?: string): string;
