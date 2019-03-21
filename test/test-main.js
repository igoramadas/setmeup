// TEST: MAIN

var env = process.env
var chai = require("chai")
var mocha = require("mocha")
var describe = mocha.describe
var before = mocha.before
var after = mocha.after
var it = mocha.it
chai.should()

describe("SetMeUp Main Tests", function() {
    env.NODE_ENV = "test"
    process.setMaxListeners(20)

    var setmeup = require("../index")

    it("Load test settings", function(done) {
        setmeup.load("./settings.test.json")

        if (setmeup.settings.something && setmeup.settings.something.number == 1) {
            done()
        } else {
            done("Loaded settings should have property something.number = 1")
        }
    })
})
