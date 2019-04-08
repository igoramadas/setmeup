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
            let settingsJson = utils.loadJson(filename, options.crypto);
            if (settingsJson != null) {
                if (_.find(this.files, { filename }) == null) {
                    this.files.push({ filename, watching: false });
                }
                else {
                    logger.debug("SetMeUp.load", filename, "Loaded before, so won't add to the files list");
                }
            }
            if (logger) {
                logger.info("SetMeUp.load", filename, "Loaded");
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
        const result = JSON.stringify(crypto.CryptoMethod("encrypt", filename, options), null, 4);
        fs.writeFileSync(filename, result, { encoding: "utf8" });
    }
    decrypt(filename, options) {
        const result = JSON.stringify(crypto.CryptoMethod("decrypt", filename, options), null, 4);
        fs.writeFileSync(filename, result, { encoding: "utf8" });
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
                        if (logger) {
                            logger.info("Settings.watch", f, "Reloaded");
                        }
                    });
                }
            })(f);
        }
        if (logger) {
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
        if (logger) {
            return logger.info("Settings.unwatch");
        }
    }
}
SetMeUp._instance = null;
module.exports = SetMeUp.Instance;
