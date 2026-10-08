// SetMeUp: cryptohelper.ts

import {execSync} from "child_process"
import {CryptoOptions} from "./types"
import {isArray, isBoolean, isNumber, isPlainObject, isString, loadFile} from "./utils"
import crypto from "crypto"

export type {CryptoOptions}

/** Default IV value for legacy "enc-" values in case one is not provided. */
let defaultIV = "8407198407191984"
/** @hidden */
let env = process.env
/** @hidden */
let logger = null
/** @hidden */
let loggerLoaded = false

/** Salt used to derive "enc2-" keys, the key itself is expected to have enough entropy. */
const keySalt = "SetMeUp-enc2"
/** Derived "enc2-" keys cache, as scrypt is expensive. */
const derivedKeys: Map<string, Buffer> = new Map()

/** Matches AES-256-GCM values with a random IV. */
const enc2Regex = /^enc2-[asn]:[0-9a-f]{24}:[0-9a-f]{32}:(?:[0-9a-f]{2})*$/
/** Matches legacy AES-256-CBC values with a static IV. */
export const legacyRegex = /^enc-[asn]:(?:[0-9a-f]{2})+$/

/**
 * Supported crypto actions.
 */
export type CryptoAction = "encrypt" | "decrypt"

/**
 * Helper to encrypt or decrypt settings files. The default encryption key
 * is derived from the unique machine ID, so ideally you should change to
 * your desired secret and strong key. Same applies for the default IV.
 * You can also  set them via the SMU_CRYPTO_KEY and SMU_CRYPTO_IV
 * environment variables. The default cipher algorithm is AES 256.
 * Failure to encrypt or decrypt will throw an exception.
 * New values are encrypted as "enc2-" (AES-256-GCM, random IV per value, key derived
 * via scrypt). Legacy "enc-" values can still be decrypted.
 * @param action Action can be "encrypt" or "decrypt".
 * @param source The file to be encrypted or decrypted, or its already loaded JSON (modified in place).
 * @param options Encryption options with cipher, key and IV.
 * @returns The (de)encrypted JSON object.
 * @protected
 */
