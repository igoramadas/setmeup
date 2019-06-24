// TEST: MAIN

let chai = require("chai")
let mocha = require("mocha")
let before = mocha.before
let describe = mocha.describe
let it = mocha.it

chai.should()

describe("SetMeUp Main Tests", function() {
    let setmeup = null

    before(function() {
        require("anyhow").setup("none")

        setmeup = require("../index")
    })

    it("Try loading settings from invalid file", function(done) {
        if (setmeup.load("invalid-settings") == null) {
            done()
        } else {
            done("The load() call should have returned null.")
        }
    })

    it("Load test settings", function(done) {
        setmeup.load()
        setmeup.load("./settings.test.json")

        if (setmeup.settings.something && setmeup.settings.something.number == 1) {
            done()
        } else {
            done("Loaded settings should have property something.number = 1")
        }
    })

    it("Load more test settings, do not overwrite", function(done) {
        setmeup.load("./settings.test.json")
        setmeup.load("./settings.test2.json", {
            overwrite: false
        })

        let something = setmeup.settings.something

        if (something && something.boolean && something.thisIsNew == "yes") {
            done()
        } else {
            done("New settings should have boolean=true (keep original) and thisIsNew='yes'.")
        }
    })

    it("Load test settings from a specific root key", function(done) {
        setmeup.load("./settings.test.json", {
            rootKey: "root"
        })

        if (setmeup.settings.date == "01/01/2000") {
            done()
        } else {
            done("Loaded settings from 'root' should have a property date = '01/01/2000'.")
        }
    })

    it("Load from environment variables", function(done) {
        setmeup.loadFromEnv()

        if (setmeup.settings.env && setmeup.settings.env.var == "abc") {
            done()
        } else {
            done("Did not load from 'SMU_env_var' to 'settings.env.var = abc'.")
        }
    })

    it("Load from environment variables, with different prefix and forcing lowercase", function(done) {
        setmeup.loadFromEnv("SMU2", {
            lowercase: true
        })

        if (setmeup.settings.env2 && setmeup.settings.env2.var2 == "abc") {
            done()
        } else {
            done("Did not load from 'SMU2_ENV2_VAR2' to 'settings.env2.var2 = test'.")
        }
    })

    it("Load from non-existing environment variables", function(done) {
        let callback = function() {
            done()
        }

        setmeup.once("loadFromEnv", callback)

        setmeup.loadFromEnv("INVALID_SMU_", {
            overwrite: false
        })
    })

    it("Creates new instance that differs from original", function(done) {
        let otherInstance = setmeup.newInstance()

        setmeup.settings.updatedValue = true

        if (otherInstance.settings.updatedValue) {
            done("Settting a property on updatedValue instance should not reflect on new instance.")
        } else {
            done()
        }
    })

    it("Creates new instance and do lot load", function(done) {
        let newInstance = setmeup.newInstance(true)

        if (Object.keys(newInstance.settings).length > 0) {
            done("New instance should have an empty settings object.")
        } else {
            done()
        }
    })
})
