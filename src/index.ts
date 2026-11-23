// SetMeUp: index.ts

import {CryptoAction, cryptoMethod} from "./cryptohelper"
import {getInfisicalConnection, getInfisicalSecrets, infisicalLogin, infisicalRequest, parseInfisicalValue} from "./infisical"
import {CryptoOptions, InfisicalOptions, LoadedFile, LoadEnvOptions, LoadOptions} from "./types"
import {extend, flattenSettings, getFilePath, isArray, isPlainObject, isString, isUnsafeKey, loadFile, parseEnvValue} from "./utils"
import EventEmitter from "eventemitter3"
import fs from "fs"
import path from "path"

const defaultOptions = {overwrite: true, lowercase: false, rootKey: ""}

/** @hidden */
let rootFolder = process.cwd()
/** @hidden */
let env = process.env
/** @hidden */
let logger = null

/**
 * This is the main SetMeUp class.
 */
class SetMeUp {
    private static _instance: SetMeUp = null
    /** @hidden */
    static get Instance() {
        return this._instance || (this._instance = new this())
    }

    /**
     * Returns a new fresh instance of the SetMeUp module.
     * @returns New instance of SetMeUp with its own fresh settings.
     */
    newInstance(): SetMeUp {
        return new SetMeUp()
    }

    /**
     * Default SetMeUp constructor.
     */
    constructor() {
        if (!logger) {
            try {
                logger = require("anyhow")

                if (!logger.isReady) {
                    /* istanbul ignore next */
                    logger.setup()
                }
            } catch (ex) {
                /* istanbul ignore next */
                if (env.NODE_ENV != "production") {
                    console.warn("Module 'anyhow' is not installed, consider installing the 'anyhow' if you want to enable custom logging")
                }
            }
        }

        // Read only file system? Set readOnly to true.
        try {
            fs.accessSync(rootFolder, fs.constants.W_OK)
        } catch (err) {
            /* istanbul ignore next */
            this.readOnly = true
            if (logger) logger.info("SetMeUp", "File system seems to be read only", "Setting readOnly = true")
        }
    }

    // PROPERTIES
    // --------------------------------------------------------------------------

    /** Internal, the actual settings storage object. */
    private _settings: any = {}

    /** Internal, file watcher listeners by filename. */
    private _watchers: Map<string, fs.StatsListener> = new Map()

    /**
     * Exposes the settings object.
     */
    get settings() {
        return this._settings
    }

    /**
     * Event emitter.
     */
    events: EventEmitter = new EventEmitter()

    /**
     * Array of loaded files.
     */
    files: LoadedFile[] = []

    /**
     * Flag to avoid writing settings to disk.
     */
    readOnly: boolean = false

    // EVENTS
    // --------------------------------------------------------------------------

    /**
     * Bind callback to event. Shortcut to `events.on()`.
     * @param eventName The name of the event ([[load]], [[reset]]).
     * @param callback Callback function.
     */
    on = (eventName: string, callback: EventEmitter.ListenerFn): void => {
        this.events.on(eventName, callback)
    }

    /**
     * Bind callback to event that will be triggered only once. Shortcut to `events.once()`.
     * @param eventName The name of the event.
     * @param callback Callback function.
     */
    once = (eventName: string, callback: EventEmitter.ListenerFn): void => {
        this.events.once(eventName, callback)
    }

    /**
     * Unbind callback from event. Shortcut to `events.off()`.
     * @param eventName The name of the event ([[load]], [[reset]]).
     * @param callback Callback function.
     */
    off = (eventName: string, callback: EventEmitter.ListenerFn): void => {
        this.events.off(eventName, callback)
    }

    // MAIN METHODS
    // --------------------------------------------------------------------------

