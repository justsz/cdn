Pandemix
===

Overview
---
Pandemix gives the ability to quicklu create interactive web pages based on phylogenetic virus data. The library contains a number of panels that can be told to render in a specified spot on a page with a few lines of code. The panels themselves can be styled through CSS to fit into the design of your website. The pandemix panels are interactive and linked. For example, selecting some nodes in a tree type panel will select the same nodes in all other tree panels and highlight the geographical locations associated with the nodes on the map. Selecting a date on the time line panel will highlight the same date in tree panels and display the geographical distribution of reported viral cases at the selected time. These features allow you to quickly set up a rich sharing and data exploration web page for emerging viruses.

Installation
---
[*section not complete*]
Include necessary libraries in the head of the page.

Usage pattern
---
You must first create a div somewhere on your page and give it an id. This is where the panel will be put.
```html
<div id="time"></div>
```
Once all the divs are in place, you can write JavaScript to place the appropriate Pandemix panels.
```javascript
<script>
	var timePanel = new pandemix.TimePanel; //create panel
    timePanel.placePanel("#time"); //place panel using a CSS selector
</script>
```
Then, if the default styling doesn't suit you, some CSS editing:
```css
.timeLine {
    width: 750px;
    height: 25px;
    cursor: crosshair;
}
```
And that is it. Your page now has a functioning interactive timeline to explore your data temporally.
Some panels require additional options and considerations based on their complexity and what data they depend on, but pattern remains the same.

Panel listing
---
######Tree panel
Draws a phlyogenetic tree with branch lengths. The topology of the tree can be drag-selected and leaves can be click-selected, including the usual behaviour when shift or ctrl (cmd on Mac) keys are held down.
```javascript
var treePanel = new pandemix.TreePanel;
treePanel.placePanel("#tree1");
treePanel.initializePanelData("data/tree1.json", "red");
```
The final command takes two arguments. The first one is a tree file in JSON format [*need to specify format*]. The second argument is a CSS color expression that will be associated with this tree. If no color is provided, one of 60 colors will be assigned from a color wheel, however these become increasingly hard to distinguish as more trees are added.

######