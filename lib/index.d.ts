/**
 * SetMeUp
 */
import * as crypto from "./crypto";
import EventEmitter = require("eventemitter3");
/** Represents a loaded file. */
interface LoadedFile {
    filename: string;
    watching: boolean;
}
/** Represents loading options. */
interface LoadOptions {
    overwrite?: boolean;
    rootKey?: string;
}
/** Main SetMeUp class. */
declare class SetMeUp {
    private static _instance;
    static readonly Instance: SetMeUp;
    /**
     * Returns a new fresh instance of the SetMeUp module.
     * @param doNotLoad Optional, if true will not load settings from file on new instance.
     */
    newInstance(doNotLoad?: boolean): SetMeUp;
    /**
     * Default SetMeUp constructor.
     * @param doNotLoad Optional, if true will not load settings from file on new instance.
     */
    constructor(doNotLoad?: boolean);
    /** The actual settings object. */
    private _settings;
    /** Exposes the settings object to read only. */
    readonly settings: any;
    /** Event emitter */
    events: EventEmitter;
    /** Array of loaded files */
    files: LoadedFile[];
    on(eventName: string, callback: EventEmitter.ListenerFn): void;
    off(eventName: string, callback: EventEmitter.ListenerFn): void;
    /**
     * Load settings from the specified JSON files. If not files are specified, load
     * from the default filenames (settings.default.json, settings.json and settings.ENV.json).
     * @param filenames The filename or array of filenames, using relative or full path.
     * @param options Load options defining if properties should be overwritten, and root settings key.
     * @returns Returns the JSON representation object of the loaded files. Will return null if nothing was loaded.
     */
    load(filenames?: string | string[], options?: LoadOptions): any;
    /**
     * Reset to default settings by clearing values and listeners, and re-calling `load`.
     */
    reset(): void;
    /**
     * Encrypts the specified settings file.
     * @param filename The file to be encrypted.
     * @param options Options cipher, key and IV to be passed to the encryptor.
     */
    encrypt(filename: string, options: crypto.CryptoOptions): void;
    /**
     * Decrypts the specified settings file.
     * @param filename The file to be decrypted.
     * @param options Options cipher, key and IV to be passed to the decryptor.
     */
    decrypt(filename: string, options: crypto.CryptoOptions): void;
    /**
     * Watch loaded settings files for changes by using a file watcher.
     */
    watch(): void;
    /**
     * Unwatch changes on loaded settings files.
     */
    unwatch(): any;
}
declare const _default: SetMeUp;
export = _default;
