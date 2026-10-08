#!/usr/bin/env node

import {cryptoMethod, legacyRegex} from "./cryptohelper"
import {isPlainObject, isString, loadFile} from "./utils"
import setmeup from "./index"
import fs from "fs"

const [, , ...args] = process.argv
const action = args[0]
const filename = args.length > 1 ? args[1] : null

console.log("SetMeUp Command line utility")
console.log()

function showHelp() {
    console.log("Usage:")
    console.log("$ setmeup <action> <filename>")
    console.log()
    console.log("Actions:")
    console.log()
    console.log("  encrypt - Encrypt the file")
    console.log("  $ setmeup encrypt ./my-settings.json")
    console.log()
    console.log("  decrypt - Decrypt the file")
    console.log("  $ setmeup decrypt ./my-settings.json")
    console.log()
    console.log("  crypto-migrate - Convert legacy encrypted values (enc-) to the new format (enc2-)")
    console.log("  $ setmeup crypto-migrate ./my-settings.json")
    console.log()
    console.log("  print - Load and print settings")
    console.log("  $ setmeup print ./my-settings.json")
    console.log("  $ setmeup print")
    console.log()
    console.log("If no filename is passed on print, it will load the defaults:")
    console.log("settings.default.json, settings.json, settings.APP_ENV.json OR settings.NODE_ENV.json, settings.secret.json")
    console.log()
    console.log("The encryption key can be set via the SMU_CRYPTO_KEY environment variable.")
    console.log()
}

// Helper to run file crypto actions, which need a filename and write access.
function cryptoAction(method: (filename: string) => boolean | void, done: string) {
    if (!filename) {
        throw new Error(`Missing filename for ${action}`)
    }
    if (setmeup.readOnly) {
        throw new Error(`Can't ${action} ${filename}, file system is read only`)
    }

    if (method(filename) === false) {
        console.log(`Nothing to ${action} on ${filename}`)
    } else {
        console.log(`${done} ${filename}`)
    }
}

// Convert legacy "enc-" values to "enc2-", leaving all other values untouched.
// Everything is done in memory, so decrypted values are never written to disk.
// Returns false if there was nothing to migrate.
function cryptoMigrate(file: string): boolean {
    const decrypted = cryptoMethod("decrypt", file)
    const migrated = cryptoMethod("encrypt", structuredClone(decrypted))
    const original = loadFile(file, false)
    const replacements: [string, string][] = []

    const findLegacy = (target: any, source: any, plain: any, parentPath: string) => {
        for (let key of Object.keys(target)) {
            const keyPath = parentPath ? `${parentPath}.${key}` : key

            if (isPlainObject(target[key])) {
                findLegacy(target[key], source[key], plain[key], keyPath)
            } else if (isString(target[key]) && legacyRegex.test(target[key])) {
                // Encrypt skips values that look encrypted, so these would be written as plaintext.
                if (source[key] === plain[key]) {
                    throw new Error(`Can't migrate ${keyPath}, its decrypted value looks like an encrypted value`)
                }

                replacements.push([target[key], source[key]])
            }
        }
    }

    findLegacy(original, migrated, decrypted, "")

    if (replacements.length == 0) {
        return false
    }

    // Replace on the raw text to preserve comments and formatting. Encrypted values never need JSON escaping.
    let contents = fs.readFileSync(file, {encoding: "utf8"})
    for (let [legacyValue, newValue] of replacements) {
        contents = contents.split(`"${legacyValue}"`).join(`"${newValue}"`)
    }

    fs.writeFileSync(file, contents, {encoding: "utf8"})
    return true
}

try {
    if (!action || action == "help") {
        showHelp()
    } else if (action == "encrypt") {
        cryptoAction(setmeup.encrypt, "Encrypted")
    } else if (action == "decrypt") {
        cryptoAction(setmeup.decrypt, "Decrypted")
    } else if (action == "crypto-migrate") {
        cryptoAction(cryptoMigrate, "Migrated")
    } else if (action == "print") {
        if (filename) {
            setmeup.load(filename)
        } else {
            setmeup.load()
        }

        console.log(JSON.stringify(setmeup.settings, null, 4))
    } else {
        console.error(`INVALID ACTION: ${action} !!!`)
        console.log()
        showHelp()
        process.exitCode = 1
    }

    console.log()
} catch (ex) {
    console.log()
    console.error("ERROR!")
    console.error(ex)
    process.exitCode = 1
}
