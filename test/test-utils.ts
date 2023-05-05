// TEST: IO

import {before, describe, it} from "mocha"
require("chai").should()

describe("SetMeUp Utils Tests", function () {
    let utils = null

    before(function () {
        require("anyhow").setup("none")

        utils = require("../src/utils")
    })

    it("Gets file from app root folder using getFilePath", function (done) {
        let currentFile = utils.getFilePath("package.json")

        if (currentFile) {
            done()
        } else {
            done("Could not find package.json file")
        }
    })

    it("Gets file from current folder using getFilePath", function (done) {
        let currentFile = utils.getFilePath("test-utils.ts", __dirname)

        if (currentFile) {
            done()
        } else {
            done("Could not find test-utils.js file.")
        }
    })

    it("Fails to get non existing file using getFilePath", function (done) {
        let currentFile = utils.getFilePath("this-does-not.exist")

        if (currentFile) {
            done("The getFilePath('this-does-not.exist') should return null.")
        } else {
            done()
        }
    })

    it("Parse JSON with comments", function (done) {
        let value = `
        /* This is a multiline
        comment */
        {
            "something": true,
            "somethingElse":   " space ", //comments here
            // end
            /* Multiline comment

            * something else
            */

            "something": "abc", // inline comments
            "somethingElse": {/*hello there*/ "test": true},
            "escaped": "This is escaped \\" a"
        }
        /*
        // More inline
        /*
        `

        let parsed = utils.parseJson(value)

        if (parsed.something == "abc") {
            done()
        } else {
            done("Result should have property something = 'abc'.")
        }
    })

    it("Parse JSON from object that returns JSON itself", function (done) {
        let obj = {}
        obj.toString = () => {
            return '{"something": "abc"}'
        }

        let parsed = utils.parseJson(obj)

        if (parsed.something == "abc") {
            done()
        } else {
            done("Result should have property something = 'abc'.")
        }
    })
})
