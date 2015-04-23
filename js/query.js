/*
 * Provides an interface through which to query for schools.
 * To run a query:
 * - create a new Query object
 * - optionally set your filters as desired
 * - optionally set a limit on the number of results returned
 * - specify how to search (by name, distance, catchment, etc)
 * - run the query and pass in a callback function which will
     process the results found.
*/

/*
 * Filters could be like:
 * Selective
 * Opportunity classes
 * Outside School Hours Care
 * School level
 * Specialty
 *
 *
 * Use cases:
 * 1) I'm looking for a primary school w/in 9.5 km that has OSHC.
 * 2) I'm looking for a primary school w/in a rectangle that has opportunity classes.
 * 3) I'm looking for a secondary school w/in 7 km radius that has an academically selective program.
 * 4) I'm looking for a secondary school w/in a 20 km radius that specializes in 'Technology'
 *
 * Code to do those follows.
 *
 * First, create a new Query object
 *
 * var q = new app.Query();
 *
 * Then set some filters for the different use cases. Note you can either
 * call addFilter() multiple times or just set multiple filters at once with addFilters().
 *
 * 1)
 *    q.addFilter('level_of_schooling', 'Primary School')
       .byDistance(-33.882253, 151.21522, 9500).addFilter('oshc', 'true')...
 *
 * 2)
 *    var bounds = { left: 151.14192008972165,
 *                   bottom: -33.90874763503187,
 *                   right: 151.24826431274414,
 *                   top: -33.87312358690302 };
 *    q.addFilter('level_of_schooling', 'Primary School')
 *     .byBounds(bounds).addFilter('opportunity_class', 'true')
 *
 * 3)
 *    q.addFilter('level_of_schooling', 'Secondary School')
 *     .byDistance(-33.882253, 151.21522, 7000)
 *     .addFilter('selective_school', ['Partially Selective', 'Fully Selective'])
 *
 * 4)
 *    q.addFilters({level_of_schooling: 'Secondary School', school_specialty_type: 'Technology'})
 *     .byDistance(-33.882253, 151.21522, 20000);
 *
 *
 * Then run the query (and in this case, print the results to the console)
 *
 *  q.run(function(data) { data.rows.forEach(function(row) { console.log(row); })});
 */

var app;
app = app || {};