    /**
     * Load settings from the specified JSON file(s). If not files are specified, load
     * from the defaults (settings.default.json, settings.json and settings.APP_ENV.json OR settings.NODE_ENV.json).
     * @param filenames The filename or array of filenames, using relative or full path.
     * @param options Load options defining if properties should be overwritten, and root settings key.
     * @returns Returns the resulting JSON object of the loaded files, or null if nothing was loaded.
     * @event load
     */
    load = (filenames?: string | string[], options?: LoadOptions): any => {
        let loadedFilenames = []
        let result = {}

        // Set default options.
        if (!options) options = {}
        options = Object.assign({...defaultOptions}, options)

        // No filenames passed? Load the default ones.
        /* istanbul ignore else */
        if (!filenames) {
            filenames = ["settings.default.json", "settings.json", `settings.${env.APP_ENV || env.NODE_ENV}.json`, `settings.secret.json`]
        }
        // Make sure we're dealing with array of filenames by default.
        else if (isString(filenames)) {
            filenames = [filenames as string]
        }

        // Option destroy can't be used in readOnly.
        if (this.readOnly && options.destroy) {
            /* istanbul ignore next */
            if (logger) logger.warn("SetMeUp.load", "Option 'destroy' can't be used while in readOnly mode", `${filenames.length} file(s) will not be destroyed after loading`)
        }

        // Iterate and parse files.
        for (let f of filenames) {
            const filename = getFilePath(f)
            const isSecret = (filename && path.basename(filename).toLowerCase() == "settings.secret.json") || null

            // When loading, force crypto if file is settings.secret.json.
            let settingsJson = loadFile(filename, options.crypto || isSecret)

            // File not found?
            if (settingsJson == null) {
                if (logger) logger.debug("SetMeUp.load", `File not found, won't load ${filename}`)
                continue
            }

            // Add file to the `files` list, but only if not loaded previously.
            if (!options.destroy) {
                const existing = this.files.find((file) => file.filename == filename)

                if (!existing) {
                    this.files.push({filename: filename, watching: false, options: options})
                } else {
                    existing.options = options
                    if (logger) logger.debug("SetMeUp.load", filename, "Loaded before, so won't add to the files list")
                }
            }

            // Extend loaded settings, before emitting so listeners get the updated settings.
            const data = options.rootKey ? settingsJson[options.rootKey] : settingsJson
            extend(data, result, options.overwrite)
            extend(data, this.settings, options.overwrite)

            // Emit load passing filenames and loaded settings result.
            this.events.emit("load", filename, result)

            // Delete file after loading?
            if (options.destroy) {
                try {
                    if (!this.readOnly) {
                        fs.unlinkSync(filename)
                    }
                } catch (ex) {
                    /* istanbul ignore next */
                    if (logger) logger.error("SetMeUp.load", `Could not destroy ${filename}`, ex)
                }
            }
            // File settings.secret.json is auto encrypted if readOnly is not set.
            else if (isSecret && !this.readOnly) {
                try {
                    const cryptoOptions = options.crypto === true ? {} : (options.crypto as CryptoOptions)
                    this.encrypt(filename, cryptoOptions)
                } catch (ex) {
                    /* istanbul ignore next */
                    if (logger) logger.warn("SetMeUp.load", `Could not automatically encrypt the settings.secret.json file`, ex)
                }
            }

            loadedFilenames.push(filename.replace(rootFolder, ""))
        }

        // Nothing loaded? Return null.
        if (Object.keys(result).length < 1) {
            return null
        }

        if (logger) logger.info("SetMeUp.load", "Loaded", loadedFilenames.join(", "))

        // Return the JSON representation of the loaded settings.
        return result
    }

    /**
     * Load settings directly from the passed JSON object.
     * @param data JSON data to be loaded to the settings.
     * @param options Load options defining if properties should be overwritten, and root settings key.
     * @returns Returns the loaded JSON object itself.
     * @event loadJson
     */
    loadJson = (data: any, options?: LoadOptions): any => {
        if (!data) return data

        // Set default options.
        if (!options) options = {}
        options = Object.assign({...defaultOptions}, options)

        // Extend loaded settings.
        const loaded = options.rootKey ? data[options.rootKey] : data
        extend(loaded, this.settings, options.overwrite)

        // Emit load passing prefix and loaded settings result.
        this.events.emit("loadJson", data)

        if (logger) logger.info("SetMeUp.loadJson", `Loaded keys: ${Object.keys(loaded || {NONE: true}).join(", ")}`)

        return data
    }

