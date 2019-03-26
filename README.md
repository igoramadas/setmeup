# SetMeUp

[![Build Status](https://img.shields.io/travis/igoramadas/setmeup.svg?style=flat-square)](https://travis-ci.org/igoramadas/setmeup)
[![Coverage Status](https://img.shields.io/travis/igoramadas/setmeup.svg?style=flat-square)](https://coveralls.io/github/igoramadas/setmeup?branch=master)

Easy to use app settings module. Settings are mainly defined on JSON files, but can
also be loaded from environment variables.

## Loading from JSON files

    setmeup = require("setmeup")

    // By default it will load from settings.default.json, settings.json and settings.ENV.json.
    // Here we load settings from a custom file:
    // {
    //   "app": {
    //     "port": 8080,
    //     "title": "My App"
    //   }
    // }
    setmeup.load("settings.custom.json")

    settings = setmeup.settings

    // Server listens to port defined on settings.
    myExpressApp.listen(settings.app.port)

## Loading from environment variables

Soon...
