var app, Handlebars;
app = app || {};

(function () {

  var ListView = function () {
    this.$el = $('#list-container');
    this.template = Handlebars.compile($("#result-list-template").html());
  };

  app.ListView = ListView;


  ListView.prototype.update = function (schools) {
    this.schools = schools;
    this.render();
  };

  ListView.prototype.render = function () {

    var context = {
      schools: _.map(this.schools.schools, function (school) {
        return {school_name: school.school_name(), school_code: school.school_code() };
      }),
    };
    var html = this.template(context);

    // clean up any previous result & re-add
    this.$el.empty();
    this.$el.append(html);
  };

}());