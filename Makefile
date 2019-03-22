MOCHA:= @NODE_ENV=test ./node_modules/.bin/mocha
MOCHAEXEC:= ./node_modules/.bin/_mocha
ISTANBUL:= ./node_modules/istanbul/lib/cli.js
TESTPATH:= ./test/*.js
TYPEDOC:= ./node_modules/.bin/typedoc

test:
	tsc
	@NODE_ENV=test $(MOCHA) --trace-warnings --exit -u tdd -R spec

cover:
	tsc
	$(ISTANBUL) cover $(MOCHAEXEC) -- -R spec $(TESTPATH)

docs:
	$(TYPEDOC)
	cp CNAME docs/

clean:
	rm -rf ./node_modules

.PHONY: test
.PHONY: docs
