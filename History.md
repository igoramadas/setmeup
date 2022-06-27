# Changelog for SetMeUp

1.7.8
=====
* Updated dependencies.

1.7.7
=====
* Updated anyhow logger and other dependencies.

1.7.5
=====
* Fixed regression bug with the utils.extend().

1.7.4
=====
* Updated dependencies.

1.7.3
=====
* Updated dependencies.

1.7.2
=====
* Updated dependencies.

1.7.1
=====
* Fixed remaining deprecated lodash references.

1.7.0
=====
* Removed "lodash" dependency.
* Some bits of refactoring here and there.
* Updated dependencies.

1.6.4
=====
* Updated dependencies.

1.6.3
=====
* Updated dependencies.

1.6.2
=====
* Updated dependencies.

1.6.1
=====
* Updated dependencies.

1.6.0
=====
* BREAKING! Settings will NOT be loaded by default now (doNotLoad option removed, please call load() manually).
* Make sure Anyhow's logging is set up.
* Further logging tweaks.

1.5.4
=====
* NEW! readOnly flag to switch the module to read-only mode (will never write to disk).
* Auto set readOnly to true if file system is read only.
* Improved logging (if anyhow is also installed).

1.5.2
=====
* Fixed exception when having unencrypted array mixed inside an encrypted settings file.

1.5.1
=====
* Improved handling of the special settings.secret.json file.
* Check if anyhow is present for logging, otherwise does not log anything.

1.5.0
=====
* NEW! Command line helper to encrypt / decrypt / print settings.
* NEW! Option "destroy" to delete settings file right after loading.
* NEW! File settings.secret.json added to default load(), and is always encrypted.
* BREAKING! Encrypted setting values are now prefixed with "enc-".
* Fixed bug that allowed re-encrypting settings multiple times.
* Updated dependencies.

1.4.1
=====
* TypeScript types are now exported with the library.
* Renamed internal Crypto to CryptoHelper to avoid confusion with Node's crypto.

1.3.2
=====
* Updated dependencies.

1.3.1
=====
* Updated dependencies.

1.3.0
=====
* BREAKING! The loadFromEnv() is not triggered automatically, now must be called manually.
* Updated dependencies.

1.2.2
=====
* Allow changing the crypto cipher via SMU_CRYPTO_CIPHER env variable.

1.2.1
=====
* Removed wrong warning when loading settings JSON to be decrypted.

1.2.0
=====
* Improved encryption to work with arrays, will not consider booleans.
* BREAKING! You should decrypt existing encrypted settings prior to upgrading!
* Updated dependencies.

1.1.6
=====
* Updated dependencies.

1.1.5
=====
* Fixed "overwrite" behaviour on utils.extend().
* Changed order of load preference on getFilePath(), local path is now last.
* Fixed package dependencies.

1.1.3
=====
* Make sure anyhow (logger) is set up on init.
* Calling reset() will deep clean instead of create new settings object.
* Loading from same filename in different locations now works properly.

1.1.1
=====
* Updated dependencies.

1.1.0
=====
* NEW! Load settings from environment variables.

1.0.1
=====
* Added .once() as shortcut to .events.once().
* Updated dependencies.

1.0.0
=====
* Initial release.
