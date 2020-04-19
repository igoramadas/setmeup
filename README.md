# SetMeUp

[![Version](https://img.shields.io/npm/v/setmeup.svg)](https://npmjs.com/package/setmeup)
[![Build Status](https://img.shields.io/travis/igoramadas/setmeup.svg)](https://travis-ci.org/igoramadas/setmeup)
[![Coverage Status](https://img.shields.io/coveralls/igoramadas/setmeup.svg)](https://coveralls.io/github/igoramadas/setmeup?branch=master)

Easy to use app settings module. Settings are stored and loaded from JSON files and / or environment variables, suppoort inline comments and can be (de)encrypted on-the-fly.

## Configuration files

By default SetMeUp will load configuration from 3 different JSON files, on the following order:

1. **settings.default.json** are mainly used by libraries to define their default settings.
2. **settings.json** should usually contain global settings for the current application.
3. **settings.NODE_ENV.json** should have application settings relevant only to the current environment.

A typical application will have at least the `settings.json` file, but most should also have a `settings.development.json` and one `settings.production.json` file as well. The `settings.default.json` is meant to be used mostly by libraries and sharead modules.

The configuration files can have inline comments (they're treated as JSON5).

## Basic usage

```javascript
const setmeup = require("setmeup")
const settings = setmeup.settings

// By default it will load from settings.default.json, settings.json and settings.NODE_ENV.json
// automatically. Here we load settings from a custom file as well.
setmeup.load("settings.custom.json")

// Sample server listens to port defined on settings.
myExpressApp.listen(settings.app.port)

// Actual settings can be changed on the fly.
settings.app.title = "My new App Title"
settings.myFTP = {
    host: "myhost.com",
    folder: "/something"
}
```

### Watching updates to configuration files

```javascript
const onLoad = (filename, settingsJson) => {
    console.log(`Settings reloaded from disk: ${filename}`)
    console.dir(settingsJson)
}

// Will get triggered whenever a config file changes.
setmeup.on("load", onLoad)

// Pretend updating files.
myApp.writeConfig("title", "New title")
```

### Loading from enviroment variables

You can also define settings via environment variables, by using the "SMU_" (or your own) prefix and using underscore for each new level on the settings tree. For example:

* app.id = $SMU_app_id
* app.server.hostname = $SMU_app_server_hostname

```json
{
    "app": {
        "id": "myapp",
        "server": {
            "hostname": "localhost"
        }
    }
}
```

So you could replicate the settings JSON above by executing:

    $ SMU_app_id=myapp SMU_app_server_hostname=localhost node index.js

Some code samples:

```javascript
// Load settings from environment variables using the default SMU_ prefix.
setmeup.loadFromEnv()

// Or specify your own prefix, for example if you have a
// variable MYAPP_general_debug for settings.general.debug.
setmeup.loadFromEnv("MYAPP")

// Sometimes we define variables all uppercased, so you can force
// lowercase them when parsing as settings. Here the variable
// SMU_APP_TITLE gets set to settings.app.title instead of settings.APP.TITLE.
setmeup.loadFromEnv(null, {lowercase: true})

// You can also disable overwriting settings already defined.
setmeup.loadFromEnv(null, {overwrite: false})
```

## Encrypting settings

The encryption features of SetMeUp can (and should!) be customized by defininig the following environment variables:

* SMU_CRYPTO_CIPHER - the cipher, default is aes256
* SMU_CRYPTO_KEY - the encryption key, default is based on the machine ID
* SMU_CRYPTO_IV - the IV, default is set on code

Please note that you MUST define the key and IV environment variables if you are running on the cloud (GCP, AWS etc...), as the machine ID will change whenever you reboot your instances. The defaults are there mostly to be used for local development.

### Encrypting and decrypting files on code

```javascript
// Derive encryption key from machine (default).
setmeup.encrypt("./settings.secret.json")

// And decrypt...
setmeup.decrypt("./settings.secret.json")

// Or using a custom key and IV.
let options = {key: "12345678901234561234567890123456", iv: "1234567890987654"}
setmeup.encrypt("./settings.secret.json", options)
setmeup.decrypt("./settings.secret.json", options)

// You can also load encrypted files by passing the crypto options.
let cryptoOptions = {crypto: options}
setmeup.encrypt("./settings.secret.json", options)
setmeup.load("./settings.secret.json", cryptoOptions)
```

### Using the command line tool

From inside your application root, on shell:

    $ ./node_modules/.bin/setmeup encrypt settings.secret.json
    $ ./node_modules/.bin/setmeup decrypt settings.secret.json

Or directly on NPM scripts (package.json):

```json
{
    "name": "mypackage",
    "version": "1.5.0",
    "scripts": {
        "build": "setmeup encrypt settings.secret.json"
    }
}

```

#### Security considerations

The main reason why `loadFromEnv()` is not called automatically like the `load()` is to avoid settings hijacking on shared environments. For instance an attacker could change things like URLs and credentials even if they had no permissions to access the settings files, simply by crafting some environment variables to replace the settings.

## API documentation

You can browse the full API documentation at https://setmeup.devv.com.

Or check these following modules that are using SetMeUp:

* [Expresser](https://github.com/igoramadas/expresser)
* [Monitorado](https://github.com/igoramadas/monitorado)
