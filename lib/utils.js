"use strict";
// SetMeUp: utils.ts
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("./crypto");
/** @hidden */
const _ = require("lodash");
/** @hidden */
const fs = require("fs");
/** @hidden */
const path = require("path");
/** @hidden */
let logger = null;
/** @hidden */
let loggerLoaded = false;
/**
 * Finds the correct path to the file looking first on the (optional) base path
 * then the current or running directory, finally the root directory.
 * Returns null if file is not found.
 * @param filename The filename to be searched
 * @param basepath Optional, basepath where to look for the file.
 * @returns The full path to the file if one was found, or null if not found.
 * @protected
 */
function getFilePath(filename, basepath) {
    const originalFilename = filename.toString();
    let hasFile = false;
    // Try loading the anyhow module.
    if (!loggerLoaded) {
        loggerLoaded = true;
        try {
            logger = require("anyhow");
        }
        catch (ex) {
            // Anyhow module not found
        }
    }
    // A basepath was passed? Try there first.
    if (basepath) {
        filename = path.resolve(basepath, originalFilename);
        hasFile = fs.existsSync(filename);
        /* istanbul ignore else */
        if (hasFile) {
            return filename;
        }
    }
    // Try running directory.
    filename = path.resolve(process.cwd(), originalFilename);
    hasFile = fs.existsSync(filename);
    /* istanbul ignore if */
    if (hasFile) {
        return filename;
    }
    // Try application root path.
    filename = path.resolve(path.dirname(require.main.filename), originalFilename);
    hasFile = fs.existsSync(filename);
    /* istanbul ignore if */
    if (hasFile) {
        return filename;
    }
    // Check if correct full path was passed.
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
 * @param value The JSON string or object to be parsed.
 * @returns The parsed JSON object.
 * @protected
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
            if (!(value[i - 1] === "\\" && value[i - 2] !== "\\")) {
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
        } /* istanbul ignore next */
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
 * Load the specified file and returns JSON object.
 * @param filename Path to the file that should be loaded.
 * @param cryptoOptions In case file is encrypted, pass the crypto key and IV options.
 * @returns The parsed JSON object.
 * @protected
 */
function loadJson(filename, cryptoOptions) {
    let result = null;
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
            /* istanbul ignore next */
            result = fs.readFileSync(filename, encAscii);
            /* istanbul ignore next */
            result = parseJson(result);
        }
    }
    // Encrypted file and passed encryption options?
    if (result && result.encrypted) {
        /* istanbul ignore else */
        if (cryptoOptions) {
            // If crypto options are passed as true, clear its value to use the defaults.
            if (cryptoOptions === true) {
                cryptoOptions = null;
            }
            logger.debug("SetMeUp.Utils.loadJson", filename, "Will be decrypted");
            result = crypto.CryptoMethod("decrypt", filename, cryptoOptions);
        }
        else if (logger) {
            logger.warn("SetMeUp.Utils.loadJson", `${filename} appears to be encrypted! Forgot passing 'cryptoOptions' to decrypt?`);
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
 * @protected
 */
function extend(source, target, overwrite) {
    const result = [];
    for (let prop in source) {
        const value = source[prop];
        if (value && value.constructor === Object) {
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
