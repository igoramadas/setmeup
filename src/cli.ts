#!/usr/bin/env node

import setmeup = require("./index")

const [, , ...args] = process.argv
const action = args[0]
const filename = args[1]

console.log("SetMeUp Command line utility")
console.log()

try {
    if (action == "encrypt") {
        setmeup.encrypt(filename)
        console.log(`Encrypted ${filename}`)
    } else if (action == "decrypt") {
        setmeup.decrypt(filename)
        console.log(`Decrypted ${filename}`)
    } else {
        console.error(`Invalid action: ${action}`)
    }

    console.log()
} catch (ex) {
    console.log()
    console.error("ERROR!")
    console.error(ex)
}
