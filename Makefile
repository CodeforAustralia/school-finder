CSSFILES = bootstrap.min.css jumbotron-narrow.css tiny-autocomplete.css style.css
CSSASYNC = cartodb.css print.css

# A function that generates the source map options we need.
# Call it like $(call srcmap,vendor)
# https://www.gnu.org/software/make/manual/html_node/Text-Functions.html
srcmap = $(subst FILE,$(1), --source-map-url /FILE.js.map --source-map public/FILE.js.map)

default: help

server:
	cd public && python ../GzipSimpleHTTPServer.py

uglify: prebuild
	uglifyjs js/vendor/* $(call srcmap,vendor) -m -c > public/js/vendor.js
	uglifyjs js/1-*.js js/2/*.js js/2/*/*.js js/3-*.js $(call srcmap,main) -m -c --verbose --lint > public/js/main.js
	uglifyjs js/vendor/* js/1-*.js js/2/*.js js/2/*/*.js js/3-*.js $(call srcmap,all) -m -c --verbose --lint > public/js/all.js
	# cd css && cat $(CSSFILES) | uglifycss > ../public/css/style.css
	cd css && cat $(CSSFILES) | cleancss > ../public/css/style.css
	# cd css && cat $(CSSASYNC) | uglifycss > ../public/css/async.css
	cd css && cat $(CSSASYNC) | cleancss > ../public/css/async.css


cat: prebuild
	cat js/vendor/* > public/js/vendor.js
	cat js/1-*.js js/2/*.js js/2/*/*.js js/3-*.js > public/js/main.js
	cd css && cat $(CSSFILES) > ../public/css/style.css
	cd css && cat $(CSSASYNC) > ../public/css/async.css

prebuild:
	rm -rf public/js
	mkdir -p public/js public/css
	cp index.html public/
	cp -R css/images public/css/
	cp -R js public/

gh-pages:
	git branch gh-pages

publish: uglify gh-pages
	git checkout gh-pages
	git rm -r Makefile README.md css doc index.html js #first time only
	rm -rf css js
	git commit -m 'removing unnecessary files' #first time only
	mv public/* .
	git add css index.html js
	git commit -m 'publishing compiled site'

clean:
	rm -rf public/

deps:
	npm install cleancss uglifyjs -g # you might also try uglifycss

help:
	@echo Try "'make uglify' or 'make server'".
	@echo ""
	@echo Make targets:
	@echo ---------------------------------------------------
	@echo ""
	@cat Makefile
