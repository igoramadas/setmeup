import * as crypto from "./crypto";
import EventEmitter = require("eventemitter3");
/** Represents a loaded file. */
interface LoadedFile {
    /** Filename of the loaded settings file. */
    filename: string;
    /** True if file is being watched for updates. */
    watching: boolean;
}
/** Represents loading options. */
interface LoadOptions {
    /** Overwrite current settings with loaded ones? */
    overwrite?: boolean;
    /** Root key of settings to be loaded. */
    rootKey?: string;
    /** Decryption options in case file is encrypted. */
    crypto?: crypto.CryptoOptions | boolean;
}
/** This is the main SetMeUp class. */
declare class SetMeUp {
    private static _instance;
    /** @hidden */
    static readonly Instance: SetMeUp;
    /**
     * Returns a new fresh instance of the SetMeUp module.
     * @param doNotLoad Optional, if true will not load settings from file on new instance.
     * @returns New instance of SetMeUp, with its own settings.
     */
    newInstance(doNotLoad?: boolean): SetMeUp;
    /**
     * Default SetMeUp constructor.
     * @param doNotLoad Optional, if true will not load settings from file on new instance.
     */
    constructor(doNotLoad?: boolean);
    /** Internal, the actual settings storage object. */
    private _settings;
    /** Exposes the settings object as read only. */
    readonly settings: any;
    /** Event emitter. */
    events: EventEmitter;
    /** Array of loaded files. */
    files: LoadedFile[];
    /**
     * Bind callback to event.
     * @param eventName The name of events (load, reset).
     * @param callback Callback function.
     */
    on(eventName: string, callback: EventEmitter.ListenerFn): void;
    /**
     * Unbind callback from event.
     * @param eventName The name of events (load, reset).
     * @param callback Callback function.
     */
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
