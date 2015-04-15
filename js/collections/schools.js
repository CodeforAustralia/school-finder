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
    this.select(this.schools[0].school_code);
  };

  Schools.prototype.select = function (school_code) {
    this.selected_school = school_code;
  };

  // one school at a time can be selected (for display)
  // returns the selected School
  Schools.prototype.selected = function () {
    var that = this;
    // find the School in schools[] where School.fields.school_code matches selected_school
    return _.find(this.schools, function (school) { return school.school_code === that.selected_school; });
  };

}());