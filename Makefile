CSSFILES = jquery-ui.min.css cartodb.css jumbotron-narrow.css style.css print.css

default: help

server:
	cd public && python ../GzipSimpleHTTPServer.py

uglify: prebuild
	uglifyjs js/vendor/* > public/js/vendor.js
	uglifyjs js/1-*.js js/2/*.js js/2/*/*.js js/3-*.js --verbose --lint > public/js/main.js
	cd css && cat $(CSSFILES) | csso | uglifycss > ../public/css/style.css

cat: prebuild
	cat js/vendor/* > public/js/vendor.js
	cat js/1-*.js js/2/*.js js/2/*/*.js js/3-*.js > public/js/main.js
	cd css && cat $(CSSFILES) > ../public/css/style.css

prebuild:
	mkdir -p public/js public/css
	cp index.html public/
	cp -R css/images public/css/

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
	npm install uglifycss uglifyjs csso -g

help:
	@echo Try "'make uglify' or 'make server'".
	@echo ""
	@echo Make targets:
	@echo ---------------------------------------------------
	@echo ""
	@cat Makefile
