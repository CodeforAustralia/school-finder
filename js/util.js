app = app || {};
app.util = app.util || {};

(function () {

  Handlebars.registerHelper('search_radius', function () {
    return app.config.searchRadius / 1000 + " km";
  });

  Handlebars.registerHelper('support_description', function () {
    return app.util.support_description();
  });

  app.util.support_description = function () {
    var support_wanted = _.find(app.supports, function (s) { return s.shortcode === app.support; });
    if (support_wanted) {
      return support_wanted.long_description;
    }
    return "";
  };

  // function roundToTwo(num) {
  //   return +(Math.round(num + "e+2")  + "e-2");
  // }

  app.util.roundToOne = function (num) {
    return +(Math.round(num + "e+1")  + "e-1");
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
        $input.autocomplete("close");
      }
    };

    // ask cartodb for all school names starting with the request
    // SELECT * FROM dec_schools WHERE school_name ILIKE '%sydney%'
    var query = "SELECT school_name FROM dec_schools WHERE school_name ILIKE '" + request.term + "%'";
    app.sql.execute(query).done(processResults);
  };



}());