(function () {

  var Query = function () {
    this.filters = {};
    this.whereConditions = [];
    this.execSql = null;
    return this;
  };
  app.Query = Query;


  // Add a where condition.
  Query.prototype.where = function (where) {
    this.whereConditions.push(where);
    return this;
  };


  // adds a "key IN value" where condition to the where clause;
  // value can be a single string or an array of strings
  Query.prototype.addFilter = function (key, value) {
    this.filters[key] = value;
    return this;
  };

  // add multiple filters simultaneously
  // overrides any existing properties with the same name
  Query.prototype.addFilters = function (filters) {
    _.extend(this.filters, filters);
    return this;
  };

  Query.prototype.removeFilter = function (key) {
    if (this.filters.hasOwnProperty(key)) { delete this.filters[key]; }
    return this;
  };

  // this function converts the filters object into a string that can be used in a WHERE clause
  Query.prototype.combineFilters = function () {

    var conditions = _.map(this.filters, function (value, field) {

      // turn each filter's value/values into a list of quoted items for use in SQL query
      var values;
      if (typeof value === 'string') {
        values = "'" + value + "'";
      } else { // it's an array
        values = _.map(value, function (item) { return "'" + item + "'"; }).join(',');
      }

      return field + " IN (" + values + ")";
    }).join(' AND ');

    return "(" + conditions + ")";

  };


  // limit the number of results returned to the specified number
  Query.prototype.setLimit = function (limit) {
    this.limit = limit;
    return this;
  };

  // set type to something like 'primary, secondary, central, infants'
  // if you are looking for a primary school, secondary, or infants school,
  // then a central school will provide the same thing so this adds that in.
  // if you don't want that functionality, then just use q.where('type = whatever')

  // accepts either a single type e.g. "primary" or multiple, e.g. ['primary', 'community']
  Query.prototype.setSchoolType = function (typeOrTypes) {

    var type, otherTypes, otherTypesExpression = '';

    if (typeOrTypes && typeof typeOrTypes === 'string') {
      type = typeOrTypes;
      otherTypes = [];
    } else {
      type = _.first(typeOrTypes);
      otherTypes = _.rest(typeOrTypes);
    }

    if (type === 'infants' || type === 'primary' || type === 'secondary') {
      otherTypes.push('central');
    }

    if (otherTypes) {
      otherTypesExpression = _.map(otherTypes, function (t) {
        return " OR s.type = '" + t + "'";
      }).join('');
    }

    this.where("(s.type = '" + type + "' " + otherTypesExpression + ")");
    return this;
  };

  Query.prototype.byCatchment = function (lat, lng) {
    this.queryBy = 'catchment';
    this.lat = lat;
    this.lng = lng;
    return this;
  };

  Query.prototype.byDistance = function (lat, lng, distanceInMeters) { // maxRuralTravel
    this.queryBy = 'distance';
    this.radius = distanceInMeters;
    this.lat = lat;
    this.lng = lng;
    return this;
  };

  Query.prototype.byName = function (name) {
    this.queryBy = 'name';
    this.name = name;
    return this;
  };

  // bounds should be an object with left, right, top, bottom properties as
  // required by http://postgis.net/docs/ST_MakeEnvelope.html
  Query.prototype.byBounds = function (bounds) {
    this.queryBy = 'bounds';
    this.bounds = bounds;
    return this;
  };

  Query.prototype.run = function (callback) {

    var query, otherFields = '', joinSubtype = '', whereCondition, orderBy = '';

    if (this.queryBy === 'name') {

      joinSubtype = "LEFT OUTER";
      whereCondition = "s.school_name ILIKE '%" + this.name + "%'";

    } else if (this.queryBy === 'catchment') {

      // Find schools whose catchment area serves the chosen location

      whereCondition = "ST_CONTAINS(b.the_geom, ST_SetSRID(ST_Point(" + this.lng + "," + this.lat + "),4326)) ";

    } else if (this.queryBy === 'distance') {

      joinSubtype = "LEFT OUTER";
      otherFields = ", ST_DISTANCE(s.the_geom::geography, ST_SetSRID(ST_Point(" + this.lng + "," + this.lat + "),4326)::geography) AS dist ";
      whereCondition = "ST_DISTANCE(s.the_geom::geography, ST_SetSRID(ST_Point(" + this.lng + "," + this.lat + "),4326)::geography) < " + this.radius;
      orderBy = "ORDER BY dist ASC LIMIT 5";

    } else if (this.queryBy === 'bounds') {

      joinSubtype = "LEFT OUTER";
      whereCondition = "s.the_geom && ST_MakeEnvelope(" +
                          this.bounds.left + "," +
                          this.bounds.bottom + ", " +
                          this.bounds.right + "," +
                          this.bounds.top + ") ";

    } else { console.error("No query type specified."); return; }

    // build where condition
    if (_.size(this.filters) > 0) {
      whereCondition += ' AND ' + this.combineFilters();
    }

    if (_.size(this.whereConditions) > 0) {
      whereCondition += ' AND ' + this.whereConditions.join(' AND ');
    }

    // app.needs_support = true;
    var supportField = "";
    if (app.needs_support) {
      supportField = ", (SELECT array_agg(sc.scdefid) FROM support_classes AS sc WHERE sc.school_code = s.school_code) AS support_ids ";
    }

    // build query
    query =
      "SELECT s.*, b.shape_area " + supportField + otherFields + " " +
      "FROM " + app.db.points + " AS s " + joinSubtype + " " +
      "JOIN " + app.db.polygons + " AS b " +
      "ON s.school_code = b.school_code " +
      "WHERE (" + whereCondition + ") " + orderBy;

    // add on the LIMIT if that's been specified
    query += this.limit ? " LIMIT " + this.limit : "";

    console.log('running query:');
    console.log(query);

    this.execSql = app.sql.execute(query).done(callback);

    return this;
  };

  // set error handling function; call after calling .run()
  Query.prototype.error = function (func) {
    this.execSql.error(func);
  };

}());
