app = app || {};
app.util = app.util || {};

(function () {

  Handlebars.registerHelper('search_radius', function () {
    return app.config.searchRadius / 1000 + ' km';
  });

  Handlebars.registerHelper('search_radius', function () {
    return app.config.searchRadius / 1000 + ' km';
  });

  Handlebars.registerHelper('round', function (num) {
    return Math.round(num);
  });

  app.util.support_description = function () {
    var support_wanted = _.find(app.supports, function (s) { return s.shortcode === app.support; });
    if (support_wanted) {
      return support_wanted.long_description;
    }
    return '';
  };

  // function roundToTwo(num) {
  //   return +(Math.round(num + "e+2")  + "e-2");
  // }

  app.util.roundToOne = function (num) {
    return +(Math.round(num + 'e+1')  + 'e-1');
  };

  app.util.schoolNameCompleter = function (request, response) {
    var $input = $(this.element);

    var processResults = function (data) {
      var autocompleteResponses = [];
      var haveResponses = false;
      data.rows.forEach(function (row) {
        autocompleteResponses.push({value: row.school_name});
        haveResponses = true;
      });
      if (haveResponses) {
        // show suggestions
        response(autocompleteResponses);
      } else {
        $input.autocomplete('close');
      }
    };

    // ask cartodb for all school names starting with the request
    // SELECT * FROM dec_schools WHERE school_name ILIKE '%sydney%'
    var query = "SELECT school_name FROM dec_schools WHERE school_name ILIKE '" + request.term + "%' ORDER BY school_name";
    app.sql.execute(query).done(processResults);
  };

  // polyfill console object so IE9 & below don't give 'console is undefined' errors
  // based on http://stackoverflow.com/a/11638491/1024811
  window.console = window.console || (function() {
    var c = {};
    c.log = c.warn = c.debug = c.info = c.error = function(){};
    return c;
  })();

  if (app.debug) {
    app.util.log = console.log.bind(console); // eslint-disable-line no-console
  } else {
    app.util.log = function () {}; // don't console log in production
  }

}());
