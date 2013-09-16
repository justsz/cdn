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
    timePanel.placePanel({target: "#time"}); //place panel using a CSS selector
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
`file` - tree file in JSON format [*need to specify format*]  
`color` - CSS color expression that will be associated with this tree. If no color is provided, one of 60 colors will be assigned from a color wheel, however these become increasingly hard to distinguish as more trees are added.  


#####Time panel
Timeline that spans from the earliest date to the latest date as found among loaded tree panels. A time period can be selected in the timeline, this same period will highlight in tree panels and leaves that fall into this period will be highlighted. The time slider can be dragged. This will draw a vertical line in all tree panels corresponding to the same date. Map panel layers like the bubble chart layer and virus particle layers will display the geographical distribution of viruses for the selected date. Also, any “date-calendar” class spans will display the selected date.
```javascript
var timePanel = new pandemix.TimePanel;
timePanel.placePanel({target: "#globalTime"});
```
`target` - target div

#####Trait selection panel
Selection panel for properties by which trees or map features can be colored by. Available options are loaded from metadata in tree files; the panel looks for naming patterns that look like `someTrait.fullSet`. The tree colors are loaded as well. Coloring legend is displayed in the legends panel. 
```javascript
var traitSelectionPanel = new pandemix.TraitSelectionPanel;
traitSelectionPanel.placePanel({target: "#traitSelection"});
```
`target` - target div  


#####Legend panel
Color legend panel. The trait selection panel controls which property is colored for. Most properties will be assigned colors automatically from a HSB color wheel but colors can also be provided when adding data, like tree colors. Rows can be clicked to turn a color on or off, unless it is a manually set color.
```javascript
var legendPanel = new pandemix.LegendPanel;
legendPanel.placePanel({target: "#legend"});
```
`target` - target div  


#####Map panel
Leaflet based map panel with various overlays. The map can be panned and zoomed and overlay visibilty can be toggled on or off. When adding multiple layers the `.addLayer(...)` calls return the panel itself so these calls can be chained one after the other. Map layers will appear in the order that they were added unless a zIndex argument is provided.
```javascript
var mapPanel = new pandemix.MapPanel;
mapPanel.placePanel({target: "map", initCoords: [34, 104], initZoom: 4});
```
`target` - target div  
`initCoords` - initial center coordinates of map  
`initZoom` - initial zoom level of map  

Most overlays will require some additional data. Currently Pandemix supports adding a GeoJSON file with country and region outlines or a CSV file with location names and the coordinates of that location's centroid.
```javascript
mapPanel.loadContours(contourFile)
        .loadCentroids(centroidFile);
```
If no centroid file is provided on the `.loadCentroids` call, centroids will be calculated from the contours and given the region's name.


######Info display
Adds an info display popup in the bottom left of the map. The contents of the popup are determined by the string creation function passed by the user. Since this just edits the html content of the div, you can use html elements to style the output.
```javascript
mapPanel.addInfoDisplay(function(d) {return "<h4>" + d.location + "</h4>" + d.treeName + " - " + d.number});
```
Currently only the bubble chart layer responds to this. As such the available data items are:

`d.location` - location name associated with the bubble  
`d.treeName` - name of the tree the bubble belongs to  
`d.number` - number of viruses represented by the bubble  

######Region outline layer
Contours of geographical bodies. Can be clicked to highlight tree leaves from the location. Requires loaded contours.
```javascript
mapPanel.addLayer({layerType: pandemix.map.regionOutlineLayer, name: "Regions"});
```

######Locations layer
Draws a circle on centroid locations. Circles can be sized according to the count of leaves in that location.
```javascript
mapPanel.addLayer({layerType: pandemix.map.locationLayer, name: "Locations", displayedProperty: "location", unitRadius: 1});
```
`displayedPropert` - the string matching to location in tree data files  
`unitRadius` - radius in pixels corresponding to one count at minimal zoom  
`minRadius` - minimum radius in pixels at minimal zoom  
`maxRadius` - maximum radius in pixels at minimal zoom  

