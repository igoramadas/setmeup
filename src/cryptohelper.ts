// SetMeUp: crypto.ts

import {execSync} from "child_process"
import {isArray, isBoolean, isNumber, isString, loadJson} from "./utils"
import crypto from "crypto"

/** Default IV value in case one is not provided. */
let defaultIV = "8407198407191984"
/** @hidden */
let env = process.env
/** @hidden */
let logger = null
/** @hidden */
let loggerLoaded = false

/**
 * Encryption options for [[CryptoMethod]].
 * @protected
 */
export interface CryptoOptions {
    /** Cipher to use, default is "aes256". */
    cipher?: string
    /** Encryption key, default is derived from current machine via [[getMachineID]]. */
    key?: string
    /** Encryption IV, default is "8407198407191984". */
    iv?: string
}

/**
 * Helper to encrypt or decrypt settings files. The default encryption key
 * is derived from the unique machine ID, so ideally you should change to
 * your desired secret and strong key. Same applies for the default IV.
 * You can also  set them via the SMU_CRYPTO_KEY and SMU_CRYPTO_IV
 * environment variables. The default cipher algorithm is AES 256.
 * Failure to encrypt or decrypt will throw an exception.
 * @param action Action can be "encrypt" or "decrypt".
 * @param filename The file to be encrypted or decrypted.
 * @param options Encryption options with cipher, key and IV.
 * @returns The (de)encrypted JSON object.
 * @protected
 */
export function cryptoMethod(action: string, filename: string, options?: CryptoOptions): any {
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

    const settingsJson = loadJson(filename, false)

    // Settings file not found or invalid? Stop here.
    if (settingsJson == null) {
        throw new Error("Can't (de)encrypt, settings file not found or empty.")
    }

    // Helper to parse and encrypt / decrypt settings data.
    let parser = (obj) => {
        let currentValue = null

        for (let prop in obj) {
            const value = obj[prop]

            if (value != null && value.constructor === Object) {
                parser(obj[prop])
            } else {
                let newValue

                try {
                    let c
                    currentValue = obj[prop]

                    // Do not consider booleans, as it would be easy to guess
                    // the key based on true / false.
                    if (isBoolean(currentValue)) {
                        newValue = currentValue
                    } else if (action == "encrypt") {
                        // Value already encrypted? Skip!
                        if (isString(currentValue) && currentValue.substring(0, 4) == "enc-") {
                            newValue = currentValue
                        } else {
                            // Is an array?
                            if (isArray(currentValue)) {
                                newValue = "enc-a:"
                                currentValue = JSON.stringify(currentValue, null, 0)
                            }
                            // Is a number?
                            else if (isNumber(currentValue)) {
                                newValue = "enc-n:"
                            }
                            // Strings, dates and everything else?
                            else {
                                newValue = "enc-s:"
                            }

                            // Create cipher amd encrypt data.
                            c = crypto.createCipheriv(options.cipher, options.key, options.iv)
                            newValue += c.update(currentValue.toString(), "utf8", "hex")
                            newValue += c.final("hex")
                        }
                    } else if (action == "decrypt") {
                        // Value is an array? Return it as it is.
                        if (isArray(currentValue)) {
                            newValue = currentValue
                        } else {
                            // Split the data as "datatype:encryptedValue".
                            const arrValue = currentValue.split(":")

                            if (arrValue.length > 1 && arrValue[0].toString().substring(0, 4) == "enc-") {
                                newValue = ""

                                // Create cipher and decrypt.
                                c = crypto.createDecipheriv(options.cipher, options.key, options.iv)
                                newValue += c.update(arrValue[1], "hex", "utf8")
                                newValue += c.final("utf8")

                                // Cast data type (array, number or string).
                                if (arrValue[0] === "enc-a") {
                                    newValue = JSON.parse(newValue)
                                } else if (arrValue[0] === "enc-n") {
                                    newValue = parseFloat(newValue)
                                }
                            } else {
                                // Value not encrypted, so keep the current.
                                newValue = currentValue
                            }
                        }
                    } else {
                        /* istanbul ignore next */
                        throw new Error(`Invalid action`)
                    }
                } catch (ex) {
                    ex.friendlyMessage = `Can't ${action}: ${currentValue}. Make sure key and IV are correct for encryption.`

                    if (logger) logger.error(`SetMeUp`, action, ex)

                    throw ex
                }

                // Update settings property value.
                obj[prop] = newValue
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
