// TEST: CLI

import {before, describe, it} from "mocha"
require("chai").should()

describe("SetMeUp CLI Tests", function () {
    let {exec} = require("node:child_process")

    before(function () {
        require("anyhow").setup("none")
    })

    it("CLI Default", function () {
        exec("node lib-test/src/cli.js")
    })

    it("CLI Help", function () {
        exec("node lib-test/src/cli.js help")
    })

    it("CLI Decrypt", function () {
        exec("node lib-test/src/cli.js decrypt test/settings.secret.json")
    })

    it("CLI Encrypt", function () {
        exec("node lib-test/src/cli.js encrypt test/settings.secret.json")
    })

    it("CLI Print", function () {
        exec("node lib-test/src/cli.js print")
        exec("node lib-test/src/cli.js print test/settings.test.json")
    })

    it("CLI Error", function () {
        exec("node lib-test/src/cli.js encrypt decrypt help print something")
    })

    it("CLI crypto-migrate", function () {
        const {execFileSync} = require("node:child_process")
        const fs = require("fs")
        const file = "./test/settings.cli-migrate.json"
        const key = "12345678901234561234567890123456"
        const iv = "1234567890987654"
        const legacy = (type: string, value: string) => {
            const c = require("crypto").createCipheriv("aes256", key, iv)
            return `enc-${type}:` + c.update(value, "utf8", "hex") + c.final("hex")
        }

        fs.writeFileSync(file, JSON.stringify({str: legacy("s", "abc"), nested: {num: legacy("n", "-1.5"), arr: legacy("a", "[1,2]")}, plain: "plain", bool: true, encrypted: true}))

        try {
            execFileSync("node", ["lib-test/src/cli.js", "crypto-migrate", file], {env: {...process.env, SMU_CRYPTO_KEY: key, SMU_CRYPTO_IV: iv}})

            const migrated = JSON.parse(fs.readFileSync(file, "utf8"))
            migrated.str.should.match(/^enc2-s:/)
            migrated.nested.num.should.match(/^enc2-n:/)
            migrated.nested.arr.should.match(/^enc2-a:/)
            migrated.plain.should.equal("plain")
            migrated.bool.should.equal(true)
            migrated.encrypted.should.equal(true)

            require("../src/index").decrypt(file, {key})

            JSON.parse(fs.readFileSync(file, "utf8")).should.deep.equal({str: "abc", nested: {num: -1.5, arr: [1, 2]}, plain: "plain", bool: true})
        } finally {
            fs.unlinkSync(file)
        }
    })

    it("CLI exits with an error code on failures", function () {
        const {spawnSync} = require("node:child_process")

        spawnSync("node", ["lib-test/src/cli.js", "invalid-action"]).status.should.equal(1)
        spawnSync("node", ["lib-test/src/cli.js", "crypto-migrate"]).status.should.equal(1)
        spawnSync("node", ["lib-test/src/cli.js", "help"]).status.should.equal(0)
    })
})
