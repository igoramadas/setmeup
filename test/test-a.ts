// TEST: MAIN

import {after, before, describe, it} from "mocha"
import assert from "node:assert/strict"
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

    it("Once listeners are called only once", function () {
        const instance = setmeup.newInstance()
        let count = 0

        instance.once("test", () => count++)
        instance.events.emit("test")
        instance.events.emit("test")

        assert.equal(count, 1)
    })

    it("Settings are updated before the load event is emitted", function () {
        const instance = setmeup.newInstance()
        let loadedValue = null

        instance.on("load", () => (loadedValue = instance.settings.something?.thisIsNew))
        instance.load("./test/settings.test2.json")

        loadedValue.should.equal("yes")
    })

    it("Loading the same file multiple times adds it to the files list only once", function () {
        const instance = setmeup.newInstance()

        instance.load("./test/settings.test2.json")
        instance.load("./test/settings.test2.json", {overwrite: false})

        instance.files.length.should.equal(1)
        instance.files[0].options.overwrite.should.equal(false)
    })

    it("Method loadJson returns the loaded data", function () {
        const data = {loadJsonTest: true}
        setmeup.loadJson(data).should.equal(data)
    })

    it("Does not pollute prototypes via loadJson or environment variables", function () {
        const instance = setmeup.newInstance()

        instance.loadJson(JSON.parse('{"__proto__": {"pollutedJson": true}, "nested": {"constructor": {"prototype": {"pollutedNested": true}}}}'))

        process.env.SMU_constructor_prototype_pollutedEnv = "yes"
        process.env.SMU___proto___pollutedEnv2 = "yes"
        instance.loadFromEnv()
        delete process.env.SMU_constructor_prototype_pollutedEnv
        delete process.env.SMU___proto___pollutedEnv2

        const obj: any = {}
        assert.equal(obj.pollutedJson, undefined)
        assert.equal(obj.pollutedNested, undefined)
        assert.equal(obj.pollutedEnv, undefined)
        assert.equal(obj.pollutedEnv2, undefined)
    })

    it("Load booleans and numbers from environment variables", function () {
        const instance = setmeup.newInstance()
        const vars = {
            SMU3_bool_true: "true",
            SMU3_bool_false: "FALSE",
            SMU3_num_int: "42",
            SMU3_num_float: "-1.5",
            SMU3_str_zip: "01234",
            SMU3_str_bigId: "12345678901234567890",
            SMU3_str_empty: "",
            SMU3_str_nan: "NaN",
            SMU3_str_text: "abc"
        }
        Object.assign(process.env, vars)

        instance.loadFromEnv("SMU3")

        for (let key of Object.keys(vars)) delete process.env[key]

        const s = instance.settings
        s.bool.true.should.equal(true)
        s.bool.false.should.equal(false)
        s.num.int.should.equal(42)
        s.num.float.should.equal(-1.5)
        s.str.zip.should.equal("01234")
        s.str.bigId.should.equal("12345678901234567890")
        s.str.empty.should.equal("")
        s.str.nan.should.equal("NaN")
        s.str.text.should.equal("abc")
    })

    it("Nested environment variables win over a parent value", function () {
        const instance = setmeup.newInstance()

        process.env.SMU4_parent_child = "child"
        process.env.SMU4_parent = "parent"
        instance.loadFromEnv("SMU4")
        delete process.env.SMU4_parent_child
        delete process.env.SMU4_parent

        instance.settings.parent.child.should.equal("child")
    })
})
