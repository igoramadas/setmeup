// TEST: WATCH

import {after, before, describe, it} from "mocha"
require("chai").should()

describe("SetMeUp Watch Tests", function () {
    let fs = require("fs")
    let setmeup = null
    let utils = null

    var filename = "./test/settings.test.json"

    before(function () {
        require("anyhow").setup("none")

        setmeup = require("../src/index")
        setmeup.load("settings.test.json")

        utils = require("../src/utils")
    })

    after(function () {
        setmeup.unwatch()
    })

    it("Settings file watchers properly working", function (done) {
        this.timeout(6000)

        var doneCalled = false

        var originalJson = fs.readFileSync(filename, {
            encoding: "utf8"
        })

        delete originalJson.testingFileWatcher

        var newJson = utils.parseJson(originalJson)

        var callback = function () {
            if (doneCalled) return
            doneCalled = true

            unwatch()

            fs.writeFileSync(filename, originalJson, {
                encoding: "utf8"
            })

            setmeup.off("load", callback)

            done()
        }

        var unwatch = function () {
            setmeup.unwatch()
        }

        setmeup.on("load", callback)
        setmeup.watch()
        newJson.testingFileWatcher = true

        var writer = function () {
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

    it("Reset all settings", function (done) {
        setmeup.reset()

        if (!setmeup.settings.something) {
            done()
        } else {
            done("Settings were not reset, can still find the 'something' property")
        }
    })
})
