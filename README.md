# SetMeUp

[![Build Status](https://img.shields.io/travis/igoramadas/setmeup.svg?style=flat-square)](https://travis-ci.org/igoramadas/setmeup)
[![Coverage Status](https://img.shields.io/travis/igoramadas/setmeup.svg?style=flat-square)](https://coveralls.io/github/igoramadas/setmeup?branch=master)

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

## Watching updates to configuration files

    const onLoad = (filename, settingsJson) => {
        console.log(`Settings reloaded from disk: ${filename}`)
        console.dir(settingsJson)
    }

    // Will get triggered whenever a config file changes.
    setmeup.on("load", onLoad)

    // Pretend updating files.
    myApp.writeConfig("title", "New title")

## Loading from environment variables

Soon...
