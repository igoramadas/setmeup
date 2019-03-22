// TEST: WATCH

let chai = require("chai")
let fs = require("fs")
let mocha = require("mocha")
let after = mocha.after
let before = mocha.before
let describe = mocha.describe
let it = mocha.it

chai.should()

describe("SetMeUp Watch Tests", function() {
    let setmeup = null
    let utils = null

    var filename = "./settings.test.json"

    before(function() {
        setmeup = require("../index")
        setmeup.load("settings.test.json")

        utils = require("../lib/utils")
    })

    after(function() {
        setmeup.unwatch()
    })

    it("Settings file watchers properly working", function(done) {
        this.timeout(7000)

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

            setmeup.off("load", callback)

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

        setTimeout(writer, 500)
    })
})
