"use strict";
const crypto = require("./crypto");
const utils = require("./utils");
const EventEmitter = require("eventemitter3");
const _ = require("lodash");
const fs = require("fs");
let env = process.env;
let logger = null;
class SetMeUp {
    constructor(doNotLoad) {
        this._settings = {};
        this.events = new EventEmitter();
        this.files = [];
        if (!logger) {
            try {
                logger = require("anyhow");
            }
            catch (ex) {
            }
        }
        if (!doNotLoad) {
            this.load();
        }
    }
    static get Instance() {
        return this._instance || (this._instance = new this());
    }
    newInstance(doNotLoad) {
        return new SetMeUp(doNotLoad);
    }
    get settings() {
        return this._settings;
    }
    on(eventName, callback) {
        this.events.on(eventName, callback);
    }
    off(eventName, callback) {
        this.events.off(eventName, callback);
    }
    load(filenames, options) {
        let result = {};
        if (!options)
            options = {};
        _.defaults(options, { overwrite: true, rootKey: "" });
        if (!filenames) {
            filenames = ["settings.default.json", "settings.json", `settings.${env.NODE_ENV}.json`];
        }
        else if (_.isString(filenames)) {
            filenames = [filenames];
        }
        for (let filename of filenames) {
            let settingsJson = utils.loadJson(filename);
            if (settingsJson != null && _.find(this.files, { filename }) == null) {
                this.files.push({ filename, watching: false });
            }
            if (env.NODE_ENV != "test" && logger) {
                logger.debug("SetMeUp.load", filename);
            }
            if (options.rootKey) {
                utils.extend(settingsJson[options.rootKey], result, options.overwrite);
            }
            else {
                utils.extend(settingsJson, result, options.overwrite);
            }
            this.events.emit("load", filename, result);
        }
        if (_.keys(result).length < 1) {
            return null;
        }
        utils.extend(result, this.settings, options.overwrite);
        return result;
    }
    reset() {
        this.unwatch();
        this.files = [];
        this._settings = {};
        this.events.emit("reset");
    }
    encrypt(filename, options) {
        crypto.CryptoMethod("encrypt", filename, options);
    }
    decrypt(filename, options) {
        crypto.CryptoMethod("decrypt", filename, options);
    }
    watch() {
        for (let f of Array.from(this.files)) {
            ;
            (f => {
                const filename = utils.getFilePath(f.filename);
                if (filename != null && !f.watching) {
                    f.watching = true;
                    return fs.watchFile(filename, { persistent: true }, () => {
                        this.load(filename);
                        if (env.NODE_ENV != "test" && logger) {
                            logger.info("Settings.watch", f, "Reloaded");
                        }
                    });
                }
            })(f);
        }
        if (env.NODE_ENV != "test" && logger) {
            logger.info("Settings.watch");
        }
    }
    unwatch() {
        try {
            for (let f of Array.from(this.files)) {
                const filename = utils.getFilePath(f.filename);
                f.watching = false;
                if (filename != null) {
                    fs.unwatchFile(filename);
                }
            }
        }
        catch (ex) {
            if (logger) {
                logger.error("Settings.unwatch", ex);
            }
        }
        if (env.NODE_ENV != "test" && logger) {
            return logger.info("Settings.unwatch");
        }
    }
}
SetMeUp._instance = null;
module.exports = SetMeUp.Instance;
