CSSFILES = jquery-ui.min.css cartodb.css jumbotron-narrow.css style.css print.css

default: help

uglify: prebuild
	uglifyjs js/vendor/* > public/js/vendor.js
	uglifyjs js/1-*.js js/2/*.js js/2/*/*.js js/3-*.js --verbose --lint > public/js/main.js
	cd css && uglifycss $(CSSFILES) > ../public/css/style.css

cat: prebuild
	cat js/vendor/* > public/js/vendor.js
	cat js/1-*.js js/2/*.js js/2/*/*.js js/3-*.js > public/js/main.js
	cd css && cat $(CSSFILES) > ../public/css/style.css

prebuild:
	mkdir -p public/js public/css
	cp index.html public/
	cp -R css/images public/css/

clean:
	rm -rf public/

deps:
	npm install uglifycss uglifyjs -g

help:
	@echo Try "'make uglify'". 
	@echo ""
	@echo Make targets:
	@echo ---------------------------------------------------
	@echo ""
	@cat Makefile
