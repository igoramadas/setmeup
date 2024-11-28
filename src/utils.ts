// SetMeUp: utils.ts

import {cryptoMethod, CryptoOptions} from "./cryptohelper"
import fs from "fs"
import path from "path"

/** @hidden */
let logger = null

/**
 * Finds the correct path to the file looking first on the (optional) base path
 * then the current or running directory, finally the root directory.
 * Returns null if file is not found.
 * @param filename The filename to be searched
 * @param basepath Optional, basepath where to look for the file.
 * @returns The full path to the file if one was found, or null if not found.
 * @protected
 */
export function getFilePath(filename: string, basepath?: string): string {
    try {
        const originalFilename = filename.toString()
        let hasFile = false

        // A basepath was passed? Try there first.
        if (basepath) {
            filename = path.resolve(basepath, originalFilename)
            hasFile = fs.existsSync(filename)
            /* istanbul ignore else */
            if (hasFile) {
                return filename
            }
        }

        // Try running directory.
        filename = path.resolve(process.cwd(), originalFilename)
        hasFile = fs.existsSync(filename)
        /* istanbul ignore if */
        if (hasFile) {
            return filename
        }

        // Try application root path (CommonJS).
        // @ts-ignore
        if (require.main) {
            // @ts-ignore
            filename = path.resolve(path.dirname(require.main.filename), originalFilename)
            hasFile = fs.existsSync(filename)
            /* istanbul ignore if */
            if (hasFile) {
                return filename
            }
        }

        // Last try.
        hasFile = fs.existsSync(filename)
        /* istanbul ignore if */
        if (hasFile) {
            return filename
        }
    } catch (ex) {
        if (logger) logger.error("SetMeUp.Utils.getFilePath", filename, ex)
    }

    // Nothing found, so return null.
    return null
}

/**
 * Strip comments out of the JSON and returns it as a JSON object.
 * @param value The JSON string or object to be parsed.
 * @returns The parsed JSON object.
 * @protected
 */
export function parseJson(value: string | any) {
    const singleComment = 1
    const multiComment = 2
    let insideString = null
    let insideComment = null
    let offset = 0
    let ret = ""
    let strip = () => ""

    // Make sure value is a string!
    if (!isString(value)) {
        value = value.toString()
    }

    for (let i = 0; i < value.length; i++) {
        const currentChar = value[i]
        const nextChar = value[i + 1]

        if (!insideComment && currentChar === '"') {
            if (!(value[i - 1] === "\\" && value[i - 2] !== "\\")) {
                insideString = !insideString
            }
        }

        if (insideString) {
            continue
        }

        if (!insideComment && currentChar + nextChar === "//") {
            ret += value.slice(offset, i)
            offset = i
            insideComment = singleComment
            i++
        } /* istanbul ignore next */ else if (insideComment === singleComment && currentChar + nextChar === "\r\n") {
            i++
            insideComment = false
            ret += strip()
            offset = i
            continue
        } else if (insideComment === singleComment && currentChar === "\n") {
            insideComment = false
            ret += strip()
            offset = i
        } else if (!insideComment && currentChar + nextChar === "/*") {
            ret += value.slice(offset, i)
            offset = i
            insideComment = multiComment
            i++
            continue
        } else if (insideComment === multiComment && currentChar + nextChar === "*/") {
            i++
            insideComment = false
            ret += strip()
            offset = i + 1
            continue
        }
    }

    let parsed = ret + (insideComment ? strip() : value.substr(offset))
    return JSON.parse(parsed)
}

/**
 * Load the specified file and returns JSON object.
 * @param filename Path to the file that should be loaded.
 * @param cryptoOptions In case file is encrypted, pass the crypto key and IV options.
 * @returns The parsed JSON object.
 * @protected
 */
export function loadFile(filename: string, cryptoOptions?: CryptoOptions | boolean): any {
    let result = null

    // Try loading the anyhow module.
    if (!logger) {
        try {
            logger = require("anyhow")
        } catch (ex) {
            // Anyhow module not found
        }
    }

    // Found file? Load it. Try using UTF8 first, if failed, use ASCII.
    if (filename != null) {
        const encUtf8 = {encoding: "utf8"} as any
        const encAscii = {encoding: "ascii"} as any

        // Try parsing the file with UTF8 first, if fails, try ASCII.
        try {
            result = fs.readFileSync(filename, encUtf8)
            result = parseJson(result)
        } catch (ex) {
            /* istanbul ignore next */
            result = fs.readFileSync(filename, encAscii)
            /* istanbul ignore next */
            result = parseJson(result)
        }
    }

    // Encrypted file and passed encryption options?
    if (result && result.encrypted) {
        // Ignore if crypto options passed as false.
        if (cryptoOptions === false) {
            return result
        }

        /* istanbul ignore else */
        if (cryptoOptions != null) {
            // If crypto options are passed as true, clear its value to use the defaults.
            if (cryptoOptions === true) {
                cryptoOptions = null
            }

            if (logger) logger.debug("SetMeUp.Utils.loadJson", filename, "Will be decrypted")

            result = cryptoMethod("decrypt", filename, cryptoOptions as CryptoOptions)
        }
    }

    return result
}

/**
 * Extends the target object with properties from the source.
 * @param source The source object.
 * @param target The target object.
 * @param overwrite If false it won't set properties that are already defined, default is true.
 * @protected
 */
export function extend(source: any, target: any, overwrite: boolean): void {
    if (overwrite == null || typeof overwrite == "undefined") {
        overwrite = true
    }

    // Iterate object properties (deep).
    for (let prop in source) {
        const value = source[prop]
        if (value && value.constructor === Object) {
            if (target[prop] === null || !(prop in target)) {
                target[prop] = {}
            }
            extend(source[prop], target[prop], overwrite)
        } else if (overwrite || !(prop in target)) {
            target[prop] = source[prop]
        }
    }
}

/**
 * Get the passed object's tag.
 * @param value Object or value.
 */
export const getTag = (value) => {
    const toString = Object.prototype.toString

    if (value == null) {
        return value === undefined ? "[object Undefined]" : "[object Null]"
    }

    return toString.call(value)
}

/**
 * Check if the passed value is an array.
 * @param value Object or value.
 */
export const isArray = (value): boolean => {
    return value && Array.isArray(value)
}

/**
 * Check if the passed value is a string.
 * @param value Object or value.
 */
export const isString = (value): boolean => {
    const type = typeof value
    return type === "string" || (type === "object" && value != null && !Array.isArray(value) && getTag(value) == "[object String]")
}

/**
 * Check if the passed value is a boolean.
 * @param value Object or value.
 */
export const isBoolean = (value): boolean => {
    return typeof value === "boolean"
}

/**
 * Check if the passed value is a number.
 * @param value Object or value.
 */
export const isNumber = (value): boolean => {
    return typeof value === "number" || typeof value === "bigint"
}