*Note that setting a minimum or maximum radius disrupts interpretation on data visually. For example, one circle twice as big as another might not represent twice as many counts if the smaller one is forced to take a minimum radius.*


######Bubble chart layer
Draws circles sized corresponding to the number of virus mutations that exist at a selected time. The circles (or bubbles) repel each other so, when zoomed out, the bubbles won't center exactly around the centroid they belong to. Bubbles are colored according to which tree they represent. 
```javascript
mapPanel.addLayer({layerType: pandemix.map.bubbleChartLayer, name: "Bubble chart", unitRadius: 3});
```
`unitRadius` - radius in pixels corresponding to one count at minimal zoom  
`chargeDensity` - controls how strongly the particles repel each other  
`minRadius` - minimum radius in pixels at minimal zoom  
`maxRadius` - maximum radius in pixels at minimal zoom  

*Note that setting a minimum or maximum radius disrupts interpretation on data visually. For example, one circle twice as big as another might not represent twice as many counts if the smaller one is forced to take a minimum radius.*


######Bubble transition layer
Animates geographical transitions if the virus parent has been traced to a different location than where it spawns. Best used together with the bubble chart layer and placed underneath it (called first). These transitions work both when moving forward and backward in time. Bubbles are colored according to which tree they represent. 
```javascript
mapPanel.addLayer({layerType: pandemix.map.bubbleTransLayer, name: "Bubble transitions", radius: 2});
```
`radius` - radius in pixels of transition particle at minimal zoom  


######Virus particle layer
A combination of bubble chart and bubble transition layers. Displays each node in the current selection as an individual circle at the nodes location. When time moves forward, the particles move from location to location and split according to the phylogenetic tree they represent. When moving back in time, transitions are not animated and particles simply dissapear and appear as appropriate. Particles are colored according to the tree they represent. Particles from a single tree repel each other but not particles from other trees so they may overlap in which case the bubble chart might be a better choice. Each tree appears on a separate layer.
```javascript
mapPanel.addLayer({layerType: pandemix.map.virusParticleLayer, treePanel: treePanel, radius: 3});
```
`treePanel` - reference to the tree panel this layer should represent  
`chargeDensity` - controls how strongly the particles repel each other  
`radius` - radius in pixels of virus particle at minimal zoom  


######Tree layer
Draws great arcs that mirror the links on the represented tree. 
```javascript
mapPanel.addLayer({layerType: pandemix.map.treeLayer, treePanel: treePanel, color: treePanel.getColor()});
```
`treePanel` - reference to the tree panel this layer should represent  
`color` - color of the tree links  


#####Additional components
Pandemix provides some additional control components that are not directly parts of any one panel.

######Zoom button
Vertically expands all tree panels.
```javascript
pandemix.addGlobalZoomButton({target: "#zoom", zoomAmount: 1});
```
`target` - target div  
`zoomAmount` - by how much the scale of the trees changes each click. Default is 0.5  


######Play/Pause button
Advances the time slider automatically. Useful for things like bubble chart and virus particle map layers.
```javascript
pandemix.addPlayPauseButton({target: "#playPause", updateInterval: 200, updateStep: 10});
```
`target` - target div  
`updateInterval` - time between each step forward in time in milliseconds. Default is 200  
`updateStep` - amount of time the slider moves each update in days. Default is 10  


######Search box
Searches for the entered text substring in leaf names.
```javascript
pandemix.addSearchBox({target: "#search"});
```
`target` - target div  


######Color box
Colors selected leaves. The entered text is interpreted as a CSS color, invalid expressions return the selection to their default colors.
```javascript
pandemix.addColorPicker(target: "#color"});
```
`target` - target div  


######Date span
Any spany with the class `date-calendar` will be replaced by the selected date.
```html
<span class="date-calendar"></span>
```












