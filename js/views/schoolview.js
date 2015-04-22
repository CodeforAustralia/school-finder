var app, L, Handlebars;
app = app || {};

(function () {

  var SchoolView = function (school) {
    this.school = school || null;
    this.$el = $('#school-info-container');
    this.template = Handlebars.compile($("#school-info-template").html());
  };

  app.SchoolView = SchoolView;

  SchoolView.prototype.update = function (schoolOrSchools) {
    if (schoolOrSchools instanceof app.Schools) {
      this.school = schoolOrSchools.selected();
    } else { // just a School
      this.school = schoolOrSchools;
    }
    this.render();
  };

  SchoolView.prototype.render = function () {
    if (!this.school) { return; } // no use rendering if the school hasn't been set

    var context = this.school.toTemplateContext(this.i);
    var html = this.template(context);

    // clean up any previous result & re-add
    this.$el.empty();
    this.$el.append(html);

    // lookup distance along road network and insert it into page when the results come back.
    app.calculateRouteDistanceToUser(
      this.school.latitude,
      this.school.longitude,
      '#school-info-' + this.school.school_code + ' .route-distance'
    );
  };

}());