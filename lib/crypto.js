"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils = require("./utils");
const child_process_1 = require("child_process");
const _ = require("lodash");
const crypto = require("crypto");
const fs = require("fs");
let defaultIV = "8407198407191984";
let env = process.env;
let logger = null;
let loggerLoaded = false;
function CryptoMethod(action, filename, options) {
    if (options == null) {
        options = {};
    }
    if (!loggerLoaded) {
        loggerLoaded = true;
        try {
            logger = require("anyhow");
        }
        catch (ex) {
        }
    }
    action = action.toString().toLowerCase();
    options = _.defaults(options, {
        cipher: "aes256",
        key: env["SETMEUP_CRYPTOKEY"],
        iv: env["SETMEUP_CRYPTOIV"]
    });
    if (!options.key) {
        options.key = getMachineID();
    }
    if (!options.iv) {
        options.iv = defaultIV;
    }
    const settingsJson = utils.loadJson(filename);
    if (settingsJson == null) {
        throw new Error("Can't (de)encrypt, settings file not found or empty.");
    }
    if (settingsJson.encrypted && action == "encrypt") {
        if (logger) {
            logger.warn("Setmeup.CryptoMethod", filename, "Already encrypted, abort!");
        }
        return;
    }
    var parser = obj => {
        let currentValue = null;
        for (let prop in obj) {
            const value = obj[prop];
            if (value && value.constructor === Object) {
                parser(obj[prop]);
            }
            else {
                var newValue;
                try {
                    var c;
                    currentValue = obj[prop];
                    if (action == "encrypt") {
                        if (_.isBoolean(currentValue)) {
                            newValue = "bool:";
                        }
                        else if (_.isNumber(currentValue)) {
                            newValue = "number:";
                        }
                        else {
                            newValue = "string:";
                        }
                        c = crypto.createCipheriv(options.cipher, options.key, options.iv);
                        newValue += c.update(currentValue.toString(), "utf8", "hex");
                        newValue += c.final("hex");
                    }
                    else if (action == "decrypt") {
                        const arrValue = currentValue.split(":");
                        newValue = "";
                        c = crypto.createDecipheriv(options.cipher, options.key, options.iv);
                        newValue += c.update(arrValue[1], "hex", "utf8");
                        newValue += c.final("utf8");
                        if (arrValue[0] === "bool") {
                            if (newValue === "true" || newValue === "1") {
                                newValue = true;
                            }
                            else {
                                newValue = false;
                            }
                        }
                        else if (arrValue[0] === "number") {
                            newValue = parseFloat(newValue);
                        }
                    }
                }
                catch (ex) {
                    ex.friendlyMessage = `Can't ${action}: ${currentValue}. Make sure key and IV are correct for encryption.`;
                    throw ex;
                }
                obj[prop] = newValue;
            }
        }
    };
    if (action == "decrypt") {
        delete settingsJson["encrypted"];
    }
    parser(settingsJson);
    if (action == "encrypt") {
        settingsJson.encrypted = true;
    }
    const newSettingsJson = JSON.stringify(settingsJson, null, 4);
    fs.writeFileSync(filename, newSettingsJson, { encoding: "utf8" });
}
exports.CryptoMethod = CryptoMethod;
function getMachineID() {
    let windowsArc = null;
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
        case "darwin":
            return result
                .split("IOPlatformUUID")[1]
                .split("\n")[0]
                .replace(/\=|\s+|\"/gi, "")
                .toLowerCase()
                .substring(0, 32);
        case "win32":
            return result
                .toString()
                .split("REG_SZ")[1]
                .replace(/\r+|\n+|\s+/gi, "")
                .toLowerCase()
                .substring(0, 32);
        case "freebsd":
            return result
                .toString()
                .replace(/\r+|\n+|\s+/gi, "")
                .toLowerCase()
                .substring(0, 32);
        default:
            return "SetMeUp32SettingsEncryptionKey32";
    }
}
