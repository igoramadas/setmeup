// TEST: MAIN

import {after, before, describe, it} from "mocha"
require("chai").should()

process.env.SMU_env_var = "abc"
process.env.SMU2_ENV2_VAR2 = "abc"

describe("SetMeUp Main Tests", function () {
    let fs = require("fs")
    let setmeup = null

    const settingsTemplate = {
        something: {
            number: 1,
            negativeNumber: -1,
            string: "abc",
            boolean: true,
            anotherBoolean: false
        },
        root: {
            date: "01/01/2000"
        },
        array: [1, -1, "a", true],
        testingFileWatcher: true,
        nullKey: null
    }

    before(function () {
        require("anyhow").setup("none")

        fs.writeFileSync("./test/settings.test.json", JSON.stringify(settingsTemplate, null, 4), {encoding: "utf8"})
        fs.writeFileSync("./test/settings.secret.json", JSON.stringify(settingsTemplate, null, 4), {encoding: "utf8"})

        setmeup = require("../src/index")
    })

    after(function () {
        fs.writeFileSync("./test/settings.test.json", JSON.stringify(settingsTemplate, null, 4), {encoding: "utf8"})
    })

    it("Try loading settings from invalid file", function (done) {
        if (setmeup.load("invalid-settings") == null) {
            done()
        } else {
            done("The load() call should have returned null.")
        }
    })

    it("Load test settings", function (done) {
        setmeup.load()
        setmeup.load("./test/settings.test.json")

        if (setmeup.settings.something && setmeup.settings.something.number == 1) {
            done()
        } else {
            done("Loaded settings should have property something.number = 1")
        }
    })

    it("Load more test settings, do not overwrite", function (done) {
        setmeup.load("./test/settings.test.json")
        setmeup.load("./test/settings.test2.json", {
            overwrite: false
        })

        let something = setmeup.settings.something

        if (something && something.boolean && something.thisIsNew == "yes") {
            done()
        } else {
            done("New settings should have boolean=true (keep original) and thisIsNew='yes'.")
        }
    })

    it("Load test settings from a specific root key", function (done) {
        setmeup.load("./test/settings.test.json", {
            rootKey: "root"
        })

        if (setmeup.settings.date == "01/01/2000") {
            done()
        } else {
            done("Loaded settings from 'root' should have a property date = '01/01/2000'.")
        }
    })

    it("Replace null with object when loading settings", function () {
        setmeup.loadJson({nullKey: {test: {value: 1}}})
    })

    it("Load in readOnly mode, should not destroy", function (done) {
        setmeup.readOnly = true
        setmeup.load()
        setmeup.load("./test/settings.test.json", {destroy: true})
        setmeup.readOnly = false

        if (fs.existsSync("./test/settings.test.json")) {
            done()
        } else {
            done("File settings.test.json should NOT be deleted when in readOnly mode.")
        }
    })

    it("Destroy file after loading", function (done) {
        setmeup.load("./test/settings.test.json", {destroy: true})

        if (!fs.existsSync("./test/settings.test.json")) {
            done()
        } else {
            done("File settings.test.json should be deleted after loading.")
        }
    })

    it("Load from environment variables", function (done) {
        setmeup.loadFromEnv()

        if (setmeup.settings.env && setmeup.settings.env.var == "abc") {
            done()
        } else {
            done("Did not load from 'SMU_env_var' to 'settings.env.var = abc'.")
        }
    })

    it("Load from environment variables, with different prefix and forcing lowercase", function (done) {
        setmeup.loadFromEnv("SMU2", {
            lowercase: true
        })

        if (setmeup.settings.env2 && setmeup.settings.env2.var2 == "abc") {
            done()
        } else {
            done("Did not load from 'SMU2_ENV2_VAR2' to 'settings.env2.var2 = test'.")
        }
    })

    it("Load from non-existing environment variables", function (done) {
        let callback = function () {
            done()
        }

        setmeup.once("loadFromEnv", callback)

        setmeup.loadFromEnv("INVALID_SMU_", {
            overwrite: false
        })
    })

    it("Creates new instance that differs from original", function (done) {
        let otherInstance = setmeup.newInstance()

        setmeup.settings.updatedValue = true

        if (otherInstance.settings.updatedValue) {
            done("Settting a property on updatedValue instance should not reflect on new instance.")
        } else {
            done()
        }
    })
})
