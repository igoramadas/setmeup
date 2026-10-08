# Changelog for SetMeUp

## 2.0.0

- NEW: Native ESM support via package exports, alongside CommonJS.
- NEW: Values are now encrypted as `enc2-` (AES-256-GCM, random IV per value, key of any length). Legacy `enc-` values can still be decrypted.
- NEW: `setmeup crypto-migrate` CLI command to convert legacy `enc-` values to `enc2-`.
- DEPRECATED: Legacy `enc-` encryption will be deprecated in the next release, decryption still supported for now.
- NEW: Types `SetMeUp`, `LoadOptions`, `LoadEnvOptions`, `LoadedFile` and `CryptoOptions` are exported.
- BREAKING: Requires Node.js 22 or newer.
- BREAKING: `loadFromEnv()` now loads `true` / `false` as booleans and numeric values as numbers.
- BREAKING: Read only mode is now detected based on the app root folder (current working directory).
- BREAKING: The CLI exits with code 1 on errors.
- Fixed prototype pollution via `__proto__`, `constructor` and `prototype` keys.
- Files reloaded by `watch()` keep their original load options.
- Fixed `once()` triggering listeners multiple times.
- Fixed `unwatch()` removing file listeners that were not created by SetMeUp.
- Fixed duplicate entries on `files` when loading the same file multiple times.
- Fixed decrypting files with plain numbers mixed in.
- Fixed `loadJson()` not returning the loaded data.
- Fixed `loadFromEnv()` failing when a variable is set both as a value and as a parent.
- Fixed CLI help showing `load` instead of `print`.

## 1.9.5

- Exposed `loadJson()` helper to load settings directly from a JSON object.
- Fixed issues trying to encrypt / decrypt null values.

## 1.9.4

- Improved `extend()` helper to avoid replacing existing properties with null values.

## 1.9.3

- The `APP_ENV` environment variable will be used instead of `NODE_ENV`, if there's one set.

## 1.9.0

- The `doNotLoad` instance option is now deprecated, you must always call `setmeup.load()` after instantiating the module.
- Code refactoring.

## 1.8.1

- Improved support for ESM based modules.
- Fixed regression bug on 1.8.0 (removed from NPM).

## 1.7.7

- Updated anyhow logger and other dependencies.

## 1.7.5

- Fixed regression bug with the `utils.extend()`.

## 1.7.1

- Fixed remaining deprecated lodash references.

## 1.7.0

- Removed "lodash" dependency.
- Some bits of refactoring here and there.

## 1.6.0

- BREAKING: Settings will NOT be loaded by default now (`doNotLoad` option removed, please call `load()` manually).
- Make sure Anyhow's logging is set up.
- Further logging tweaks.

## 1.5.4

- NEW: `readOnly` flag to switch the module to read-only mode (will never write to disk).
- Auto set `readOnly` to true if file system is read only.
- Improved logging (if anyhow is also installed).

## 1.5.2

- Fixed exception when having unencrypted array mixed inside an encrypted settings file.

## 1.5.1

- Improved handling of the special `settings.secret.json` file.
- Check if anyhow is present for logging, otherwise does not log anything.

## 1.5.0

- NEW: Command line helper to encrypt / decrypt / print settings.
- NEW: Option `destroy` to delete settings file right after loading.
- NEW: File `settings.secret.json` added to default `load()`, and is always encrypted.
- BREAKING: Encrypted setting values are now prefixed with `enc-`.
- Fixed bug that allowed re-encrypting settings multiple times.

## 1.4.1

- TypeScript types are now exported with the library.
- Renamed internal Crypto to CryptoHelper to avoid confusion with Node's crypto.

## 1.3.0

- BREAKING: The `loadFromEnv()` is not triggered automatically, now must be called manually.

## 1.2.2

- Allow changing the crypto cipher via `SMU_CRYPTO_CIPHER` env variable.

## 1.2.1

- Removed wrong warning when loading settings JSON to be decrypted.

## 1.2.0

- Improved encryption to work with arrays, will not consider booleans.
- BREAKING: You should decrypt existing encrypted settings prior to upgrading!

## 1.1.5

- Fixed "overwrite" behaviour on `utils.extend()`.
- Changed order of load preference on `getFilePath()`, local path is now last.
- Fixed package dependencies.

## 1.1.3

- Make sure anyhow (logger) is set up on init.
- Calling `reset()` will deep clean instead of create new settings object.
- Loading from same filename in different locations now works properly.

## 1.1.0

- NEW: Load settings from environment variables.

## 1.0.1

- Added `once()` as shortcut to `events.once()`.

## 1.0.0

- Initial release.
