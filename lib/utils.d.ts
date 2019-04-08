import * as crypto from "./crypto";
export declare function getFilePath(filename: string, basepath?: string): string;
export declare function parseJson(value: string | any): any;
export declare function loadJson(filename: string, cryptoOptions?: crypto.CryptoOptions | boolean): any;
export declare function extend(source: any, target: any, overwrite: boolean): any[];
