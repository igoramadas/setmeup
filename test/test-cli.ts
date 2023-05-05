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
})
