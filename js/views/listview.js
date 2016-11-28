app = app || {};

(function () {

  var ListView = function () {
    this.$el = $('#list-container');
    this.template = Handlebars.compile($('#result-list-template').html());
  };

  app.ListView = ListView;


  ListView.prototype.update = function (schools) {

    if (this.schools && !schools) {
      // no schools arg? just make sure the currently selected thing is highlighted in the list
      var selected_code = this.schools.selected().school_code;
      var selected = this.$el.find('.selected');
      if (selected.data('school-code') !== selected_code) { // UI/model mismatch; do update
        selected.removeClass('selected'); //clear all
        this.$el.find('button[data-school-code=' + selected_code + ']').addClass('selected');
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

    this.$el.find('.btn').click(function (e) {
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

      setTimeout(function() {
        app.ui.viewSchool(school_code, '.cartodb-map');
      }, 400); // briefly pause so user sees list change
    });

    function jumpToTop(e) {
      e.preventDefault();
      var target = this.hash;
      app.ui.scrollAndCenter(target);
    }
    this.$el.find('.jump-to-start').click(jumpToTop);

    var that = this;

    // button gets focus or hover
    function onAttention () {
      that.$el.find('.btn.selected').addClass('dimmer');
    }
    function offAttention () {
      // if mouse .hover's offAttention() was called, ensure nothing has
      // mouse :focus before we un-dim the .selected button.
      if (that.$el.find('.btn:not(.selected):focus').length === 0) {
        that.$el.find('.btn.selected').removeClass('dimmer');
      }
    }
    var $unselecteds = this.$el.find('.btn:not(.selected)');
    $unselecteds.hover(onAttention, offAttention)
      .focusin(onAttention)
      .focusout(offAttention);

  };

}());
