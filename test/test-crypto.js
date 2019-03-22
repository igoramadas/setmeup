// TEST: CRYPTO

let chai = require("chai")
let fs = require("fs")
let mocha = require("mocha")
let after = mocha.after
let before = mocha.before
let describe = mocha.describe
let it = mocha.it

chai.should()

describe("SetMeUp Crypto Tests", function() {
    let setmeup = null
    let crypto = null
    let utils = null
    let cryptoFilename = null

    before(function() {
        setmeup = require("../index")
        crypto = require("../lib/crypto")
        utils = require("../lib/utils")

        const originalFilename = utils.getFilePath("./settings.test.json")
        const fileBuffer = fs.readFileSync(originalFilename)
        fs.writeFileSync(originalFilename.replace(".json", ".crypto.json"), fileBuffer)
        cryptoFilename = utils.getFilePath("./settings.test.crypto.json")
    })

    after(function() {
        if (fs.existsSync(cryptoFilename)) {
            fs.unlinkSync(cryptoFilename)
        }
    })

    it("Encrypt the settings file", function(done) {
        setmeup.encrypt(cryptoFilename)

        var encrypted = JSON.parse(
            fs.readFileSync(cryptoFilename, {
                encoding: "utf8"
            })
        )

        if (!encrypted.encrypted) {
            return done("Property 'encrypted' was not properly set.")
        }
        if (encrypted.something.string == "abc") {
            return done("Encryption failed, settings.something.string is still set as 'abc'.")
        }

        done()
    })

    it("Fails to encrypt already encrypted file", function(done) {
        if (setmeup.encrypt(cryptoFilename)) {
            done("Encrypting an already encrypted file should return false.")
        } else {
            done()
        }
    })

    it("Fails to decrypt settings with wrong key", function(done) {
        try {
            setmeup.decrypt(cryptoFilename, {
                key: "12345678901234561234567890123456"
            })

            done("Decryption with wrong key should have thrown an exception.")
        } catch (ex) {
            done()
        }
    })

    it("Fails to decrypt non existing file", function(done) {
        try {
            setmeup.decrypt("wrongfile.json")

            done("Decrypting non existing file should thrown an exception.")
        } catch (ex) {
            done()
        }
    })

    it("Decrypt the settings file", function(done) {
        setmeup.decrypt(cryptoFilename)

        var decrypted = JSON.parse(
            fs.readFileSync(cryptoFilename, {
                encoding: "utf8"
            })
        )

        if (decrypted.encrypted) {
            return done("Property 'encrypted' was not unset / deleted.")
        }
        if (decrypted.something.string != "abc") {
            return done("Decryption failed, settings.something.string is still encrypted.")
        }

        done()
    })
})
