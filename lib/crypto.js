"use strict";
// SetMeUp: crypto.ts
Object.defineProperty(exports, "__esModule", { value: true });
const utils = require("./utils");
const child_process_1 = require("child_process");
/** @hidden */
const _ = require("lodash");
/** @hidden */
const crypto = require("crypto");
/** Default IV value in case one is not provided. */
let defaultIV = "8407198407191984";
/** @hidden */
let env = process.env;
/** @hidden */
let logger = null;
/** @hidden */
let loggerLoaded = false;
/**
 * Helper to encrypt or decrypt settings files. The default encryption key
 * is derived from the unique machine ID, so ideally you should change to
 * your desired secret and strong key. Same applies for the default IV.
 * You can also  set them via the SETMEUP_CRYPTO_KEY and SETMEUP_CRYPTO_IV
 * environment variables. The default cipher algorithm is AES 256.
 * Failure to encrypt or decrypt will throw an exception.
 * @param action Action can be "encrypt" or "decrypt".
 * @param filename The file to be encrypted or decrypted.
 * @param options Encryption options with cipher, key and IV.
 * @returns The (de)encrypted JSON object.
 * @protected
 */
function CryptoMethod(action, filename, options) {
    if (options == null) {
        options = {};
    }
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
    action = action.toString().toLowerCase();
    options = _.defaults(options, {
        cipher: "aes256",
        key: env["SETMEUP_CRYPTO_KEY"],
        iv: env["SETMEUP_CRYPTO_IV"]
    });
    // No encryption key specified? Use the Machine ID then.
    if (!options.key) {
        options.key = getMachineID();
    }
    // No IV specified? Use default (set on top of this file).
    if (!options.iv) {
        options.iv = defaultIV;
    }
    const settingsJson = utils.loadJson(filename);
    // Settings file not found or invalid? Stop here.
    if (settingsJson == null) {
        throw new Error("Can't (de)encrypt, settings file not found or empty.");
    }
    // If trying to encrypt and settings property `encrypted` is true, return false.
    if (settingsJson.encrypted && action == "encrypt") {
        /* istanbul ignore else */
        if (logger) {
            logger.warn("Setmeup.CryptoMethod", filename, "Already encrypted, abort!");
        }
        return settingsJson;
    }
    // Helper to parse and encrypt / decrypt settings data.
    let parser = obj => {
        let currentValue = null;
        for (let prop in obj) {
            const value = obj[prop];
            if (value != null && value.constructor === Object) {
                parser(obj[prop]);
            }
            else {
                let newValue;
                try {
                    let c;
                    currentValue = obj[prop];
                    // Do not consider booleans, as it would be easy to guess
                    // the key based on true / false.
                    if (_.isBoolean(currentValue)) {
                        newValue = currentValue;
                    }
                    else if (action == "encrypt") {
                        if (_.isArray(currentValue)) {
                            newValue = "a:";
                            currentValue = JSON.stringify(currentValue, null, 0);
                        }
                        else if (_.isNumber(currentValue)) {
                            newValue = "n:";
                        }
                        else {
                            newValue = "s:";
                        }
                        // Create cipher amd encrypt data.
                        c = crypto.createCipheriv(options.cipher, options.key, options.iv);
                        newValue += c.update(currentValue.toString(), "utf8", "hex");
                        newValue += c.final("hex");
                    }
                    else if (action == "decrypt") {
                        // Split the data as "datatype:encryptedValue".
                        const arrValue = currentValue.split(":");
                        if (arrValue.length > 0 && arrValue[0].length == 1) {
                            newValue = "";
                            // Create cipher and decrypt.
                            c = crypto.createDecipheriv(options.cipher, options.key, options.iv);
                            newValue += c.update(arrValue[1], "hex", "utf8");
                            newValue += c.final("utf8");
                            // Cast data type (array, number or string).
                            if (arrValue[0] === "a") {
                                newValue = JSON.parse(newValue);
                            }
                            else if (arrValue[0] === "n") {
                                newValue = parseFloat(newValue);
                            }
                        }
                        else {
                            // Value not encrypted, so keep the current.
                            newValue = currentValue;
                        }
                    }
                    else {
                        /* istanbul ignore next */
                        throw new Error(`Invalid action: ${action}`);
                    }
                }
                catch (ex) {
                    ex.friendlyMessage = `Can't ${action}: ${currentValue}. Make sure key and IV are correct for encryption.`;
                    throw ex;
                }
                // Update settings property value.
                obj[prop] = newValue;
            }
        }
    };
    // Remove `encrypted` property prior to decrypting.
    if (action == "decrypt") {
        delete settingsJson["encrypted"];
    }
    // Process settings data.
    parser(settingsJson);
    // Add `encrypted` property after file is encrypted.
    if (action == "encrypt") {
        settingsJson.encrypted = true;
    }
    return settingsJson;
}
exports.CryptoMethod = CryptoMethod;
/**
 * Gets a unique machine ID. This is mainly used by [[CryptoMethod]] to get a
 * valid encryption key in case none is specified when encrypting / decrypting.
 * @protected
 */
function getMachineID() {
    let windowsArc = null;
    /* istanbul ignore if */
    if (process.arch == "ia32" && process.env.hasOwnProperty("PROCESSOR_ARCHITEW6432")) {
        windowsArc = "mixed";
    }
    else {
        windowsArc = "native";
    }
    let { platform } = process;
    let win32RegBinPath = {
        native: "%windir%\\System32",
        mixed: "%windir%\\sysnative\\cmd.exe /c %windir%\\System32"
    };
    let guid = {
        darwin: "ioreg -rd1 -c IOPlatformExpertDevice",
        win32: `${win32RegBinPath[windowsArc]}\\REG ` + "QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography " + "/v MachineGuid",
        linux: "( cat /var/lib/dbus/machine-id /etc/machine-id 2> /dev/null || hostname ) | head -n 1 || :",
        freebsd: "kenv -q smbios.system.uuid"
    };
    let result = child_process_1.execSync(guid[platform]).toString();
    switch (platform) {
        case "linux":
            return result
                .toString()
                .replace(/\r+|\n+|\s+/gi, "")
                .toLowerCase()
                .substring(0, 32);
        /* istanbul ignore next */
        case "darwin":
            return result
                .split("IOPlatformUUID")[1]
                .split("\n")[0]
                .replace(/\=|\s+|\"/gi, "")
                .toLowerCase()
                .substring(0, 32);
        /* istanbul ignore next */
        case "win32":
            return result
                .toString()
                .split("REG_SZ")[1]
                .replace(/\r+|\n+|\s+/gi, "")
                .toLowerCase()
                .substring(0, 32);
        /* istanbul ignore next */
        case "freebsd":
            return result
                .toString()
                .replace(/\r+|\n+|\s+/gi, "")
                .toLowerCase()
                .substring(0, 32);
        /* istanbul ignore next */
        default:
            return "SetMeUp32SettingsEncryptionKey32";
    }
}
