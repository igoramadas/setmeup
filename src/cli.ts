#!/usr/bin/env node

import setmeup = require("./index")

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
    console.log("  print - Load and print settings")
    console.log("  $ setmeup load ./my-settings.json")
    console.log("  $ setmeup load")
    console.log()
    console.log("If no filename is passed on print, it will load the defaults:")
    console.log("settings.default.json, settings.json, settings.NODE_ENV.json, settings.secret.json")
    console.log()
}

try {
    if (action == "help") {
        showHelp()
    } else if (action == "encrypt") {
        setmeup.encrypt(filename)
        console.log(`Encrypted ${filename}`)
    } else if (action == "decrypt") {
        setmeup.decrypt(filename)
        console.log(`Decrypted ${filename}`)
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
    }

    console.log()
} catch (ex) {
    console.log()
    console.error("ERROR!")
    console.error(ex)
}