    /**
     * Load settings from environment variables, restricting to the passed prefix.
     * Environment settings as variables will be split by underscore to define its tree.
     * @param prefix The prefix use to match relevant environment variables. Default is "SMU_", should always end with "_" (underscore).
     * @param options Load options defining if properties should be overwritten and forced to lowercase.
     * @event loadFromEnv
     */
    loadFromEnv = (prefix?: string, options?: LoadEnvOptions): any => {
        // Use "SMU_" as default prefix.
        if (!prefix || prefix == "") {
            prefix = "SMU_"
        }
        // Make sure prefix ends with underscore!
        else if (prefix.substring(prefix.length - 1) != "_") {
            prefix += "_"
        }

        // Set default options.
        if (!options) options = {}
        options = Object.assign({...defaultOptions}, options)

        // Sort and process relevant variables, without the prefix.
        // The Infisical connection variables are never loaded as settings.
        const keys = Object.keys(process.env)
            .filter((key) => key.startsWith(prefix) && !key.startsWith("SMU_INFISICAL_"))
            .sort()
        const entries = keys.map((key): [string, any] => [key.substring(prefix.length), parseEnvValue(process.env[key])])
        const {result, loadedKeys} = this.parseFlatKeys(entries, options.lowercase, "SetMeUp.loadFromEnv")
        const hasResult = Object.keys(result).length > 0

        // Extend loaded settings before emitting so listeners get the updated settings.
        if (hasResult) {
            extend(result, this.settings, options.overwrite)
            if (logger) logger.info("SetMeUp.loadFromEnv", "Loaded", loadedKeys.join(", "))
        }

        // Emit load passing prefix and loaded settings result.
        this.events.emit("loadFromEnv", prefix, result)

        // Return the JSON representation of the loaded settings, or null if nothing was loaded.
        return hasResult ? result : null
    }

    /**
     * Load settings from an Infisical project, with keys split by underscore the same way as on [[loadFromEnv]] (without a prefix).
     * For instance the secret "app_server_hostname" is loaded as settings.app.server.hostname. JSON arrays are loaded as arrays.
     * Does nothing if no Infisical client ID was set via options or $SMU_INFISICAL_CLIENT_ID.
     * @param options Infisical connection options, and load options defining if properties should be overwritten and forced to lowercase.
     * @returns Returns the loaded settings, or null if nothing was loaded.
     * @event loadFromInfisical
     */
    loadFromInfisical = async (options?: InfisicalOptions): Promise<any> => {
        options = Object.assign({...defaultOptions}, options)

        const connection = getInfisicalConnection(options)
        if (!connection) {
            if (logger) logger.debug("SetMeUp.loadFromInfisical", "No Infisical client ID set, won't load")
            return null
        }

        const values = await getInfisicalSecrets(connection, await infisicalLogin(connection))
        const entries = [...values].map(([key, value]): [string, any] => [key, parseInfisicalValue(value)])
        const {result, loadedKeys} = this.parseFlatKeys(entries, options.lowercase, "SetMeUp.loadFromInfisical")
        const hasResult = Object.keys(result).length > 0

        // Extend loaded settings before emitting so listeners get the updated settings.
        if (hasResult) {
            extend(result, this.settings, options.overwrite)
            if (logger) logger.info("SetMeUp.loadFromInfisical", `${connection.environment}${connection.secretPath}`, "Loaded", loadedKeys.join(", "))
        }

        this.events.emit("loadFromInfisical", result)

        return hasResult ? result : null
    }

