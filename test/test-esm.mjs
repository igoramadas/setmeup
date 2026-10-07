import assert from "node:assert/strict"
import {createRequire} from "node:module"
import {dirname, resolve} from "node:path"
import {fileURLToPath} from "node:url"
import setmeup from "setmeup"

const require = createRequire(import.meta.url)
const testDir = dirname(fileURLToPath(import.meta.url))

assert.strictEqual(setmeup, require("setmeup"))
setmeup.load(resolve(testDir, "settings.test.json"), {overwrite: true})
assert.strictEqual(setmeup.settings.something.number, 1)
