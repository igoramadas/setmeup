// TEST: CRYPTO

import {after, before, describe, it} from "mocha"
require("chai").should()

describe("SetMeUp Crypto Tests", function () {
    let fs = require("fs")
    let setmeup = null
    let utils = null
    let cryptoFilename = null

    before(function () {
        require("anyhow").setup("none")

        setmeup = require("../src/index")
        utils = require("../src/utils")

        const originalFilename = utils.getFilePath("./test/settings.test.json")
        const fileBuffer = fs.readFileSync(originalFilename)
        fs.writeFileSync(originalFilename.replace(".json", ".crypto.json"), fileBuffer)
        fs.writeFileSync("./test/settings.secret.json", fileBuffer)
        cryptoFilename = utils.getFilePath("./test/settings.test.crypto.json")
    })

    after(function () {
        if (fs.existsSync(cryptoFilename)) {
            fs.unlinkSync(cryptoFilename)
        }
    })

    it("Fails to encrypt in readOnly mode", function (done) {
        try {
            setmeup.readOnly = true
            setmeup.encrypt(cryptoFilename)
            setmeup.readOnly = false

            const encrypted = JSON.parse(
                fs.readFileSync(cryptoFilename, {
                    encoding: "utf8"
                })
            )

            if (encrypted.encrypted) {
                return done("File should not be encrypted while in readOnly mode.")
            }

            done()
        } catch (ex) {
            done(ex)
        }
    })

    it("Fails to encrypt null file", function (done) {
        try {
            setmeup.encrypt("./test/settings.null.json", {key: null})

            done("Encrypting empty or null should thrown an exception.")
        } catch (ex) {
            done()
        }
    })

    it("Encrypt the settings file", function (done) {
        setmeup.encrypt(cryptoFilename)

        const encrypted = JSON.parse(
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

    it("Encrypt file already encrypted", function () {
        setmeup.encrypt(cryptoFilename)
    })

    it("Load encrypted file with default encryption settings", function (done) {
        let delayLoad = () => {
            let decrypted = setmeup.load(cryptoFilename, {
                crypto: true
            })

            if (decrypted.encrypted) {
                return done("Loaded file should not have 'encrypted' set to true.")
            }

            done()
        }

        setTimeout(delayLoad, 200)
    })

    it("Load encrypted file with custom encryption settings", function (done) {
        let delayLoad = () => {
            let decrypted = setmeup.load(cryptoFilename, {
                crypto: {
                    iv: "8407198407191984"
                }
            })

            if (decrypted.encrypted) {
                return done("Loaded file should not have 'encrypted' set to true.")
            }

            done()
        }

        setTimeout(delayLoad, 200)
    })

    it("Fails to decrypt in readOnly mode", function (done) {
        try {
            setmeup.readOnly = true
            setmeup.decrypt(cryptoFilename)
            setmeup.readOnly = false

            const encrypted = JSON.parse(
                fs.readFileSync(cryptoFilename, {
                    encoding: "utf8"
                })
            )

            if (!encrypted.encrypted) {
                return done("File should not be decrypted while in readOnly mode.")
            }

            done()
        } catch (ex) {
            done(ex)
        }
    })

    it("Fails to decrypt settings with wrong key", function (done) {
        try {
            setmeup.decrypt(cryptoFilename, {
                key: "12345678901234561234567890123456"
            })

            done("Decryption with wrong key should have thrown an exception.")
        } catch (ex) {
            done()
        }
    })

    it("Fails to decrypt non existing file", function (done) {
        try {
            setmeup.decrypt("wrongfile.json")

            done("Decrypting non existing file should thrown an exception.")
        } catch (ex) {
            done()
        }
    })

    it("Decrypt the settings file, with mixed plain text values inside", function (done) {
        let delayDecrypt = () => {
            const encrypted = JSON.parse(
                fs.readFileSync(cryptoFilename, {
                    encoding: "utf8"
                })
            )

            encrypted.plainText = "this is plain text"
            encrypted.array = [1, 2, 3]
            fs.writeFileSync(cryptoFilename, JSON.stringify(encrypted, null, 0), {encoding: "utf8"})

            setmeup.decrypt(cryptoFilename)

            const decrypted = JSON.parse(
                fs.readFileSync(cryptoFilename, {
                    encoding: "utf8"
                })
            )

            if (decrypted.encrypted) {
                return done("Property 'encrypted' was not unset / deleted.")
            }

            done()
        }

        setTimeout(delayDecrypt, 200)
    })

    it("Encrypt and decrypt with custom key and IV", function (done) {
        let iv = "1234567890987654"

        try {
            setmeup.encrypt(cryptoFilename, {
                iv: iv
            })

            setmeup.decrypt(cryptoFilename, {
                iv: iv
            })

            done()
        } catch (ex) {
            done(`Error (de)encrypting using custom parameters: ${ex.toString()}`)
        }
    })

    it("File settings.secret.json should be auto encrypted", function (done) {
        setmeup.load("./test/settings.secret.json")

        const encryptedFile = JSON.parse(fs.readFileSync("./test/settings.secret.json", "utf8"))

        if (encryptedFile.encrypted) {
            done()
        } else {
            done("File settings.secret.json was not auto encrypted on load.")
        }
    })

    it("Fails to (de)encrypt non-existing file", function (done) {
        try {
            setmeup.encrypt("wrong-file-123.json")
            done("Trying to encrypt wrong-file.json should throw an error.")
        } catch (ex) {
            try {
                setmeup.decrypt("wrong-file-123.json")
                done("Trying to decrypt wrong-file-123.json should throw an error.")
            } catch (ex) {
                done()
            }
        }
    })
})