    /**
     * Save the passed settings to an Infisical project, creating or updating the secrets, and merge them into the current settings.
     * Keys are joined by underscore, so settings.app.server.hostname is saved as "app_server_hostname".
     * Arrays are saved as JSON, null values are skipped. Secrets that already have the same (expanded) value are not saved again.
     * Fails if a value has leading or trailing whitespace (Infisical trims values), or if existing secrets nested under
     * a saved key would take precedence over it when loading.
     * @param data Settings to be saved. Pass the settings object itself to save all current settings.
     * @param options Infisical connection options.
     * @returns Returns the saved (changed) secret keys.
     * @event saveToInfisical
     */
    saveToInfisical = async (data: any, options?: InfisicalOptions): Promise<string[]> => {
        const connection = getInfisicalConnection(options)
        if (!connection) {
            throw new Error("Infisical clientId is required to save settings")
        }

        const entries = flattenSettings(data).map(([key, value]): [string, string] => [key, isArray(value) ? JSON.stringify(value) : String(value)])
        if (entries.length == 0) {
            this.events.emit("saveToInfisical", [])
            return []
        }

        const untrimmed = entries.filter(([, value]) => value != value.trim()).map(([key]) => key)
        if (untrimmed.length > 0) {
            throw new Error(`Infisical trims secret values, can't save values with leading or trailing whitespace: ${untrimmed.join(", ")}`)
        }

        const accessToken = await infisicalLogin(connection)
        const existing = await getInfisicalSecrets(connection, accessToken)

        // Existing nested secrets win over a parent value when loading, so a parent can't replace them.
        const savedKeys = entries.map(([key]) => key)
        const conflicts = [...existing.keys()].filter((existingKey) => !savedKeys.includes(existingKey) && savedKeys.some((key) => existingKey.startsWith(`${key}_`)))
        if (conflicts.length > 0) {
            throw new Error(`Existing Infisical secrets would override the saved values, remove them first: ${conflicts.join(", ")}`)
        }

        // Skip unchanged values, so imported and referenced secrets are not copied as literals.
        const secrets = entries.filter(([key, value]) => existing.get(key) !== value).map(([key, value]) => ({secretKey: key, secretValue: value}))
        const keys = secrets.map((secret) => secret.secretKey)

        if (secrets.length > 0) {
            const body = {projectId: connection.projectId, environment: connection.environment, secretPath: connection.secretPath, mode: "upsert", secrets: secrets}
            const response = await infisicalRequest(connection, accessToken, "PATCH", "/api/v4/secrets/batch", body)

            // Changes to folders requiring approval are only stored once approved.
            if (response?.approval && logger) {
                logger.warn("SetMeUp.saveToInfisical", `${connection.environment}${connection.secretPath}`, "Changes pending approval", keys.join(", "))
            } else if (logger) {
                logger.info("SetMeUp.saveToInfisical", `${connection.environment}${connection.secretPath}`, "Saved", keys.join(", "))
            }
        }

        if (data !== this.settings) {
            extend(data, this.settings, true)
        }

        this.events.emit("saveToInfisical", keys)

        return keys
    }

    /**
     * Build a settings tree out of flat keys, where each underscore defines a level on the tree.
     * @param entries Array of key and (already parsed) value pairs.
     * @param lowercase Force keys to lowercase?
     * @param source Caller name used for logging.
     * @returns The settings tree and the list of loaded keys.
     */
    private parseFlatKeys = (entries: [string, any][], lowercase: boolean, source: string): {result: any; loadedKeys: string[]} => {
        const loadedKeys = []
        const result = {}

        for (let [key, value] of entries) {
            let arr = key.split("_")

            // Force lowercase if defined on options.
            if (lowercase) {
                arr = arr.map((part) => part.toLowerCase())
            }

            if (arr.some(isUnsafeKey)) {
                if (logger) logger.warn(source, `Skipping unsafe key ${key}`)
                continue
            }

            loadedKeys.push(key)

            const lastKey = arr.pop()
            let target = result

            // Iterate keys to make the settings tree, making sure each sub-key is an object.
            for (let part of arr) {
                if (!isPlainObject(target[part])) {
                    target[part] = {}
                }

                target = target[part]
            }

            // Nested values win over a parent value, regardless of the keys order.
            if (!isPlainObject(target[lastKey])) {
                target[lastKey] = value
            }
        }

        return {result, loadedKeys}
    }

