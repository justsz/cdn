Pandemix
===

Overview
---
Pandemix gives the ability to quickly create interactive web pages based on phylogenetic virus data. The library contains a number of panels that can be told to render in a specified spot on a page with a few lines of code. The panels themselves can be styled through CSS to fit into the design of your website. The Pandemix panels are interactive and linked. For example, selecting some nodes in a tree type panel will select the same nodes in all other tree panels and highlight the geographical locations associated with the nodes on the map. Selecting a date on the time line panel will highlight the same date in tree panels and display the geographical distribution of reported viral cases at the selected time. These features allow you to quickly set up a rich sharing and data exploration web page for emerging viruses.

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
#####Tree panel
Phylogenetic tree with branch lengths. The topology of the tree can be drag-selected and leaves can be click-selected, including the usual behavior when shift or ctrl (cmd on Mac) keys are held down.
```javascript
var treePanel = new pandemix.TreePanel;
treePanel.placePanel("#tree1");
treePanel.initializePanelData({file: "data/tree1.json", color: "red"});
```
file - tree file in JSON format [*need to specify format*]
color - CSS color expression that will be associated with this tree. If no color is provided, one of 60 colors will be assigned from a color wheel, however these become increasingly hard to distinguish as more trees are added.

#####Time panel
Timeline that spans from the earliest date to the latest date as found among loaded tree panels. A time period can be selected in the timeline, this same period will highlight in tree panels and leaves that fall into this period will be highlighted. The time slider can be dragged. This will draw a vertical line in all tree panels corresponding to the same date. Map panel layers like the bubble chart layer and virus particle layers will display the geographical distribution of viruses for the selected date. Also, any “date-calendar” class spans will display the selected date.
```javascript
var timePanel = new pandemix.TimePanel;
timePanel.placePanel("#globalTime");
```

#####Trait selection panel
Selection panel for properties by which trees or map features can be colored by. Available options are loaded from metadata in tree files; the panel looks for naming patterns that look like `someTrait.fullSet`. The tree colors are loaded as well. Coloring legend is displayed in the legends panel. 
```javascript
var traitSelectionPanel = new pandemix.TraitSelectionPanel;
traitSelectionPanel.placePanel("#traitSelection");
```

#####Legend panel
Color legend panel. The trait selection panel controls which property is colored for. Most properties will be assigned colors automatically from a HSB color wheel but colors can also be provided when adding data, like tree colors. Rows can be clicked to turn a color on or off, unless it is a manually set color.
```javascript
var legendPanel = new pandemix.LegendPanel;
legendPanel.placePanel("#legend");
```

#####Map panel
Leaflet based map panel with various overlays. The map can be panned and zoomed and overlay visibilty can be toggled on or off. When adding multiple layers the `.addLayer(...)` calls return the panel itself so these calls can be chained one after the other. Map layers will appear in the order that they were added unless a zIndex argument is provided.
```javascript
var mapPanel = new pandemix.MapPanel;
mapPanel.placePanel({targ: "map", initCoords: [34, 104], initZoom: 4});
```
targ - target div
initCoords - initial center coordinates of map
initZoom - initial zoom level of map

Most overlays will require some additional data. Currently Pandemix supports adding a GeoJSON file with country and region outlines or a CSV file with location names and the coordinates of that location's centroid.
```javascript
mapPanel.loadContours(contourFile)
        .loadCentroids(centroidFile);
```
If no centroid file is provided on the `.loadCentroids` call, centroids will be calculated from the contours and given the region's name.

######Region outline layer
Contours of geographical bodies. Can be clicked to highlight tree leaves from the location. Requires loaded contours.
```javascript
mapPanel.addLayer(pandemix.map.regionOutlineLayer, {name: "Regions"});
```

######Locations layer
Draws a circle on centroid locations. Circles can be sized according to the count of leaves in that location.
```javascript
mapPanel.addLayer(pandemix.map.locationLayer, {name: "Locations", displayedProperty: "location", unitArea: 1});
```
displayedPropert - the string matching to location in tree data files
unitArea - area corresponding to one count at minimal zoom

######Bubble chart layer
Draws circles sized corresponding to the number of virus mutations that exist at a selected time. The circles (or bubbles) repel each other so, when zoomed out, the bubbles won't center exactly around the centroid they belong to. Bubbles are colored according to which tree they represent. 
```javascript
mapPanel.addLayer(pandemix.map.bubbleChartLayer, {name: "Bubble chart", unitArea: 3});
```
unitArea - area corresponding to one count at minimal zoom

######Bubble transition layer
Animates geographical transitions if the virus parent has been traced to a different location than where it spawns. Best used together with the bubble chart layer and placed underneath it (called first). These transitions work both when moving forward and backward in time. Bubbles are colored according to which tree they represent. 
```javascript
mapPanel.addLayer(pandemix.map.bubbleTransLayer, {name: "Bubble transitions", radius: 2});
```
radius - radius in pixels of transition particle at minimal zoom

######Virus particle layer
A combination of bubble chart and bubble transition layers. Displays each node in the current selection as an individual circle at the nodes location. When time moves forward, the particles move from location to location and split according to the phylogenetic tree they represent. When moving back in time, transitions are not animated and particles simply dissapear and appear as appropriate. Particles are colored according to the tree they represent. Particles from a single tree repel each other but not particles from other trees so they may overlap in which case the bubble chart might be a better choice. Each tree appears on a separate layer.
```javascript
mapPanel.addLayer(pandemix.map.virusParticleLayer, {treePanel: treePanel, radius: 3});
```
treePanel - reference to the tree panel this layer should represent
radius - radius in pixels of virus particle at minimal zoom

######Tree layer

```javascript
mapPanel.addLayer(pandemix.map.treeLayer, {treePanel: treePanel, color: treePanel.getColor()});
```
TreePanel - reference to the tree panel this layer should represent, color - color of the tree links.





