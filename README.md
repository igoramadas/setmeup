# SetMeUp

[![Build Status](https://img.shields.io/travis/igoramadas/setmeup.svg?style=flat-square)](https://travis-ci.org/igoramadas/setmeup)
[![Coverage Status](https://img.shields.io/coveralls/igoramadas/setmeup.svg?style=flat-square)](https://coveralls.io/github/igoramadas/setmeup?branch=master)

Easy to use app settings module. Settings are mainly defined on JSON files, but can
also be loaded from environment variables.

## Loading from JSON files

    const setmeup = require("setmeup")
    const settings = setmeup.settings

    // By default it will load from settings.default.json, settings.json and settings.ENV.json.
    // Here we load settings from a custom file:
    // {
    //   "app": {
    //     "port": 8080,
    //     "title": "My App"
    //   }
    // }
    setmeup.load("settings.custom.json")

    // Server listens to port defined on settings.
    myExpressApp.listen(settings.app.port)

    // Actual settings are just a simple object.
    settings.app.title = "My new App Title"
    settings.myFTP = {
        host: "myhost.com",
        folder: "/something"
    }

## Watching updates to configuration files

    const onLoad = (filename, settingsJson) => {
        console.log(`Settings reloaded from disk: ${filename}`)
        console.dir(settingsJson)
    }

    // Will get triggered whenever a config file changes.
    setmeup.on("load", onLoad)

    // Pretend updating files.
    myApp.writeConfig("title", "New title")

## Encrypting and decrypting files

    // Derive encryption key from machine (default).
    setmeup.encrypt("./settings.private.json")

    // And decrypt...
    setmeup.decrypt("./settings.private.json")

    // Or using a custom key and IV.
    let options = {key: "12345678901234561234567890123456", iv: "1234567890987654"}
    setmeup.encrypt("./settings.private.json", options)
    setmeup.decrypt("./settings.private.json", options)

    // You can also load encrypted files by passing the crypto options.
    let cryptoOptions = {crypto: options}
    setmeup.encrypt("./settings.private.json", options)
    setmeup.load("./settings.private.json", cryptoOptions)

## API documentation

You can browse the full API documentation at https://setmeup.devv.com.

Or check these following modules that are using SetMeUp:

* [Expresser](https://travis-ci.org/igoramadas/expresser)
* [Monitorado](https://travis-ci.org/igoramadas/monitorado)
