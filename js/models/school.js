var app, L, Handlebars;
app = app || {};

(function () {

  Handlebars.registerHelper('yesNo', function (field) {
    return field ? "Yes" : "No";
  });

  /* create a new School. */
  app.School = function (fields) {
    _.extend(this, fields);
  };

  app.School.toTemplateContext = function (i) {

    var context = _.extend(this,
      {
        resultNumber: i,
        website: this.website.replace("http://", ""),
        level: function () {
          return app.level ? app.level.capitalize() : 'School';
        },
        grades: this.subtype,
        established: function () {
          // try to return something human friendly if we can parse date.
          var d = new Date(this.date_1st_teacher);
          if (d) { return d.getFullYear(); }
          return this.date_1st_teacher;
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
          var schoolLatLng = new L.latLng(this.latitude, this.longitude);
          var dist = userLatLng.distanceTo(schoolLatLng);

          // lookup distance along road network and insert it into page when the results come back.
          app.calculateRouteDistance(this.latitude, this.longitude, '#result-' + i + ' .route-distance');

          return "About " + app.util.roundToOne(dist / 1000) + " km";
        },
      });

    return context;
  };

}());
