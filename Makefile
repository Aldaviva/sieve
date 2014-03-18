BUNYAN := bunyan
JSL := jsl
NODE := node

all:

.PHONY: lint
lint:
	@find lib -name "*.js" | xargs $(JSL) --conf=tools/jsl.conf --nofilelisting --nologo --nosummary *.js

run:
	@$(NODE) . | $(BUNYAN)