/**
 * Encryption options for [[CryptoMethod]].
 * @protected
 */
export interface CryptoOptions {
    /** Cipher to use, default is "aes256". */
    cipher?: string;
    /** Encryption key, default is derived from current machine via [[getMachineID]]. */
    key?: string;
    /** Encryption IV, default is "8407198407191984". */
    iv?: string;
}
/**
 * Helper to encrypt or decrypt settings files. The default encryption key
 * is derived from the unique machine ID, so ideally you should change to
 * your desired secret and strong key. Same applies for the default IV.
 * You can also  set them via the SMU_CRYPTO_KEY and SMU_CRYPTO_IV
 * environment variables. The default cipher algorithm is AES 256.
 * Failure to encrypt or decrypt will throw an exception.
 * @param action Action can be "encrypt" or "decrypt".
 * @param filename The file to be encrypted or decrypted.
 * @param options Encryption options with cipher, key and IV.
 * @returns The (de)encrypted JSON object.
 * @protected
 */
export declare function CryptoMethod(action: string, filename: string, options?: CryptoOptions): any;
