import * as crypto from "./crypto";
import EventEmitter = require("eventemitter3");
interface LoadedFile {
    filename: string;
    watching: boolean;
}
interface LoadOptions {
    overwrite?: boolean;
    rootKey?: string;
}
declare class SetMeUp {
    private static _instance;
    static readonly Instance: SetMeUp;
    newInstance(doNotLoad?: boolean): SetMeUp;
    constructor(doNotLoad?: boolean);
    private _settings;
    readonly settings: any;
    events: EventEmitter;
    files: LoadedFile[];
    on(eventName: string, callback: EventEmitter.ListenerFn): void;
    off(eventName: string, callback: EventEmitter.ListenerFn): void;
    load(filenames?: string | string[], options?: LoadOptions): any;
    reset(): void;
    encrypt(filename: string, options: crypto.CryptoOptions): void;
    decrypt(filename: string, options: crypto.CryptoOptions): void;
    watch(): void;
    unwatch(): any;
}
declare const _default: SetMeUp;
export = _default;
