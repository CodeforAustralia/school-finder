var app, Handlebars;
app = app || {};

(function () {

  var MapView = function () {
    this.$el = $('#map-container');
    this.template = Handlebars.compile($("#map-template").html());
  };

  app.MapView = MapView;

  MapView.prototype.update = function (schools) {
    this.schools = schools;
    this.render();
  };

  MapView.prototype.render = function () {

    var context = {};
    var html = this.template(context);

    // clean up any previous result & re-add
    this.$el.empty();
    this.$el.append(html);
  };

}());