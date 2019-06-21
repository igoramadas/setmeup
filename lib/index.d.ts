import * as crypto from "./crypto";
import EventEmitter = require("eventemitter3");
/**
 * Represents a loaded file, used on [[files]].
 */
interface LoadedFile {
    /** Filename of the loaded settings file. */
    filename: string;
    /** True if file is being watched for updates (see [[watch]]). */
    watching: boolean;
}
/**
 * Represents loading from JSON options, used on [[load]].
 */
interface LoadOptions {
    /** Overwrite current settings with loaded ones? */
    overwrite?: boolean;
    /** Root key of settings to be loaded. */
    rootKey?: string;
    /** Decryption options in case file is encrypted. */
    crypto?: crypto.CryptoOptions | boolean;
}
/**
 * Represents loading from environment options, used on [[loadFromEnv]].
 */
interface LoadEnvOptions {
    /** Overwrite current settings with loaded ones? */
    overwrite?: boolean;
    /** Force environment variables to settings in lowercase? */
    lowercase?: boolean;
}
/**
 * This is the main SetMeUp class.
 * * @example const setmeup = require("setmeup")
 */
declare class SetMeUp {
    private static _instance;
    /** @hidden */
    static readonly Instance: SetMeUp;
    /**
     * Returns a new fresh instance of the SetMeUp module.
     * @param doNotLoad Optional, if true will not load settings from file on new instance.
     * @returns New instance of SetMeUp with its own fresh settings.
     */
    newInstance(doNotLoad?: boolean): SetMeUp;
    /**
     * Default SetMeUp constructor.
     * @param doNotLoad Optional, if true will not auto load settings from files and environment variables.
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
     * Bind callback to event. Shortcut to `events.on()`.
     * @param eventName The name of the event ([[load]], [[reset]]).
     * @param callback Callback function.
     */
    on(eventName: string, callback: EventEmitter.ListenerFn): void;
    /**
     * Bind callback to event that will be triggered only once. Shortcut to `events.once()`.
     * @param eventName The name of the event.
     * @param callback Callback function.
     */
    once(eventName: string, callback: EventEmitter.ListenerFn): void;
    /**
     * Unbind callback from event. Shortcut to `events.off()`.
     * @param eventName The name of the event ([[load]], [[reset]]).
     * @param callback Callback function.
     */
    off(eventName: string, callback: EventEmitter.ListenerFn): void;
    /**
     * Load settings from the specified JSON file(s). If not files are specified, load
     * from the defaults (settings.default.json, settings.json and settings.NODE_ENV.json).
     * @param filenames The filename or array of filenames, using relative or full path.
     * @param options Load options defining if properties should be overwritten, and root settings key.
     * @returns Returns the resulting JSON object of the loaded files, or null if nothing was loaded.
     * @event load
     */
    load(filenames?: string | string[], options?: LoadOptions): any;
    /**
     * Load settings from environment variables, restricting to the passed prefix.
     * Enviroment settings as variables will be split by underscore to define its tree.
     * @param prefix The prefix use to match relevant environment variables. Default is "SMU_", should always end with "_" (underscore).
     * @param options Load options defining if properties should be overwritten and forced to lowercase.
     * @event loadFromEnv
     */
    loadFromEnv(prefix?: string, options?: LoadEnvOptions): any;
    /**
     * Reset to default settings by unwatching and clearing all settings.
     * Ideally you should call [[load]] / [[loadFromEnv]] after resetting,
     * otherwise it will most certainly break your application.
     * @event reset
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
     * When files change, [[load]] will be called to get the updates.
     */
    watch(): void;
    /**
     * Unwatch changes on loaded settings files.
     */
    unwatch(): any;
}
declare const _default: SetMeUp;
export = _default;
