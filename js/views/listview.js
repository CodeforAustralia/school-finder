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

    // dummy - testing.
    var context = {
      schools: [
        {school_name: "Sydney Secondary College Blackwattle Bay Campus", school_code: 8539},
        {school_name: "Sydney Secondary College Balmain Campus", school_code: 8484},
      ],
    };
    var html = this.template(context);

    // clean up any previous result & re-add
    this.$el.empty();
    this.$el.append(html);
  };

}());