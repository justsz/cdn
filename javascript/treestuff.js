treestuff = (function() {
    "use strict";

    var treestuff = {}; 

    treestuff.focusedPanel = 0;
    treestuff.scale = 1;
    treestuff.panels = [];
    treestuff.counter = 0;
    treestuff.focusedLeaves = [];
    treestuff.globalData = {};
    
    d3.selection.prototype.size = function() {
        var n = 0;
        this.each(function() {n += 1; });
        return n;
    };
    
    treestuff.addGlobalZoomButton = function() {
        var zoomButton = d3.select("body")
                           .append("div")
                           .append("svg")
                           .attr("width", 40)
                           .attr("height", 80)
                           .append("g");

            zoomButton.append("rect")
                       .attr("width", 40)
                       .attr("height", 40)
                       .style("fill", "green")
                       .on("click", function() {return incrementZoom(1); });
                   
            zoomButton.append("rect")
                       .attr("y", 40)
                       .attr("width", 40)
                       .attr("height", 40)
                       .style("fill", "red")
                       .on("click", function() {return incrementZoom(-1); });
    };


    treestuff.addSearchBox = function() {
        d3.select("body").append("div")
          .attr("class", "searchBox")
          .append("input")
          .attr("type", "text")
          .attr("id", "search")
          .attr("value", "search")
          .on("keyup", search);       
    };


    treestuff.addColorPicker = function() {
        d3.select("body")
          .append("div")
          .attr("class", "colorBox")
          .append("input")
          .attr("id", "color")
          .attr("value", "color")
          .on("keyup", applyColor);
    };
    
    
    treestuff.addGlobalTimeAxis = function() {
        timeScale = d3.time.scale()
                            .domain([0, 0])
                            .range([0, 500]);
        timeAxis = d3.svg.axis()
                            .scale(timeScale)
                            .orient("bottom");
                            
        brush = d3.svg.brush()
          //.x(d3.scale.linear().domain([0, 500]).range([0, 500]))
          .x(timeScale)
          .on("brushstart", brushstart)
          .on("brush", brushmove)
          .on("brushend", brushend);

        //placeAimLine = false;
        axisSelection = d3.select("body").append("svg")
                          .attr("width", 550)
                          .attr("height", 20)
                          .append("g")
                          .attr("class", "axis")
                          .style("cursor", "crosshair")
                          //.attr("transform", "translate(0," + (height) + ")")
                          .call(timeAxis)
                          .call(brush);
    };
    
    function brushstart() {
        brush.clear();
    };
    
    function brushmove() {
        var e = brush.extent();
        treestuff.selectedPeriod = e;
        if (brushHighlight) {
            brushHighlight.attr("x", timeScale(e[0]))
                          .attr("width", timeScale(e[1]) - timeScale(e[0]));
        } else {
            brushHighlight = axisSelection.append("rect")
                                          .attr("x", timeScale(e[0]))
                                          .attr("y", 0)
                                          .attr("width", timeScale(e[1]) - timeScale(e[0]))
                                          .attr("height", 20)
                                          .style("fill", "green")
                                          .style("fill-opacity", 0.2);
        }
        
        var start = treestuff.dateToNodeHeight(treestuff.selectedPeriod[0], 2013.2903);
        var end = treestuff.dateToNodeHeight(treestuff.selectedPeriod[1], 2013.2903);
        
        treestuff.focusedLeaves = treestuff.height.filterRange([end, start]).top(Infinity);
        treestuff.callUpdate("timeSelectionUpdate");
        treestuff.callUpdate("selectionUpdate");
    };
    
    function brushend() {
        if (brush.empty()) {
            if (brushHighlight) {
                brushHighlight.remove();
                brushHighlight = null;
            }
        }
    };
    
    treestuff.selectedPeriod;
    
    var axisSelection;
    var timeScale;
    var timeAxis;
    var rootHeights = [];
    var leafHeights = [];
    var brush;
    var brushHighlight;
    
    treestuff.updateGlobalTimeAxis = function(rootHeight, minLeafHeight) {
        rootHeights.push(rootHeight);
        leafHeights.push(minLeafHeight);
        
        timeScale.domain([treestuff.nodeHeightToDate(d3.max(rootHeights), 2014), treestuff.nodeHeightToDate(d3.min(leafHeights), 2014)]);

        axisSelection.call(timeAxis);
    };


    function search(searchTerm) {
        var searchTerm = searchTerm || document.getElementById("search").value;
        var searchRegex = new RegExp(searchTerm);
        var selectedNodes = [];
        //var firstHit;
    
        if (searchTerm) { //do no selection if search field is empty
            d3.selectAll("svg.treePanel")
              .selectAll(".leaf")
              .each(function(d) {
                  if (searchRegex.test(d.name)) {
                      selectedNodes.push(d);
                      //if (!firstHit) {
                      //    firstHit = this;
                      //}
                  }
              });
        }
    
        treestuff.focusedLeaves = selectedNodes;
        treestuff.callUpdate("selectionUpdate");
    
        /*
        if (firstHit) {
            scrollToNode(d3.select(firstHit));
        }
        */
    };


    function applyColor() {
        var color = document.getElementById("color").value;
        d3.selectAll("svg.treePanel")
          .selectAll(".leaf")
          .filter(function(d) {return treestuff.containsLeaf(treestuff.focusedLeaves, d); })
          .style("fill", color)
          .style("fill-opacity", 0.3);
    };

    function incrementZoom(dir) {
        var newScale = treestuff.scale + 0.5 * dir;
        if (newScale >= 1) {
            treestuff.scale = newScale;
            treestuff.callUpdate("zoomUpdate"); 
        }
    }; 
    
    treestuff.initializeCrossfilter = function() {
        treestuff.taxa = crossfilter();
        treestuff.name = treestuff.taxa.dimension(function(d) {return d.name; });
        treestuff.height = treestuff.taxa.dimension(function(d) {return d.height; });
        treestuff.vert = treestuff.taxa.dimension(function(d) {return d.vert; });
    };




    treestuff.getNodeKey = function(d, i) {
        return (d.name || i);
    };


    treestuff.getLinkKey = function(d, i) {
        return (d.target.name || i);
    };

    function contains(a, obj) {
        var i;
        for (i = 0; i < a.length; i += 1) {
            if (a[i] === obj) {
                return true;
            }
        }
        return false;
    };

    treestuff.containsLeaf = function(a, obj) {
        var i;
        for (i = 0; i < a.length; i += 1) {
            if (a[i].name === obj.name) {
                return true;
            }
        }
        return false;
    };

    
    treestuff.callUpdate = function(type, args) {
        var i;
        for (i = 0; i < treestuff.panels.length; i += 1) {
            if (treestuff.panels[i].hasOwnProperty(type)) {
                treestuff.panels[i][type](args);
            }
        }
    };


    return treestuff
}());