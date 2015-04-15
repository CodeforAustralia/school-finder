var app;
app = app || {};

(function () {

  var Schools = function () {
    this.schools = [];
  };

  app.Schools = Schools;


  Schools.prototype.update = function (rows) {
    // store the new rows
    this.schools = [];
    this.schools = _.map(rows, function (row) { return new app.School(row); });
  };

}());