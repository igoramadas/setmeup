// SetMeUp: utils.ts

import {cryptoMethod, legacyRegex} from "./cryptohelper"
import {CryptoOptions} from "./types"
import fs from "fs"
import path from "path"

/** @hidden */
let logger = null

/** Keys that could pollute object prototypes if assigned. */
const unsafeKeys = ["__proto__", "constructor", "prototype"]

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
        const mainFile = require.main?.filename ?? process.argv[1]
        const directories = [basepath, process.cwd(), mainFile ? path.dirname(mainFile) : null].filter((directory) => directory != null)
        const found = directories.map((directory) => path.resolve(directory, originalFilename)).find((candidate) => fs.existsSync(candidate))
        if (found) {
            return found
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

    // Found file? Load it.
    if (filename != null) {
        try {
            result = parseJson(fs.readFileSync(filename, {encoding: "utf8"}).replace(/^\uFEFF/, ""))
        } catch (ex) {
            throw new Error(`Can't load ${filename}: ${ex.message}`, {cause: ex})
        }
    }

    // Encrypted file and passed encryption options?
    if (result && result.encrypted) {
        // Ignore if crypto options passed as false.
        if (cryptoOptions === false) {
            return result
        }

        if (logger && hasLegacyValues(result)) {
            logger.warn("SetMeUp.load", filename, `Legacy encryption (enc-) will be deprecated in a future release, please migrate encrypted settings using the CLI: '$ setmeup crypto-migrate ${filename}'`)
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
 * Check if the passed settings have legacy "enc-" encrypted values (deep).
 * @param obj Settings object.
 */
const hasLegacyValues = (obj: any): boolean => {
    return Object.values(obj).some((value) => (isPlainObject(value) ? hasLegacyValues(value) : isString(value) && legacyRegex.test(value as string)))
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
    for (let prop of Object.keys(source ?? {})) {
        if (isUnsafeKey(prop)) continue

        const value = source[prop]
        const exists = Object.hasOwn(target, prop)

        if (isPlainObject(value)) {
            if (!exists || target[prop] === null) {
                target[prop] = {}
            }
            extend(value, target[prop], overwrite)
        } else if (overwrite || !exists) {
            target[prop] = value
        }
    }
}

/**
 * Check if the passed key could pollute object prototypes.
 * @param key Property key.
 */
export const isUnsafeKey = (key: string): boolean => {
    return unsafeKeys.includes(key)
}

/**
 * Check if the passed value is a plain object.
 * @param value Object or value.
 */
export const isPlainObject = (value): boolean => {
    return value != null && value.constructor === Object
}

/**
 * Parse an environment variable value, casting booleans and numbers.
 * Numbers are only cast if they convert back to the exact same string, so values
 * like "007" or very large IDs are kept as strings.
 * @param value The environment variable value.
 */
export const parseEnvValue = (value: string): string | number | boolean => {
    const lower = value.toLowerCase()
    if (lower == "true") return true
    if (lower == "false") return false

    const num = Number(value)
    if (Number.isFinite(num) && String(num) === value) return num

    return value
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
