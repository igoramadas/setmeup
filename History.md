# Changelog for SetMeUp

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
