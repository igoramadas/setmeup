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
        setmeup.load("./settings.test.json")

        if (setmeup.settings.something && setmeup.settings.something.number == 1) {
            done()
        } else {
            done("Loaded settings should have property something.number = 1")
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

    it("Creates new instance that differs from original", function(done) {
        let otherInstance = setmeup.newInstance()

        setmeup.settings.updatedValue = true

        if (otherInstance.settings.updatedValue) {
            done("Settting a property on updatedValue instance should not reflect on new instance.")
        } else {
            done()
        }
    })

    it("Resets to original", function(done) {
        setmeup.reset()

        if (setmeup.settings.updatedValue) {
            done("Calling reset should clear the updatedValue property.")
        } else {
            done()
        }
    })
})
