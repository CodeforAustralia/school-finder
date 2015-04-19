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

    var html = this.template(this.schools.toTemplateContext());

    // clean up any previous result & re-add
    this.$el.empty();
    this.$el.append(html);

    this.$el.find(".btn").click(function (e) {
      // determine the school of interest
      var school_code = $(e.target).data('school-code');

      // select that school from the list
      app.schools.select(school_code);

      // update the UI
      app.listView.update(app.schools);
      app.mapView.update(app.schools);
      app.schoolView.update(app.schools);

      app.ui.scrollTo('.cartodb-map');
    });

  };

}());