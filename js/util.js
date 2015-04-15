var app;
app = app || {};
app.util = app.util || {};

(function () {

  String.prototype.capitalize = String.prototype.capitalize || function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
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
        if (data.rows.length === 1) { // exact match found
          $input.autocomplete("close");
          $input.val(data.rows[0].school_name);
        } else {  // show suggestions
          response(autocompleteResponses);
        }
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
