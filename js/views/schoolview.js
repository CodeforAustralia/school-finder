app = app || {};

(function () {

  var SchoolView = function (school) {
    this.school = school || null;
    this.$el = $('#school-info-container');
    this.template = Handlebars.compile($("#school-info-template").html());
  };

  app.SchoolView = SchoolView;

  SchoolView.prototype.update = function (schoolOrSchools) {
    if (schoolOrSchools instanceof app.Schools) {
      this.school = schoolOrSchools.selected();
    } else { // just a School
      this.school = schoolOrSchools;
    }
    this.render();
  };

  SchoolView.prototype.render = function () {
    if (!this.school) { return; } // no use rendering if the school hasn't been set

    var context = this.school.toTemplateContext(this.i);
    context.body = SchoolView.summarize(SchoolView.blobToParagraphs(this.school.description));
    var html = this.template(context);

    // clean up any previous result & re-add
    this.$el.empty();
    this.$el.append(html);

    // lookup distance along road network and insert it into page when the results come back.
    app.calculateRouteDistanceToUser(
      this.school.latitude,
      this.school.longitude,
      '#school-info-' + this.school.school_code + ' .route-distance'
    );

    this.$el.find('.readmore').click(function (event) {
      // toggle visibility of the clicked teaser and body.
      event.preventDefault();
      var item = $(this).closest('.expandable-text');
      item.find('.teaser').toggle();
      item.find('.body').toggle();
    });
  };


  // returns a teaser (a shortened version of the text) and
  // full body (which is the text itself).
  // The teaser has a.readmore link which can be used to toggle which part is shown.
  SchoolView.summarize = function (text) {
    /* convert text to paragraphs (newlines -> <p>s) */
    /* modified from http://stackoverflow.com/questions/5020434/jquery-remove-new-line-then-wrap-textnodes-with-p */
    function p(t) {
      t = t.trim();
      return (t.length > 0 ? '<p>' + t.replace(/[\r\n]+/g, '</p><p>') + '</p>' : null);
    }

    var short_text = 1015;
    var breakpoint = short_text + 20; // we want to collapse more than just "last words in sentance."

    var result;
    if (breakpoint < text.length) { // build a teaser and full text.
      var continueReading = '<a href="#" class="readmore"> &rarr; Continue Reading </a>';

      // regex looking for short_text worth of characters + whatever it takes to get to a whitespace
      // (we only want to break on whitespace, so we don't cut words in half)
      var re = new RegExp('^[\\s\\S]{' + short_text + '}\\S*?\\s');

      var teaser = '<div class="teaser">' + p(text.match(re) + '&hellip;' + continueReading) + '</div>';
      var body = '<div class="body">' + p(text) + '</div>';
      result = teaser + body;
    } else { // short enough; no processing necessary
      result = p(text);
    }
    return result;
  };

  SchoolView.blobToParagraphs = function (text) {
    // split text on periods.
    // Example data: "This is a sentence. And. This. Is. Not."
    // Idea: If 'sentence' length < 30 characters, combine with previous 'sentence'.
    // (Works for ".", "...", "P.S.", "Whatever. Dude.")

    var fragments = text.split(/(\.+[\W])/);
    // The regex matches like:
    // "Foo. Bar. This is good.Yeah another thing." -> ["Foo", ".", "Bar", ".", "This is good.Yeah another thing", "."]
    var sentences = [];
    _.each(
      fragments,
      function (fragment) {
        if (!fragment.length) { return; }
        if (!sentences.length) {
          sentences.push(fragment);
        } else if (fragment.length < 30) {
          var addition = fragment;
          sentences[sentences.length - 1] += addition;
        } else {
          sentences.push(fragment);
        }
      }
    );

    var paragraphs = _.reduce(sentences, function (memo, sentence, i) {
      // group every two sentences into a paragraph.
      var even = ((i % 2) === 0);
      return memo + sentence + (even ? '\n\n' : '');
    }, '');

    return paragraphs;
  };

}());