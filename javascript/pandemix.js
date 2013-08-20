pandemix = (function() {
    "use strict";

    var pandemix = {};

    pandemix.counter = 0; //panel count and doubles as panel ID
    pandemix.focusedPanel = 0; //ID of focused panel
    pandemix.scale = 1; //zoom level
    pandemix.panels = []; //array of all added panels
    pandemix.selectedLeaves = [];
    pandemix.selectedNodes = [];
    pandemix.globalData = {}; //keeps track of data added to crossfilter
    pandemix.map = {}; //store map related things, like layers
    

    /*
    Adds a function that correctly counts the 
    number of nodes in a selection.
    */
    d3.selection.prototype.size = function() {
        var n = 0;
        this.each(function() {n += 1; });
        return n;
    };


    pandemix.addGlobalZoomButton = function(targ) {
        var zoomButton = d3.select(targ)
                           .style("display", "inline-block")
                           .style("margin", "10px")
                           .append("svg")
                           .attr("width", 40)
                           .attr("height", 80)
                           .append("g");

            zoomButton.append("rect")
                       .attr("class", "zoom increase")
                       .attr("width", 40)
                       .attr("height", 40)
                       .on("click", function() {incrementZoom(1); });
                   
            zoomButton.append("rect")
                       .attr("class", "zoom decrease")
                       .attr("y", 40)
                       .attr("width", 40)
                       .attr("height", 40)
                       .on("click", function() {incrementZoom(-1); });
    };


    pandemix.addSearchBox = function(targ) {
        d3.select(targ)
          .attr("class", "searchBox")
          .append("input")
          .attr("type", "text")
          .attr("id", "search")
          .attr("value", "search")
          .on("keyup", search);       
    };


    pandemix.addColorPicker = function(targ) {
        d3.select(targ)
          .attr("class", "colorBox")
          .append("input")
          .attr("type", "text")
          .attr("id", "color")
          .attr("value", "color")
          .on("keyup", applyColor);
    };
    
    
    pandemix.addGlobalTimeAxis = function(targ) {
        timeScale = d3.time.scale()
                            .domain([0, 0])
                            .range([0, 700]);
        timeAxis = d3.svg.axis()
                            .scale(timeScale)
                            .orient("bottom");
                            
        brush = d3.svg
                  .brush()
                  .x(timeScale)
                  .on("brushstart", brushstart)
                  .on("brush", brushmove)
                  .on("brushend", brushend);
          
        pandemix.globalTimeBrush = brush;
        
        var div = d3.select(targ);

        axisSelection = div.append("svg")
                          .attr("width", 750)
                          .attr("height", 20)
                          .append("g")
                          .attr("class", "axis")
                          .style("cursor", "crosshair")
                          //.attr("transform", "translate(0," + (height) + ")")
                          .call(timeAxis)
                          .call(brush);
    };


    function brushstart() {
        //brush.clear();
        //d3.selectAll(".link").classed("highlighted", false);
    };


    function brushmove() {
        var e = brush.extent();
        pandemix.selectedPeriod = e;
        if (pandemix.brushHighlight) {
            brushHighlight.attr("x", timeScale(e[0]))
                          .attr("width", timeScale(e[1]) - timeScale(e[0]));
        } else {
            brushHighlight = axisSelection.append("rect")
                                          .attr("class", "timeSelection")
                                          .attr("x", timeScale(e[0]))
                                          .attr("y", 0)
                                          .attr("width", timeScale(e[1]) - timeScale(e[0]))
                                          .attr("height", 20);
            pandemix.brushHighlight = brushHighlight;
        }
        pandemix.locDim.filter(null);
        pandemix.selectedLeaves = pandemix.dateDim.filterRange(e).top(Infinity);
        pandemix.callUpdate("timeSelectionUpdate");
        pandemix.callUpdate("leafSelectionUpdate");
    };


    function brushend() {
        if (brush.empty()) {
            if (brushHighlight) {
                brushHighlight.remove();
                brushHighlight = null;
                pandemix.brushHighlight = null;
            }
        }
    };
    
    pandemix.selectedPeriod;
    
    var axisSelection;
    var timeScale;
    var timeAxis;
    var rootHeights = [];
    var leafHeights = [];
    var brush;
    var brushHighlight;
    

    /*
    As data is being added, update the global time axis with new min/max taxon dates.
    */
    pandemix.updateGlobalTimeAxis = function(rootHeight, minLeafHeight) {
        rootHeights.push(rootHeight);
        leafHeights.push(minLeafHeight);
        
        timeScale.domain([pandemix.nodeHeightToDate(d3.max(rootHeights), 2014), pandemix.nodeHeightToDate(d3.min(leafHeights), 2014)]);

        axisSelection.call(timeAxis);
    };


    function search(searchTerm) {
        var searchTerm = searchTerm || document.getElementById("search").value;
        var searchRegex = new RegExp(searchTerm);
        var selectedNodes = [];
    
        if (searchTerm) { //do no selection if search field is empty
            d3.selectAll("svg.treePanel")
              .selectAll(".leaf")
              .each(function(d) {
                  if (searchRegex.test(d.name)) {
                      selectedNodes.push(d);
                  }
              });
        }
    
        pandemix.selectedLeaves = selectedNodes;
        pandemix.callUpdate("leafSelectionUpdate");
    };
    
    
    function lookupTrait(searchTerm) {
        var searchTerm = searchTerm || document.getElementById("trait").value;
        var searchRegex = new RegExp(searchTerm);
        var selectedNodes = [];
    
        if (searchTerm) { //do no selection if search field is empty
            d3.selectAll("svg.treePanel")
              .selectAll(".node")
              .each(function(d) {
                  for (var prop in d) {
                      if(d.hasOwnProperty(prop)) {
                          if (searchRegex.test(d[prop])) {
                              selectedNodes.push(d);
                          }
                      }
                  }
              });
        }
    
        pandemix.selectedLeaves = selectedNodes;
        pandemix.callUpdate("leafSelectionUpdate");
    };


    function applyColor() {
        var color = document.getElementById("color").value;
        if (color === "") {
            color = null;
        }
        pandemix.callUpdate("leafColorUpdate", color);
    };


    function incrementZoom(dir) {
        var newScale = pandemix.scale + 0.5 * dir;
        if (newScale < 1) {
            newScale = 1;
        }
        pandemix.scale = newScale;
        pandemix.callUpdate("zoomUpdate"); 
    }; 


    /*
    Create the crossfilter. Data can be added to it as it becomes available
    when trees are being loaded.
    */
    pandemix.initializeCrossfilter = function() {        
        pandemix.nodes = crossfilter();
        pandemix.nodeDateDim = pandemix.nodes.dimension(function(d) {return d.date; });

        pandemix.taxa = crossfilter();
        pandemix.nameDim = pandemix.taxa.dimension(function(d) {return d.name; });
        pandemix.locDim = pandemix.taxa.dimension(function(d) {return d.location; });
        pandemix.dateDim = pandemix.taxa.dimension(function(d) {return d.date; });
        
    };


    pandemix.getNodeKey = function(d, i) {
        return (d.name || i);
    };


    pandemix.getLinkKey = function(d, i) {
        return (d.target.name || i);
    };


    pandemix.contains = function(a, obj) {
        var i;
        for (i = 0; i < a.length; i += 1) {
            if (a[i] === obj) {
                return true;
            }
        }
        return false;
    };


    pandemix.accContains = function(a, obj, aAcc, objAcc) {
        var i;
        for (i = 0; i < a.length; i += 1) {
            if (aAcc(a[i]) === objAcc(obj)) {
                return true;
            }
        }
        return false;
    };


    pandemix.indexOf = function(a, obj, aAcc, objAcc) {
        var i;
        for (i = 0; i < a.length; i += 1) {
            if (aAcc(a[i]) === objAcc(obj)) {
                return i;
            }
        }
        return -1;
    };


    pandemix.containsLeaf = function(a, obj) {
        if (a.length === 0) {
            return false;
        }
    
        var i;
        for (i = 0; i < a.length; i += 1) {
            if (a[i].name === obj.name) {
                return true;
            }
        }
        return false;
    };

    /*
    Iterates through all registered panels and attempts
    to call the specified update type.
    */
    pandemix.callUpdate = function(updateType) {
        var i;
        for (i = 0; i < pandemix.panels.length; i += 1) {
            if (pandemix.panels[i].hasOwnProperty(updateType)) {
                pandemix.panels[i][updateType](arguments); //pass arguments given to this function to the update function
            }
        }
    };


    pandemix.panelsLoaded = function(panelType) {
        var out = true,
            i;
        for (i = 0; i < pandemix.panels.length; i += 1) {
            if (pandemix.panels[i].panelType === panelType && pandemix.panels[i].hasOwnProperty("finishedLoading")) {
                out = out && pandemix.panels[i].finishedLoading();
            }
        }
    return out;
    };

    /*
    Waits until function "test" returns true.
    When that happens, runs the "callback" function.
    Checks "test" every "interval" milliseconds.
    */
    pandemix.when = function(test, callback, interval) {
        var interval = interval || 100;
            window.setTimeout(function loopFunc() {
                if (test()) {
                    callback();
                } else {
                    window.setTimeout(loopFunc, interval);
                }
            }, interval);
        };


    return pandemix
}());













