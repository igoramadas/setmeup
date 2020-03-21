// SetMeUp: index.ts

import * as cryptoHelper from "./cryptohelper"
import * as utils from "./utils"
import _ from "lodash"
import EventEmitter from "eventemitter3"
import fs from "fs"

/** @hidden */
let env = process.env
/** @hidden */
let logger = null

/**
 * Represents a loaded file, used on [[files]].
 */
interface LoadedFile {
    /** Filename of the loaded settings file. */
    filename: string
    /** True if file is being watched for updates (see [[watch]]). */
    watching: boolean
}

/**
 * Represents loading from JSON options, used on [[load]].
 */
interface LoadOptions {
    /** Overwrite current settings with loaded ones? */
    overwrite?: boolean
    /** Root key of settings to be loaded. */
    rootKey?: string
    /** Decryption options in case file is encrypted. */
    crypto?: cryptoHelper.CryptoOptions | boolean
}

/**
 * Represents loading from environment options, used on [[loadFromEnv]].
 */
interface LoadEnvOptions {
    /** Overwrite current settings with loaded ones? */
    overwrite?: boolean
    /** Force environment variables to settings in lowercase? */
    lowercase?: boolean
}

/**
 * This is the main SetMeUp class.
 * * @example const setmeup = require("setmeup")
 */
class SetMeUp {
    private static _instance: SetMeUp = null
    /** @hidden */
    static get Instance() {
        return this._instance || (this._instance = new this())
    }

    /**
     * Returns a new fresh instance of the SetMeUp module.
     * @param doNotLoad Optional, if true will not load settings from file on new instance.
     * @returns New instance of SetMeUp with its own fresh settings.
     */
    newInstance(doNotLoad?: boolean): SetMeUp {
        return new SetMeUp(doNotLoad)
    }

    /**
     * Default SetMeUp constructor.
     * @param doNotLoad Optional, if true will not auto load settings from files and environment variables.
     */
    constructor(doNotLoad?: boolean) {
        if (!logger) {
            try {
                logger = require("anyhow")

                if (!logger.isReady) {
                    /* istanbul ignore next */
                    logger.setup()
                }
            } catch (ex) {
                // Anyhow module not found
            }
        }

        /* istanbul ignore else */
        if (env.NODE_ENV == "test") {
            doNotLoad = true
        }

        /* istanbul ignore if */
        if (!doNotLoad) {
            this.load()
        }
    }

    // PROPERTIES
    // --------------------------------------------------------------------------

    /** Internal, the actual settings storage object. */
    private _settings: any = {}

    /** Exposes the settings object. */
    get settings() {
        return this._settings
    }

    /** Event emitter. */
    events: EventEmitter = new EventEmitter()

    /** Array of loaded files. */
    files: LoadedFile[] = []

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
        this.events.on(eventName, callback)
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
     * from the defaults (settings.default.json, settings.json and settings.NODE_ENV.json).
     * @param filenames The filename or array of filenames, using relative or full path.
     * @param options Load options defining if properties should be overwritten, and root settings key.
     * @returns Returns the resulting JSON object of the loaded files, or null if nothing was loaded.
     * @event load
     */
    load = (filenames?: string | string[], options?: LoadOptions): any => {
        let result = {}

        // Set default options.
        if (!options) options = {}
        _.defaults(options, {overwrite: true, rootKey: ""})

        // No filenames passed? Load the default ones.
        /* istanbul ignore else */
        if (!filenames) {
            filenames = ["settings.default.json", "settings.json", `settings.${env.NODE_ENV}.json`]
        }
        // Make sure we're dealing with array of filenames by default.
        else if (_.isString(filenames)) {
            filenames = [filenames as string]
        }

        for (let f of filenames) {
            const filename = utils.getFilePath(f)
            let settingsJson = utils.loadJson(filename, options.crypto)

            // Add file to the `files` list, but only if not loaded previously.
            if (settingsJson != null) {
                if (_.find(this.files, {filename}) == null) {
                    this.files.push({filename, watching: false})
                } else {
                    logger.debug("SetMeUp.load", filename, "Loaded before, so won't add to the files list")
                }
            }

            // Extend loaded settings.
            if (options.rootKey) {
                utils.extend(settingsJson[options.rootKey], result, options.overwrite)
            } else {
                utils.extend(settingsJson, result, options.overwrite)
            }

            // Emit load passing filenames and loaded settings result.
            this.events.emit("load", filename, result)
        }

        // Nothing loaded? Return null.
        if (_.keys(result).length < 1) {
            return null
        }

        // Extend loaded settings.
        utils.extend(result, this.settings, options.overwrite)

        // Return the JSON representation of the loaded settings.
        return result
    }

