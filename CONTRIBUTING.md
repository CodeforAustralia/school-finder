# Contributing

Thank you for your interest in contributing! By participating in this project, 
you agree to abide by a specific [code of conduct].

[code of conduct]: https://thoughtbot.com/open-source-code-of-conduct

If you would like to contribute to this project, to start, you can
[report issues][new-issue] or [suggest enhancements][new-issue] 
in the [issue queue][issues]. We typically will have discussion there,
then create a pull request (PR) once we agree on what needs doing.

## To create a pull request:

Fork, then clone the repo:

    git clone git@github.com:your-username/school-finder.git

Run a local webserver

    # This lets you use just type "ws" to get a server running on Mac.
    # If you are on Windows, perhaps just install python and run `python -m SimpleHTTPServer`
    alias ws='python -m SimpleHTTPServer'
    ws

Make your change. Use any editor of your choice. [Atom] and [Brackets] are both nice.

[Atom]: https://atom.io
[Brackets]: http://brackets.io

Test your changes. Currently, that's just done in your browser manually.

Push to your fork and [submit a pull request][pr].

[pr]: https://github.com/CodeforAustralia/school-finder/compare/

At this point you're waiting on us. We like to at least comment on pull requests
within one week. We may suggest some changes or improvements or alternatives.

## To increase the chance your pull request is accepted:

* Write tests. At a minimum, describe in your PR what the previous behavior was, 
  and how to verify the new behavior. 
* Follow our [style guide](doc/Style.md).
* Write a [good commit message][commit].
* In the PR (or in a commit if just one commit resolves an issue),
  please include `Fixes #<issue-number>"` (i.e. "Fixes #123")
  so that issue is automatically closed when the commit is merged into master.
  See https://help.github.com/articles/closing-issues-via-commit-messages/
  for more on how that works.
* Tackle only one issue per pull request. See these [git tricks](doc/Git-Tricks.md) on
  managing multiple branches with `git`.

[commit]: http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html
