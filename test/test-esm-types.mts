import setmeup from "setmeup"
import type {CryptoOptions, InfisicalOptions, LoadEnvOptions, LoadOptions, LoadedFile, SetMeUp} from "setmeup"

const crypto: CryptoOptions = {key: "key"}
const options: LoadOptions = {overwrite: false, crypto}
const envOptions: LoadEnvOptions = {lowercase: true}
const infisicalOptions: InfisicalOptions = {environment: "staging", lowercase: true}
const instance: SetMeUp = setmeup.newInstance()
const files: LoadedFile[] = instance.files

setmeup.load("settings.test.json", options)
setmeup.loadFromEnv("SMU", envOptions)
setmeup.loadFromInfisical(infisicalOptions)
setmeup.settings.app
files.length