    /**
     * Load settings from environment variables, restricting to the passed prefix.
     * Enviroment settings as variables will be split by underscore to define its tree.
     * @param prefix The prefix use to match relevant environment variables. Default is "SMU_", should always end with "_" (underscore).
     * @param options Load options defining if properties should be overwritten and forced to lowercase.
     * @event loadFromEnv
     */
    loadFromEnv = (prefix?: string, options?: LoadEnvOptions): any => {
        let result = {}
        let keys = _.keys(process.env)

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
        _.defaults(options, {overwrite: true, lowercase: false})

        // Iterate and process relevant variables.
        // Each underscore defines a level on the result tree.
        for (let key of keys) {
            if (key.substring(0, prefix.length) == prefix) {
                let target = result
                let arr = key.substring(prefix.length).split("_")

                // Force lowercase if defined on options.
                if (options.lowercase)
                    for (let i = 0; i < arr.length; i++) {
                        arr[i] = arr[i].toLowerCase()
                    }

                let limit = arr.length - 1

                // Iterate keys to make the settings tree, making sure each sub-key exists.
                for (let i = 0; i < limit; i++) {
                    if (typeof target[arr[i]] === "undefined" || target[arr[i]] === null) {
                        target[arr[i]] = {}
                    }

                    target = target[arr[i]]
                }

                target[arr.pop()] = process.env[key]
            }
        }

        // Emit load passing prefix and loaded settings result.
        this.events.emit("loadFromEnv", prefix, result)

        // Nothing loaded? Return null.
        if (_.keys(result).length < 1) {
            return null
        }

        // Extend loaded settings.
        utils.extend(result, this.settings, options.overwrite)

        // Return the JSON representation of the loaded settings.
        return result
    }

    /**
     * Reset to default settings by unwatching and clearing all settings.
     * Ideally you should call [[load]] / [[loadFromEnv]] after resetting,
     * otherwise it will most certainly break your application.
     * @event reset
     */
    reset = (): void => {
        const parentKeys = Object.keys(this._settings)
        logger.warn("Settings.reset", `Will clear ${parentKeys.length} parent keys.`)

        this.unwatch()
        this.files = []

        try {
            parentKeys.forEach(function(key) {
                delete this._settings[key]
            })
        } catch (ex) {
            logger.error("Settings.reset", ex)
        }

        this.events.emit("reset")
    }

    // ENCRYPTION
    // --------------------------------------------------------------------------

    /**
     * Encrypts the specified settings file.
     * @param filename The file to be encrypted.
     * @param options Options cipher, key and IV to be passed to the encryptor.
     */
    encrypt = (filename: string, options: cryptoHelper.CryptoOptions): void => {
        const result = JSON.stringify(cryptoHelper.CryptoMethod("encrypt", filename, options), null, 4)
        fs.writeFileSync(filename, result, {encoding: "utf8"})
    }

    /**
     * Decrypts the specified settings file.
     * @param filename The file to be decrypted.
     * @param options Options cipher, key and IV to be passed to the decryptor.
     */
    decrypt = (filename: string, options: cryptoHelper.CryptoOptions): void => {
        const result = JSON.stringify(cryptoHelper.CryptoMethod("decrypt", filename, options), null, 4)
        fs.writeFileSync(filename, result, {encoding: "utf8"})
    }

    // FILE WATCHER
    // --------------------------------------------------------------------------

    /**
     * Watch loaded settings files for changes by using a file watcher.
     * When files change, [[load]] will be called to get the updates.
     */
    watch = (): void => {
        // Iterate loaded files to create the file system watchers.
        for (let f of Array.from(this.files)) {
            ;((f) => {
                const filename = utils.getFilePath(f.filename)

                if (filename != null && !f.watching) {
                    f.watching = true

                    return fs.watchFile(filename, {persistent: true}, () => {
                        this.load(filename)

                        /* istanbul ignore else */
                        if (logger) {
                            logger.info("Settings.watch", f, "Reloaded")
                        }
                    })
                }
            })(f)
        }

        /* istanbul ignore else */
        if (logger) {
            logger.info("Settings.watch")
        }
    }

    /**
     * Unwatch changes on loaded settings files.
     */
    unwatch = (): void => {
        try {
            for (let f of Array.from(this.files)) {
                const filename = utils.getFilePath(f.filename)
                f.watching = false

                if (filename != null) {
                    fs.unwatchFile(filename)
                }
            }
        } catch (ex) {
            /* istanbul ignore next */
            if (logger) {
                logger.error("Settings.unwatch", ex)
            }
        }

        /* istanbul ignore else */
        if (logger) {
            logger.info("Settings.unwatch")
        }
    }
}

// Exports...
export = SetMeUp.Instance
