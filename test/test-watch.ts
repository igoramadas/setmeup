// TEST: WATCH

import {after, before, describe, it} from "mocha"
import assert from "node:assert/strict"
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

    it("Reloading a watched file keeps its original load options", function () {
        const instance = setmeup.newInstance()
        const fullPath = utils.getFilePath(filename)

        instance.load(filename, {rootKey: "root"})
        instance.watch()
        instance["_watchers"].get(fullPath)()
        instance.unwatch()

        instance.settings.date.should.equal("01/01/2000")
        assert.equal(instance.settings.root, undefined)
    })

    it("Unwatch removes only its own file listeners", function () {
        const instance = setmeup.newInstance()
        const fullPath = utils.getFilePath(filename)
        const otherListener = () => {}
        const watcher = fs.watchFile(fullPath, otherListener)

        try {
            instance.load(filename)
            instance.watch()
            instance.unwatch()

            watcher.listenerCount("change").should.equal(1)
        } finally {
            fs.unwatchFile(fullPath, otherListener)
        }
    })

    it("Secret file is not rewritten when reloaded", function () {
        const os = require("os")
        const path = require("path")
        const folder = fs.mkdtempSync(path.join(os.tmpdir(), "setmeup-"))
        const secretFile = path.join(folder, "settings.secret.json")
        const instance = setmeup.newInstance()

        fs.writeFileSync(secretFile, JSON.stringify({secret: "abc"}))

        try {
            instance.load(secretFile)
            const contents = fs.readFileSync(secretFile, "utf8")
            const mtime = fs.statSync(secretFile).mtimeMs

            contents.should.match(/"secret": "enc2-s:/)
            instance.load(secretFile)

            fs.readFileSync(secretFile, "utf8").should.equal(contents)
            fs.statSync(secretFile).mtimeMs.should.equal(mtime)
        } finally {
            fs.rmSync(folder, {recursive: true, force: true})
        }
    })
})
