// TEST: CRYPTO

import {after, before, beforeEach, describe, it} from "mocha"
import assert from "node:assert/strict"
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

    it("Fails on unsupported crypto actions", function () {
        const {cryptoMethod} = require("../src/cryptohelper")
        const contents = fs.readFileSync(cryptoFilename, "utf8")

        for (let action of ["migrate", "invalid", ""]) {
            assert.throws(() => cryptoMethod(action, cryptoFilename), {message: `Invalid crypto action: ${action}`})
        }

        fs.readFileSync(cryptoFilename, "utf8").should.equal(contents)
    })

    describe("enc2 format", function () {
        const file = "./test/settings.enc2.json"
        const readFile = () => JSON.parse(fs.readFileSync(file, "utf8"))
        const original = {str: "abc", num: -1.5, arr: [1, "a", true], bool: false, nullKey: null, nested: {str: "nested"}}

        beforeEach(function () {
            fs.writeFileSync(file, JSON.stringify(original))
        })

        after(function () {
            if (fs.existsSync(file)) fs.unlinkSync(file)
        })

        it("Encrypts values using enc2 with random IVs, and decrypts back to original types", function () {
            fs.writeFileSync(file, JSON.stringify({...original, same1: "same", same2: "same"}))
            setmeup.encrypt(file, {key: "any length key works"})

            const encrypted = readFile()
            encrypted.str.should.match(/^enc2-s:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/)
            encrypted.num.should.match(/^enc2-n:/)
            encrypted.arr.should.match(/^enc2-a:/)
            encrypted.nested.str.should.match(/^enc2-s:/)
            encrypted.bool.should.equal(false)
            assert.equal(encrypted.nullKey, null)
            encrypted.same1.should.not.equal(encrypted.same2)

            setmeup.decrypt(file, {key: "any length key works"})

            const decrypted = readFile()
            delete decrypted.same1
            delete decrypted.same2
            decrypted.should.deep.equal(original)
        })

        it("Fails to decrypt enc2 values with the wrong key", function () {
            setmeup.encrypt(file, {key: "right key"})
            assert.throws(() => setmeup.decrypt(file, {key: "wrong key"}))
        })

        it("Fails to decrypt tampered enc2 values", function () {
            setmeup.encrypt(file, {key: "right key"})

            const encrypted = readFile()
            encrypted.str = encrypted.str.replace("enc2-s:", "enc2-n:")
            fs.writeFileSync(file, JSON.stringify(encrypted))
            assert.throws(() => setmeup.decrypt(file, {key: "right key"}))
        })

        it("Decrypts files with plain numbers mixed in", function () {
            setmeup.encrypt(file, {key: "right key"})

            const encrypted = readFile()
            encrypted.plainNumber = 5
            fs.writeFileSync(file, JSON.stringify(encrypted))

            setmeup.decrypt(file, {key: "right key"})
            readFile().plainNumber.should.equal(5)
        })

        it("Does not rewrite the file if encrypting has nothing to change", function () {
            setmeup.encrypt(file, {key: "right key"})
            const contents = fs.readFileSync(file, "utf8")
            const mtime = fs.statSync(file).mtimeMs

            setmeup.encrypt(file, {key: "right key"})

            fs.readFileSync(file, "utf8").should.equal(contents)
            fs.statSync(file).mtimeMs.should.equal(mtime)
        })

        it("Loads and decrypts legacy enc- values", function () {
            const key = "12345678901234561234567890123456"
            const iv = "1234567890987654"
            const legacy = (type: string, value: string) => {
                const c = require("crypto").createCipheriv("aes256", key, iv)
                return `enc-${type}:` + c.update(value, "utf8", "hex") + c.final("hex")
            }

            fs.writeFileSync(file, JSON.stringify({str: legacy("s", "abc"), num: legacy("n", "-1.5"), arr: legacy("a", '[1,"a",true]'), plain: "plain", encrypted: true}))

            const loaded = setmeup.newInstance().load(file, {crypto: {key, iv}})
            loaded.str.should.equal("abc")
            loaded.num.should.equal(-1.5)
            loaded.arr.should.deep.equal([1, "a", true])

            setmeup.decrypt(file, {key, iv})

            readFile().should.deep.equal({str: "abc", num: -1.5, arr: [1, "a", true], plain: "plain"})
        })

        it("Warns only when loading files with legacy enc- values", function () {
            const key = "12345678901234561234567890123456"
            const iv = "1234567890987654"
            const anyhow = require("anyhow")
            const originalWarn = anyhow.warn
            const warnings = []
            anyhow.warn = (...args) => warnings.push(args.join(" "))

            try {
                setmeup.encrypt(file, {key})
                setmeup.newInstance().load(file, {crypto: {key}})
                assert.equal(warnings.length, 0)

                const c = require("crypto").createCipheriv("aes256", key, iv)
                const encrypted = readFile()
                encrypted.nested.legacy = "enc-s:" + c.update("abc", "utf8", "hex") + c.final("hex")
                fs.writeFileSync(file, JSON.stringify(encrypted))

                setmeup.newInstance().load(file, {crypto: {key, iv}}).nested.legacy.should.equal("abc")
            } finally {
                anyhow.warn = originalWarn
            }

            assert.equal(warnings.length, 1)
            warnings[0].should.contain("setmeup crypto-migrate")
        })
    })
})
