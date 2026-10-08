// SetMeUp: types.ts

/**
 * Encryption options used by encrypt() and decrypt().
 */
export interface CryptoOptions {
    /** Cipher used by legacy "enc-" values, default is "aes256". New "enc2-" values always use AES-256-GCM. */
    cipher?: string
    /** Encryption key, default is derived from the current machine ID. */
    key?: string
    /** IV used by legacy "enc-" values, default is "8407198407191984". New "enc2-" values use a random IV per value. */
    iv?: string
}

/**
 * Represents loading from JSON options, used on load().
 */
export interface LoadOptions {
    /** Overwrite current settings with loaded ones? */
    overwrite?: boolean
    /** Root key of settings to be loaded. */
    rootKey?: string
    /** Decryption options in case file is encrypted. */
    crypto?: CryptoOptions | boolean
    /** Delete file after load, useful when running on shared / unsecure environments. */
    destroy?: boolean
}

/**
 * Represents loading from environment options, used on loadFromEnv().
 */
export interface LoadEnvOptions {
    /** Overwrite current settings with loaded ones? */
    overwrite?: boolean
    /** Force environment variables to settings in lowercase? */
    lowercase?: boolean
}

/**
 * Represents a loaded file, used on files.
 */
export interface LoadedFile {
    /** Full path of the loaded settings file. */
    filename: string
    /** True if file is being watched for updates (see watch()). */
    watching: boolean
    /** Options used to load the file, reused when reloading it via watch(). */
    options?: LoadOptions
}
