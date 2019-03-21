// TEST: WATCH

var env = process.env
var chai = require("chai")
var mocha = require("mocha")
var describe = mocha.describe
var before = mocha.before
var after = mocha.after
var it = mocha.it
chai.should()

describe("SetMeUp Watch Tests", function() {
    env.NODE_ENV = "test"
    process.setMaxListeners(20)

    var setmeup = require("../index")
    var fs = require("fs")
    var utils = null

    var filename = "./settings.test.json"

    before(function() {
        setmeup.load("settings.test.json")

        utils = require("../lib/utils")
    })

    after(function() {
        setmeup.unwatch()
    })

    it("Settings file watchers properly working", function(done) {
        this.timeout(8000)

        var doneCalled = false

        var originalJson = fs.readFileSync(filename, {
            encoding: "utf8"
        })

        delete originalJson.testingFileWatcher

        var newJson = utils.parseJson(originalJson)

        var callback = function(watchedFile, contents) {
            if (doneCalled) return
            doneCalled = true

            unwatch()

            fs.writeFileSync(filename, originalJson, {
                encoding: "utf8"
            })

            done()
        }

        var unwatch = function() {
            setmeup.unwatch()
        }

        setmeup.on("load", callback)
        setmeup.watch()
        newJson.testingFileWatcher = true

        var writer = function() {
            try {
                fs.writeFileSync(filename, JSON.stringify(newJson, null, 4))
            } catch (ex) {
                if (doneCalled) return
                doneCalled = true
                unwatch()
                done(ex)
            }
        }

        setTimeout(writer, 800)
    })
})
