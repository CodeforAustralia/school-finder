# Style Guidelines

We use fairly standard code style, with a few changes. 

Spacing: 
 
 * Indentation should be two spaces, no tabs. 
 * No trailing whitespace at end of lines.

## JavaScript

Based on [Eslint recommended style](http://eslint.org/docs/rules/).

* Use single quotes unless to avoid needing escaping characters.
* Use semi colons at the end of lines.
* See [eslint config](/.eslintrc.js) for more.

## CSS

 * Generally follow [18F CSS style], but we don't currently use Sass.
 * Use hyphen-separation rather than CamelCase.
 * Indentation increases with specificity, for example:

```
.material-radio {
  ...
}
  .material-radio .btn {
    ...
  }
```
 * but as mentioned in the 18F guides, try to keep specificity low.

[18F CSS style]: https://18f.gsa.gov/2016/01/11/introducing-the-css-coding-style-guide/

### HTML

* Use double quotes around element attribute values (`<element attribute="values">`)
* Two space indents.