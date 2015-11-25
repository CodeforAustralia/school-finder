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
      var el = $(this);
      e.preventDefault();

      // determine the school of interest
      var school_code = el.data('school-code');

      // select that school from the list
      app.schools.select(school_code);

      // update the UI
      app.listView.update(app.schools);
      app.mapView.update(app.schools);
      app.schoolView.update(app.schools);

      app.ui.scrollTo('.cartodb-map');
    });

    this.$el.find('a.jump-to-start').click(function (e) {
      e.preventDefault();
      var top = $('#search-start').offset().top;
      // jump just above the start but not past the top of the page
      top = (top - 30 > 0) ? top - 30 : top;
      $('html,body').animate({scrollTop: top}, 500);
    });
  };

}());
