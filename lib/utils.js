"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("./crypto");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
let logger = null;
let loggerLoaded = false;
function getFilePath(filename, basepath) {
    const originalFilename = filename.toString();
    let hasFile = false;
    if (!loggerLoaded) {
        loggerLoaded = true;
        try {
            logger = require("anyhow");
        }
        catch (ex) {
        }
    }
    if (basepath) {
        filename = path.resolve(basepath, originalFilename);
        hasFile = fs.existsSync(filename);
        if (hasFile) {
            return filename;
        }
    }
    hasFile = fs.existsSync(filename);
    if (hasFile) {
        return filename;
    }
    filename = path.resolve(process.cwd(), originalFilename);
    hasFile = fs.existsSync(filename);
    if (hasFile) {
        return filename;
    }
    filename = path.resolve(path.dirname(require.main.filename), originalFilename);
    hasFile = fs.existsSync(filename);
    if (hasFile) {
        return filename;
    }
    return null;
}
exports.getFilePath = getFilePath;
function parseJson(value) {
    const singleComment = 1;
    const multiComment = 2;
    let insideString = null;
    let insideComment = null;
    let offset = 0;
    let ret = "";
    let strip = () => "";
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
function loadJson(filename, cryptoOptions) {
    let result = null;
    filename = getFilePath(filename);
    if (filename != null) {
        const encUtf8 = { encoding: "utf8" };
        const encAscii = { encoding: "ascii" };
        try {
            result = fs.readFileSync(filename, encUtf8);
            result = parseJson(result);
        }
        catch (ex) {
            result = fs.readFileSync(filename, encAscii);
            result = parseJson(result);
        }
    }
    if (result && result.encrypted) {
        if (cryptoOptions) {
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
