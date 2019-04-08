/** Encryption options. */
export interface CryptoOptions {
    cipher: string;
    key: string;
    iv: string;
}
/**
 * Helper to encrypt or decrypt settings files. The default encryption key
 * is derived from the unique machine ID, so ideally you should change to
 * your desired secret and strong key. Same applies for the default IV.
 * You can also  set them via the SETMEUP_CRYPTOKEY and SETMEUP_CRYPTOIV
 * environment variables. The default cipher algorithm is AES 256.
 * Failure to encrypt or decrypt will throw an exception.
 * @param action Action can be "encrypt" or "decrypt".
 * @param filename The file to be encrypted or decrypted.
 * @param options Encryption options with cipher, key and IV.
 * @returns The (de)encrypted JSON object.
 * @protected
 */
export declare function CryptoMethod(action: string, filename: string, options?: CryptoOptions): any;
