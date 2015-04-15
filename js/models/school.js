var app, L, Handlebars;
app = app || {};

(function () {

  Handlebars.registerHelper('yesNo', function (field) {
    return field ? "Yes" : "No";
  });

  /* create a new School. */
  app.School = function (fields) {
    this.fields = fields;
  };

  app.School.prototype.school_code = function () {
    return this.fields.school_code;
  };

  app.School.prototype.school_name = function () {
    return this.fields.school_name;
  };

  app.School.toTemplateContext = function (i) {

    var fields = this.fields;

    var context = _.extend(fields,
      {
        resultNumber: i,
        website: fields.website.replace("http://", ""),
        level: function () {
          return app.level ? app.level.capitalize() : 'School';
        },
        grades: fields.subtype,
        established: function () {
          // try to return something human friendly if we can parse date.
          var d = new Date(fields.date_1st_teacher);
          if (d) { return d.getFullYear(); }
          return fields.date_1st_teacher;
        },
        homeAddress: app.address,
        homeLat: app.lat,
        homeLng: app.lng,
        distance: function () {
          // We don't always have a user location
          // (e.g. if searching for a specific school)
          // That's OK, return nothing in that case.
          if (!app.lat || !app.lng) { return; }

          var userLatLng = new L.latLng(app.lat, app.lng);
          var schoolLatLng = new L.latLng(fields.latitude, fields.longitude);
          var dist = userLatLng.distanceTo(schoolLatLng);

          // lookup distance along road network and insert it into page when the results come back.
          app.calculateRouteDistance(fields.latitude, fields.longitude, '#result-' + i + ' .route-distance');

          return "About " + app.util.roundToOne(dist / 1000) + " km";
        },
      });

    return context;
  };

}());
