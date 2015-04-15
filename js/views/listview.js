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
  };

}());