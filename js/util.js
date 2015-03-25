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

}());
