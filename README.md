# SetMeUp

[![Version](https://img.shields.io/npm/v/setmeup.svg)](https://npmjs.com/package/setmeup)
[![Coverage Status](https://coveralls.io/repos/github/igoramadas/setmeup/badge.svg?branch=master)](https://coveralls.io/github/igoramadas/setmeup?branch=master)
[![Build Status](https://github.com/igoramadas/setmeup/actions/workflows/build.yml/badge.svg)](https://github.com/igoramadas/setmeup/actions)

Easy to use app settings module. Settings are stored and loaded from JSON files and / or environment variables, support inline comments and can be (de)encrypted on-the-fly.

## Configuration files

By default SetMeUp will load configuration from 4 different JSON files, on the following order:

1. **settings.default.json** are mainly used by libraries to define their default settings.
2. **settings.json** should usually contain global settings for the current application.
3. **settings.APP_ENV.json** (or **settings.NODE_ENV.json** if `APP_ENV` is not set) should have application settings relevant only to the current environment.
4. **settings.secret.json** secrets and credentials, this file is automatically encrypted on load.

A typical application will have at least the `settings.json` file, but most should also have a `settings.development.json` and one `settings.production.json` file as well. The `settings.default.json` is meant to be used mostly by libraries and shared modules.

**Please note:** the configuration files can have `//` and `/* */` comments. Other JSON5 features (trailing commas, unquoted keys, etc) are not supported.

## Basic usage

```javascript
// CommonJS
const setmeup = require("setmeup")

// Or ESM
import setmeup from "setmeup"

const settings = setmeup.settings

// Settings are not loaded automatically, so load the default files (settings.default.json,
// settings.json, settings.APP_ENV.json or settings.NODE_ENV.json, and settings.secret.json).
setmeup.load()

// Here we load settings from a custom file as well.
setmeup.load("settings.custom.json")

// Or directly from a JSON object.
setmeup.loadJson({app: {title: "My App"}})

// Sample server listens to port defined on settings.
myExpressApp.listen(settings.app.port)

// Actual settings can be changed on the fly.
settings.app.title = "My new App Title"
settings.myFTP = {
    host: "myhost.com",
    folder: "/something"
}
```

## TypeScript

Types are bundled, and can be imported by name both on CommonJS and ESM:

```typescript
import setmeup from "setmeup"
import type {CryptoOptions, LoadedFile, LoadEnvOptions, LoadOptions, SetMeUp} from "setmeup"

const options: LoadOptions = {overwrite: false}
const instance: SetMeUp = setmeup.newInstance()
```

## Logging

If the [anyhow](https://npmjs.com/package/anyhow) module is installed, SetMeUp will use it for logging, and will set it up with its defaults in case it's not ready yet. So if your project also uses anyhow, make sure you call `anyhow.setup()` very early on your application startup, before importing SetMeUp (or any module that uses it), otherwise your own logging options might get ignored.

## Read only mode

SetMeUp will automatically switch to read only mode if the app root folder (current working directory) is not writable.

```javascript
const setmeup = require("setmeup")

// Enabling readOnly mode will prevent SetMeUp from ever writing to disk.
setmeup.readOnly = true

// File settings.secret.json (if present) will not be auto encrypted.
setmeup.load()

// Calling encrypt in readOnly mode won't work now.
setmeup.encrypt("settings.custom.json")
```

### Watching updates to configuration files

```javascript
const onLoad = (filename, settingsJson) => {
    console.log(`Settings reloaded from disk: ${filename}`)
    console.dir(settingsJson)
}

// Will get triggered whenever a config file changes, after the settings were updated.
setmeup.on("load", onLoad)

// Only loaded files are watched, so load them first.
setmeup.load()

// Start watching the loaded files. Files are reloaded using the same options
// they were originally loaded with.
setmeup.watch()

// Stop watching when the app shuts down.
process.on("SIGTERM", () => setmeup.unwatch())
```

### Loading from environment variables

You can also define settings via environment variables, by using the "SMU\_" (or your own) prefix and using underscore for each new level on the settings tree. For example:

- app.id = $SMU_app_id
- app.server.hostname = $SMU_app_server_hostname

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

Values `true` and `false` (case insensitive) are loaded as booleans, and numeric values as numbers. Values that would change when converted to a number (like `007` or very large IDs) are kept as strings. If a variable is set both as a value and as a parent (for example `SMU_app=x` and `SMU_app_id=y`), the nested one wins.

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

The encryption features of SetMeUp can (and should!) be customized by defining the following environment variables:

- SMU_CRYPTO_KEY - the encryption key, default is based on the machine ID
- SMU_CRYPTO_CIPHER - the cipher for legacy `enc-` values only, default is aes256
- SMU_CRYPTO_IV - the IV for legacy `enc-` values only, default is set on code

Please note that you MUST define the key environment variable if you are running on the cloud (GCP, AWS etc...), as the machine ID will change whenever you reboot your instances. The defaults are there mostly to be used for local development.

Values are encrypted with AES-256-GCM, using a random IV per value, and saved with the `enc2-` prefix. The key can have any length, as the actual encryption key is derived from it. Booleans and nulls are not encrypted.

The file `settings.secret.json` (if there's one) will be encrypted automatically by SetMeUp after `load()`. So if you want to manually change some of its values, you can simply edit the desired keys as plain text, and on the next application start it will get encrypted again.

### Legacy encrypted values (enc-)

Files encrypted by SetMeUp 1.x (values with the `enc-` prefix) can still be loaded and decrypted, but legacy encryption will be deprecated in the next release, and a warning is logged (if [anyhow](https://npmjs.com/package/anyhow) is installed) whenever such a file is loaded. These use a static IV and no authentication, so you should migrate them to the new format via the command line tool, using the exact same key and IV they were encrypted with. The legacy format requires a 32 characters key and a 16 characters IV, so replace the placeholders below with your own values:

    $ SMU_CRYPTO_KEY=0123456789abcdef0123456789abcdef SMU_CRYPTO_IV=0123456789abcdef ./node_modules/.bin/setmeup crypto-migrate settings.secret.json

If the file was encrypted with the default key and IV, simply omit both variables. Only `enc-` values are converted, other values (including comments and formatting) are left untouched, and the file is not rewritten if there's nothing to migrate.

### Encrypting and decrypting files programmatically

```javascript
// Derive encryption key from env variables or local machine (default).
setmeup.encrypt("./settings.secret.json")

// And decrypt...
setmeup.decrypt("./settings.secret.json")

// Or using a custom key.
let options = {key: "my-very-long-and-secret-encryption-key"}
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
    $ ./node_modules/.bin/setmeup crypto-migrate settings.secret.json
    $ ./node_modules/.bin/setmeup print

The command line tool exits with code 1 in case of errors.

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

The samples above are for the `settings.secret.json` but you could actually use any other filename, like `my-private-settings.json`.

#### Security considerations

The main reason why `loadFromEnv()` must be called explicitly is to avoid settings hijacking on shared environments. For instance an attacker could change things like URLs and credentials even if they had no permissions to access the settings files, simply by crafting some environment variables to replace the settings.
