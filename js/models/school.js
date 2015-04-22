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

  // output of SELECT distinct(type) FROM dec_schools WHERE preschool IN (true)
  var is_preschool_possible = function (type) {
    return type === 'primary' || type === 'infants' || type === 'other' || type === 'central';
  };

  // output of SELECT distinct(type) FROM dec_schools WHERE oshc IN (true)
  var is_opportunity_class_possible = function (type) {
    return type === 'primary' || type === 'central';
  };

  // SELECT distinct(type) FROM dec_schools WHERE selective_school IN ('Partially Selective', 'Fully Selective')
  var is_selective_possible = function (type) {
    return type === 'secondary' || type === 'central';
  };

  // SELECT distinct(type) FROM dec_schools WHERE school_specialty_type NOT IN ('Comprehensive')
  var is_specialty_possible = function (type) {
    return type === 'secondary' || type === 'central';
  };


  // return approx distance (km rounded to nearest tenths) from this school to the user,
  // or nothing if user location is unset
  app.School.prototype.distanceToUser = function () {

    // We don't always have a user location
    // (e.g. if searching for a specific school)
    // That's OK, return nothing in that case.
    if (!app.lat || !app.lng) { return; }

    var userLatLng = new L.latLng(app.lat, app.lng);
    var schoolLatLng = new L.latLng(this.latitude, this.longitude);
    var meters = userLatLng.distanceTo(schoolLatLng);

    return app.util.roundToOne(meters / 1000);
  };

  app.School.prototype.toTemplateContext = function (i) {

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
          return this.distanceToUser();
        },
        is_preschool_possible: is_preschool_possible(this.type),
        is_opportunity_class_possible: is_opportunity_class_possible(this.type),
        is_selective_possible: is_selective_possible(this.type),
        is_specialty_possible: is_specialty_possible(this.type),
        support_offered: this.support_ids ? _.map(this.support_ids, function (id) {
          return app.supports[id];
        }) : false,

      });

    return context;
  };

}());
