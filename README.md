# ui-datalist-web-component

The `<ui-datalist>` web component tries to emulate the [datalist](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist) Element, but is customizable.

## Installation

Clone the project and import the `UIDataList.js` script.

```html
<script type="module">
    import UIDataList from "./UIDataList.js";
    console.log('[UIDataList]: anything in the DOM?', UIDataList.datalists)
</script>
```

## Usage

Use it like a regular [\<datalist\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist), but with `ui-datalist` tag.

```html
<input type="text" id="input" name="input" list="list-sample">
<ui-datalist id="list-sample">
    <option value="1" label="Value 1">A description...</option>
    <option value="2">Value 2</option>
    <option value="3"></option>
</ui-datalist>
```

## CSS styling

The component can be customized with CSS using the `::part(base|section|section-title|section-content)` query.

```css
ui-datalist#items-list::part(base) {
    background-color: rgb(255, 0, 128);
}
ui-datalist#items-list::part(section) {
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
}
ui-datalist#items-list::part(section-title) {
    color: rgb(250, 250, 250);
}
ui-datalist#items-list::part(section-content) {
    color: rgb(250, 250, 250);
}
```

## Testing sample code

See the `/sample` directory, where you can find a very simple NodeJS http `server.js` and `index.html` file, it will serves.

```sh
cd sample
node server.js
```
open browser in `http://localhost:8080/` address.