export function cryptoMethod(action: CryptoAction | string, source: string | any, options?: CryptoOptions): any {
    if (options == null) {
        options = {} as CryptoOptions
    }

    // Try loading the anyhow module.
    if (!loggerLoaded) {
        loggerLoaded = true

        try {
            logger = require("anyhow")
        } catch (ex) {
            // Anyhow module not found
        }
    }

    action = action.toString().toLowerCase()

    if (!["encrypt", "decrypt"].includes(action)) {
        throw new Error(`Invalid crypto action: ${action}`)
    }

    // Set default options.
    const defaults = {
        cipher: env["SMU_CRYPTO_CIPHER"] || "aes256",
        key: env["SMU_CRYPTO_KEY"],
        iv: env["SMU_CRYPTO_IV"]
    }
    options = Object.assign(defaults, options)

    // No encryption key specified? Use the Machine ID then.
    if (!options.key) {
        options.key = getMachineID()
    }

    // No IV specified? Use default (set on top of this file).
    if (!options.iv) {
        options.iv = defaultIV
    }

    const settingsJson = isString(source) ? loadFile(source, false) : source

    // Settings file not found or invalid? Stop here.
    if (settingsJson == null) {
        throw new Error("Can't (de)encrypt, settings file not found or empty")
    }

    // Derive the "enc2-" key from the passed key, so keys of any length can be used.
    const getKey = (): Buffer => {
        if (!derivedKeys.has(options.key)) {
            derivedKeys.set(options.key, crypto.scryptSync(options.key, keySalt, 32))
        }
        return derivedKeys.get(options.key)
    }

    // Encrypt a value as "enc2-type:iv:tag:data", the type is authenticated so it can't be swapped.
    const encryptValue = (value: any): string => {
        const type = isArray(value) ? "a" : isNumber(value) ? "n" : "s"
        const data = type == "a" ? JSON.stringify(value, null, 0) : value.toString()
        const iv = crypto.randomBytes(12)
        const c = crypto.createCipheriv("aes-256-gcm", getKey(), iv)
        c.setAAD(Buffer.from(type))
        const encrypted = Buffer.concat([c.update(data, "utf8"), c.final()])

        return `enc2-${type}:${iv.toString("hex")}:${c.getAuthTag().toString("hex")}:${encrypted.toString("hex")}`
    }

    // Decrypt a "enc2-" or legacy "enc-" value, casting it back to its original type.
    const decryptValue = (value: string): any => {
        const [prefix, ...parts] = value.split(":")
        const type = prefix.split("-")[1]
        let decrypted: string

        if (enc2Regex.test(value)) {
            const [iv, tag, data] = parts
            const c = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "hex"), {authTagLength: 16})
            c.setAAD(Buffer.from(type))
            c.setAuthTag(Buffer.from(tag, "hex"))
            decrypted = c.update(data, "hex", "utf8") + c.final("utf8")
        } else {
            const c = crypto.createDecipheriv(options.cipher, options.key, options.iv)
            decrypted = c.update(parts[0], "hex", "utf8") + c.final("utf8")
        }

        if (type == "a") return JSON.parse(decrypted)
        if (type == "n") return parseFloat(decrypted)
        return decrypted
    }

    // Helper to parse and encrypt / decrypt settings data.
    let parser = (obj) => {
        for (let prop in obj) {
            const value = obj[prop]

            if (isPlainObject(value)) {
                parser(value)
                continue
            }

            const isLegacy = isString(value) && legacyRegex.test(value)
            const isEnc2 = isString(value) && enc2Regex.test(value)

            try {
                if (action == "encrypt") {
                    // Do not consider booleans, as it would be easy to guess
                    // the key based on true / false.
                    if (value !== null && !isBoolean(value) && !isLegacy && !isEnc2) {
                        obj[prop] = encryptValue(value)
                    }
                } else if (isLegacy || isEnc2) {
                    obj[prop] = decryptValue(value)
                }
            } catch (ex) {
                ex.friendlyMessage = `Can't ${action}: ${value}. Make sure key and IV are correct for encryption.`

                if (logger) logger.error(`SetMeUp`, action, ex)

                throw ex
            }
        }
    }

    // Remove `encrypted` property prior to decrypting.
    if (action == "decrypt") {
        delete settingsJson["encrypted"]
    }

    // Process settings data.
    parser(settingsJson)

    // Add `encrypted` property after file is encrypted.
    if (action == "encrypt") {
        settingsJson["encrypted"] = true
    }
    return settingsJson
}
/**
 * Gets a unique machine ID. This is mainly used by [[CryptoMethod]] to get a
 * valid encryption key in case none is specified when encrypting / decrypting.
 * @protected
 */
function getMachineID(): string {
    let windowsArc = null

    /* istanbul ignore if */
    if (process.arch == "ia32" && process.env.hasOwnProperty("PROCESSOR_ARCHITEW6432")) {
        /* istanbul ignore next */
        windowsArc = "mixed"
    } else {
        /* istanbul ignore next */
        windowsArc = "native"
    }

    let {platform} = process
    let win32RegBinPath = {
        native: "%windir%\\System32",
        mixed: "%windir%\\sysnative\\cmd.exe /c %windir%\\System32"
    }
    let guid = {
        darwin: "ioreg -rd1 -c IOPlatformExpertDevice",
        win32: `${win32RegBinPath[windowsArc]}\\REG ` + "QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography " + "/v MachineGuid",
        linux: "( cat /var/lib/dbus/machine-id /etc/machine-id 2> /dev/null || hostname ) | head -n 1 || :",
        freebsd: "kenv -q smbios.system.uuid"
    }

    let result = execSync(guid[platform]).toString()

    switch (platform) {
        case "linux":
            return result
                .toString()
                .replace(/\r+|\n+|\s+/gi, "")
                .toLowerCase()
                .substring(0, 32)
        /* istanbul ignore next */
        case "darwin":
            return result
                .split("IOPlatformUUID")[1]
                .split("\n")[0]
                .replace(/\=|\s+|\"/gi, "")
                .toLowerCase()
                .substring(0, 32)
        /* istanbul ignore next */
        case "win32":
            return result
                .toString()
                .split("REG_SZ")[1]
                .replace(/\r+|\n+|\s+/gi, "")
                .toLowerCase()
                .substring(0, 32)

        /* istanbul ignore next */
        case "freebsd":
            return result
                .toString()
                .replace(/\r+|\n+|\s+/gi, "")
                .toLowerCase()
                .substring(0, 32)
        /* istanbul ignore next */
        default:
            return "SetMeUp32SettingsEncryptionKey32"
    }
}