    /**
     * Reset to default settings by unwatching and clearing all settings.
     * Ideally you should call [[load]] / [[loadFromEnv]] after resetting,
     * otherwise it will most certainly break your application.
     * @event reset
     */
    reset = (): void => {
        const parentKeys = Object.keys(this._settings)

        if (logger) logger.warn("SetMeUp.reset", `Will clear ${parentKeys.length} parent keys.`)

        this.unwatch()
        this.files = []

        try {
            for (let key of parentKeys) {
                delete this._settings[key]
            }
        } catch (ex) {
            /* istanbul ignore next */
            if (logger) logger.error("SetMeUp.reset", ex)
        }

        this.events.emit("reset")
    }

    // ENCRYPTION
    // --------------------------------------------------------------------------

    /**
     * Encrypts the specified settings file. Does not work if in readOnly mode.
     * @param filename The file to be encrypted.
     * @param options Options cipher, key and IV to be passed to the encryptor.
     */
    encrypt = (filename: string, options?: CryptoOptions): void => {
        this.cryptoFile("encrypt", filename, options)
    }

    /**
     * Decrypts the specified settings file. Does not work if in readOnly mode.
     * @param filename The file to be decrypted.
     * @param options Options cipher, key and IV to be passed to the decryptor.
     */
    decrypt = (filename: string, options?: CryptoOptions): void => {
        this.cryptoFile("decrypt", filename, options)
    }

    /**
     * Run the crypto action against the file, and write it only if its contents changed.
     */
    private cryptoFile = (action: CryptoAction, filename: string, options?: CryptoOptions): void => {
        if (this.readOnly) {
            if (logger) logger.warn(`SetMeUp.${action}`, `Can't ${action} while in readOnly mode`, filename)
            return
        }

        const result = JSON.stringify(cryptoMethod(action, filename, options), null, 4)

        if (fs.readFileSync(filename, {encoding: "utf8"}) != result) {
            fs.writeFileSync(filename, result, {encoding: "utf8"})
        }
    }

    // FILE WATCHER
    // --------------------------------------------------------------------------

    /**
     * Watch loaded settings files for changes by using a file watcher.
     * When files change, [[load]] will be called to get the updates.
     */
    watch = (): void => {
        // Iterate loaded files to create the file system watchers.
        for (let f of this.files) {
            const filename = getFilePath(f.filename)

            if (filename != null && !f.watching) {
                f.watching = true

                const listener = () => {
                    try {
                        this.load(filename, f.options)

                        /* istanbul ignore else */
                        if (logger) logger.info("SetMeUp.watch", filename, "Reloaded")
                    } catch (ex) {
                        /* istanbul ignore next */
                        if (logger) logger.error("SetMeUp.watch", filename, "Failed to reload", ex)
                    }
                }

                this._watchers.set(filename, listener)
                fs.watchFile(filename, {persistent: true}, listener)
            }
        }

        /* istanbul ignore else */
        if (logger) logger.info("SetMeUp.watch", `Watching ${this.files.length} settings files`)
    }

    /**
     * Unwatch changes on loaded settings files.
     */
    unwatch = (): void => {
        for (let f of this.files) {
            f.watching = false
        }

        // Remove only our own listeners, as other instances or the app might also watch the same files.
        for (let [filename, listener] of this._watchers) {
            fs.unwatchFile(filename, listener)
        }
        this._watchers.clear()

        /* istanbul ignore else */
        if (logger) logger.info("SetMeUp.unwatch")
    }
}

/** @hidden */
type SetMeUpClass = SetMeUp
/** @hidden */
type CryptoOptionsType = CryptoOptions
/** @hidden */
type LoadedFileType = LoadedFile
/** @hidden */
type InfisicalOptionsType = InfisicalOptions
/** @hidden */
type LoadEnvOptionsType = LoadEnvOptions
/** @hidden */
type LoadOptionsType = LoadOptions

// Exports...
const setmeup = SetMeUp.Instance

// Type-only namespace merged with the instance, so types can be imported by name.
declare namespace setmeup {
    export type SetMeUp = SetMeUpClass
    export type CryptoOptions = CryptoOptionsType
    export type InfisicalOptions = InfisicalOptionsType
    export type LoadedFile = LoadedFileType
    export type LoadEnvOptions = LoadEnvOptionsType
    export type LoadOptions = LoadOptionsType
}

export = setmeup
