/**
 * Finds the correct path to the file looking first on the (optional) base path
 * then the current or running directory, finally the root directory.
 * Returns null if file is not found.
 * @param filename The filename to be searched
 * @param basepath Optional, basepath where to look for the file.
 * @returns The full path to the file if one was found, or null if not found.
 */
export declare function getFilePath(filename: string, basepath?: string): string;
/**
 * Strip comments out of the JSON and returns it as a JSON object.
 * @param value - The JSON string to be parsed.
 * @returns The parsed JSON object.
 */
export declare function parseJson(value: string | any): any;
/**
 * Strip comments out of the JSON and returns it as a JSON object.
 * @param value - The JSON string to be parsed.
 * @returns The parsed JSON object.
 */
export declare function loadJson(filename: string): any;
/**
 * Extends the target object with properties from the source.
 * @param source The source object.
 * @param target The target object.
 * @param overwrite If false it won't set properties that are already defined, default is true.
 */
export declare function extend(source: any, target: any, overwrite: boolean): any[];
