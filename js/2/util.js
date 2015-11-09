var app;
app = app || {};
app.util = app.util || {};

(function () {

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

}());
