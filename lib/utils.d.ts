import * as crypto from "./crypto";
/**
 * Finds the correct path to the file looking first on the (optional) base path
 * then the current or running directory, finally the root directory.
 * Returns null if file is not found.
 * @param filename The filename to be searched
 * @param basepath Optional, basepath where to look for the file.
 * @returns The full path to the file if one was found, or null if not found.
 * @protected
 */
export declare function getFilePath(filename: string, basepath?: string): string;
/**
 * Strip comments out of the JSON and returns it as a JSON object.
 * @param value The JSON string or object to be parsed.
 * @returns The parsed JSON object.
 * @protected
 */
export declare function parseJson(value: string | any): any;
/**
 * Load the specified file and returns JSON object.
 * @param filename Path to the file that should be loaded.
 * @param cryptoOptions In case file is encrypted, pass the crypto key and IV options.
 * @returns The parsed JSON object.
 * @protected
 */
export declare function loadJson(filename: string, cryptoOptions?: crypto.CryptoOptions | boolean): any;
/**
 * Extends the target object with properties from the source.
 * @param source The source object.
 * @param target The target object.
 * @param overwrite If false it won't set properties that are already defined, default is true.
 * @protected
 */
export declare function extend(source: any, target: any, overwrite: boolean): any[];
