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
    if (rows && rows.length > 0) {
      this.schools = _.map(rows, function (row) { return new app.School(row); });
      this.select(this.schools[0].school_code);
    }
  };

  Schools.prototype.toTemplateContext = function () {
    var that = this;

    var context = {
      schools: _.map(this.schools, function (school) {
        return {
          school_name: school.school_name,
          school_code: school.school_code,
          distance: function () {
            return school.distanceToUser();
          },
          selected: school.school_code === that.selected_school
        };
      }),
      support_needed: app.support_needed,
      search_by_distance: app.activeQuery.queryBy === 'distance',
    };

    return context;
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