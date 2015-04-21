var app, L, Handlebars;
app = app || {};

(function () {

  var closedSchools;

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


  app.School.prototype.toTemplateContext = function (i) {

    var context = _.extend(this,
      {
        resultNumber: i,
        closed: _.includes(closedSchools, this.school_name),
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
          app.calculateRouteDistance(this.latitude, this.longitude, '#school-info-' + this.school_code + ' .route-distance');

          return "About " + app.util.roundToOne(dist / 1000) + " km";
        },
        is_preschool_possible: is_preschool_possible(this.type),
        is_opportunity_class_possible: is_opportunity_class_possible(this.type),
        is_selective_possible: is_selective_possible(this.type),
        is_specialty_possible: is_specialty_possible(this.type),

      });

    return context;
  };

  closedSchools = [
    "Anna Bay Public School",
    "Ashtonfield Public School",
    "Awaba Public School",
    "Awabakal Environmental Education Centre",
    "Bateau Bay Public School",
    "Bellbird Public School",
    "Belmont Public School",
    "Belmont High School",
    "Belmont North Public School",
    "Biddabah Public School",
    "Bilpin Public School",
    "Biraban Public School",
    "Black Hill Public School",
    "Bobs Farm Public School",
    "Bolwarra Public School",
    "Bondi Public School",
    "Booral Public School",
    "Callaghan College Jesmond Campus",
    "Callaghan College Wallsend Campus",
    "Callaghan College Waratah Campus",
    "Cardiff Public School",
    "Cardiff South Public School",
    "Carrington Public School",
    "Caves Beach Public School",
    "Central Mangrove Public School",
    "Cessnock Public School",
    "Clarence Town Public School",
    "Charlestown Public School",
    "Charlestown East Public School",
    "Charlestown South Public School",
    "Chirtsey Public School",
    "Chittaway Bay Public School",
    "Congewai Public School",
    "Edgeworth Public School",
    "Eleebana Public School",
    "Elermore Vale Public School",
    "Empire Bay Public School",
    "Ettalong Public School",
    "Dora Creek Public School",
    "Dungog Public School",
    "Fennell Bay Public School",
    "Fern Bay Public School",
    "Floraville Public School",
    "Garden Suburb Public School",
    "Glen William Public School",
    "Glendale High School",
    "Glendale Technology High School",
    "Glendore Public School",
    "Glenvale Public School",
    "Grahamstown Public School",
    "Gresford Public School",
    "Greta Public School",
    "Hamilton North Public School",
    "Hampden Public School",
    "Heaton Public School",
    "Hillsborough Public School",
    "Hinton Public School",
    "Holgate Public School",
    "Hunter River High School",
    "Hunter Sports High School",
    "Hunter School of Performing Arts",
    "Iona Public School",
    "Irrawang High School",
    "Irrawang Public School",
    "Islington Public School",
    "Jesmond Public School",
    "Jilliby Public School",
    "Karuah Public School",
    "Kirkton Public School",
    "Kotara School",
    "Kulnura Public School",
    "Kurrajong North Public School",
    "Kurri Kurri Public School",
    "Lakeside School",
    "Lake Macquarie High School",
    "Lake Munmorah Public School",
    "Lambton Public School",
    "Lisarow Public School",
    "Lochinvar Public School",
    "Longneck Lagoon Environmental Education Centre",
    "Macdonald Valley Public School",
    "Maitland Grossman High School",
    "Maitland High School",
    "Maitland Public School",
    "Maraylya Public School",
    "Martins Creek Public School",
    "Maryland Public School",
    "Mayfield East Public School",
    "Mayfield West Public School",
    "Medowie Public School",
    "Minmi Public School",
    "Morisset High School",
    "Morisset Public School",
    "Morpeth Public School",
    "Mount Hutton Public School",
    "Mulbring Public School",
    "Narara Valley High School",
    "Newcastle Middle School",
    "Newcastle Junior School",
    "Newcastle East Public School",
    "New Lambton South Public School",
    "Nillo Infants School",
    "Patterson Public School",
    "Peats Ridge Public School",
    "Pelaw Main Public School",
    "Pelican Flat Public School",
    "Plattsburgh Public School",
    "Pretty Beach Public School",
    "Raymond Terrace Public School",
    "Redhead High School",
    "Rutherford High School",
    "Salt Ash Public School",
    "Seaham Public School",
    "Shoal Bay Public School",
    "Shortland Public School",
    "Soldiers Point Public School",
    "Somersby Public School",
    "Speers Point Public School",
    "Stockton Public School",
    "Stroud Public School",
    "Tanilba Bay Public School",
    "Tarro Public School",
    "Telarah Public School",
    "Tenambit Public School",
    "Teralba Public School",
    "The Entrance Senior Campus",
    "The Junction Public School",
    "Tighes Hill Public School",
    "Tomaree Public School",
    "Toronto High School",
    "Toronto Public School",
    "Tuggerawong Public School",
    "Wadalba Community School",
    "Wallsend Public School",
    "Wakefield School",
    "Wangi Wangi Public School",
    "Waratah West Public School",
    "Wamberal Public School",
    "Warners Bay Public School",
    "Warners Bay High School",
    "West Wallsend High School",
    "Whitebridge High School",
    "Windale Public School",
    "Wingello Public School",
    "Wiripaang Public School",
    "Wirreanda Public School",
    "Woodberry Learning Centre",
    "Woodberry Public School",
    "Woy Woy Public School",
    "Wyong Creek Public School",
    "Wyoming Public School",
  ];

}());
