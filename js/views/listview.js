var app, Handlebars;
app = app || {};

(function () {

  var ListView = function () {
    this.$el = $('#list-container');
    this.template = Handlebars.compile($("#result-list-template").html());
  };

  app.ListView = ListView;


  ListView.prototype.update = function (schools) {

    if (this.schools && !schools) {
      // no schools arg? just make sure the currently selected thing is highlighted in the list
      var selected_code = this.schools.selected().school_code;
      var selected = this.$el.find('.selected');
      if (selected.find('button').data('school-code') !== selected_code) { // UI/model mismatch; do update
        selected.removeClass('selected'); //clear all
        this.$el.find('ul li button[data-school-code=' + selected_code + ']').closest('li').addClass('selected');
      }
      return;
    }

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