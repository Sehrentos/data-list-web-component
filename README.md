# data-list-web-component

Data-list web component tries to emulate datalist features to the best of their ability, but is customizable.

# Installation

import the script:

```html
<script src="datalist.js"></script>
```

# Usage

Use it like a regular [\<datalist\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist):

```html
<input type="text" id="input" name="input" list="list-sample">
<data-list id="list-sample">
    <option value="1" label="Value 1">A description...</option>
    <option value="2">Value 2</option>
    <option value="3"></option>
</data-list>
```