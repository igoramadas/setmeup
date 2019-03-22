"use strict";
/*/*
 * SetMeUp: Utils
 */
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
/**
 * Finds the correct path to the file looking first on the (optional) base path
 * then the current or running directory, finally the root directory.
 * Returns null if file is not found.
 * @param filename The filename to be searched
 * @param basepath Optional, basepath where to look for the file.
 * @returns The full path to the file if one was found, or null if not found.
 */
function getFilePath(filename, basepath) {
    const originalFilename = filename.toString();
    let hasFile = false;
    // A basepath was passed? Try there first.
    if (basepath) {
        filename = path.resolve(basepath, originalFilename);
        hasFile = fs.existsSync(filename);
        if (hasFile) {
            return filename;
        }
    }
    // Check if correct full path was passed.
    hasFile = fs.existsSync(filename);
    if (hasFile) {
        return filename;
    }
    // Try running directory.
    filename = path.resolve(process.cwd(), originalFilename);
    hasFile = fs.existsSync(filename);
    if (hasFile) {
        return filename;
    }
    // Try application root path.
    filename = path.resolve(path.dirname(require.main.filename), originalFilename);
    hasFile = fs.existsSync(filename);
    if (hasFile) {
        return filename;
    }
    // Nothing found, so return null.
    return null;
}
exports.getFilePath = getFilePath;
/**
 * Strip comments out of the JSON and returns it as a JSON object.
 * @param value - The JSON string to be parsed.
 * @returns The parsed JSON object.
 */
function parseJson(value) {
    const singleComment = 1;
    const multiComment = 2;
    let insideString = null;
    let insideComment = null;
    let offset = 0;
    let ret = "";
    let strip = () => "";
    // Make sure value is a string!
    if (!_.isString(value)) {
        value = value.toString();
    }
    for (let i = 0; i < value.length; i++) {
        const currentChar = value[i];
        const nextChar = value[i + 1];
        if (!insideComment && currentChar === '"') {
            const escaped = value[i - 1] === "\\" && value[i - 2] !== "\\";
            if (!escaped) {
                insideString = !insideString;
            }
        }
        if (insideString) {
            continue;
        }
        if (!insideComment && currentChar + nextChar === "//") {
            ret += value.slice(offset, i);
            offset = i;
            insideComment = singleComment;
            i++;
        }
        else if (insideComment === singleComment && currentChar + nextChar === "\r\n") {
            i++;
            insideComment = false;
            ret += strip();
            offset = i;
            continue;
        }
        else if (insideComment === singleComment && currentChar === "\n") {
            insideComment = false;
            ret += strip();
            offset = i;
        }
        else if (!insideComment && currentChar + nextChar === "/*") {
            ret += value.slice(offset, i);
            offset = i;
            insideComment = multiComment;
            i++;
            continue;
        }
        else if (insideComment === multiComment && currentChar + nextChar === "*/") {
            i++;
            insideComment = false;
            ret += strip();
            offset = i + 1;
            continue;
        }
    }
    let parsed = ret + (insideComment ? strip() : value.substr(offset));
    return JSON.parse(parsed);
}
exports.parseJson = parseJson;
/**
 * Strip comments out of the JSON and returns it as a JSON object.
 * @param value - The JSON string to be parsed.
 * @returns The parsed JSON object.
 */
function loadJson(filename) {
    let result = null;
    filename = getFilePath(filename);
    // Found file? Load it. Try using UTF8 first, if failed, use ASCII.
    if (filename != null) {
        const encUtf8 = { encoding: "utf8" };
        const encAscii = { encoding: "ascii" };
        // Try parsing the file with UTF8 first, if fails, try ASCII.
        try {
            result = fs.readFileSync(filename, encUtf8);
            result = parseJson(result);
        }
        catch (ex) {
            result = fs.readFileSync(filename, encAscii);
            result = parseJson(result);
        }
    }
    return result;
}
exports.loadJson = loadJson;
/**
 * Extends the target object with properties from the source.
 * @param source The source object.
 * @param target The target object.
 * @param overwrite If false it won't set properties that are already defined, default is true.
 */
function extend(source, target, overwrite) {
    const result = [];
    for (let prop in source) {
        const value = source[prop];
        if ((value != null ? value.constructor : undefined) === Object) {
            if (target[prop] == null) {
                target[prop] = {};
            }
            result.push(this.extend(source[prop], target[prop], overwrite));
        }
        else if (!overwrite || target[prop] == null) {
            result.push((target[prop] = source[prop]));
        }
        else {
            result.push(undefined);
        }
    }
    return result;
}
exports.extend = extend;
