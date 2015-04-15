var app, L, Handlebars;
app = app || {};

(function () {

  var SchoolView = function (school) {
    this.school = school || null;
    this.$el = $('#school-info-container');
    this.template = Handlebars.compile($("#result-template").html()); //TODO change to school-info-template
  };

  app.SchoolView = SchoolView;

  SchoolView.prototype.render = function () {
    var context = this.school.toTemplateContext(this.i);
    var html = this.template(context);

    // clean up any previous result & re-add
    this.$el.empty();
    this.$el.append(html);
  };

}());