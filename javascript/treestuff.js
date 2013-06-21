"use strict";

var treestuff = {}; //object for holding all variables and functions

treestuff.width = 700;
treestuff.height = 500;
treestuff.marginForLabels = 300;
treestuff.panelData = [];
treestuff.counter = 0;
treestuff.focusedPanel = 0;
treestuff.focusedLeaves = [];

treestuff.updateBehaviour = {}; //TODO hide this in a closure?
treestuff.updateBehaviour.tree = {
    target: "svg.treePanel",    
    action: function(domSelection, selectedNodes) {
                var nodes = selectedNodes || treestuff.focusedLeaves;
                domSelection.selectAll(".leaf").classed("highlighted", function(d) {
                       if (treestuff.containsLeaf(nodes, d)) {
                           return true;
                       }
                       return false;
                   });
            }
    };
    
treestuff.updateBehaviour.circles = {
    target: "svg.circlePanel",    
    action: function(domSelection, selectedNodes) {
                var nodes = selectedNodes || treestuff.focusedLeaves;
                var circles = domSelection.selectAll("circle")
                            .data(nodes, treestuff.getNodeKey);

                circles.enter()
                       .append("circle")
                       .attr("class", "pointlessCircle")
                       .attr("r", 12)
                       .attr("cx", function(d) {return treestuff.circScale(parseInt(d.name, 10)); })
                       .attr("cy", 15);


                circles.exit().remove();
                            
            }
    };



treestuff.initializeTree = function(filename) {
    d3.json(filename, function(json) { //root is the root node of the input tree
        treestuff.focusedPanel = treestuff.counter;
        //initialize d3 cluster layout
        var cluster = d3.layout.cluster()
                        .size([treestuff.height, treestuff.width - treestuff.marginForLabels])
                        .separation(function() {return 1; });

        //get an array of all nodes and where they should be placed 
        //(ignoring branch lengths)
        var nodes = cluster.nodes(json.root);
        var linkData = cluster.links(nodes);

        treestuff.attachLinkReferences(nodes, linkData);

        var xScale = treestuff.scaleBranchLengths(nodes, treestuff.width - treestuff.marginForLabels);

        var yScale = d3.scale.linear()
                       .domain([0, treestuff.height])
                       .range([0, treestuff.height]);

        var brush = d3.svg.brush()
                    //.x(d3.scale.linear().domain([0, width]).range([0, width]))
                      .y(yScale)
                      .on("brushstart", treestuff.brushstart)
                      .on("brush", treestuff.brushmove)
                      .on("brushend", treestuff.brushend);

        var div = d3.select("body").append("div")
                    .attr("class", "svgBox");

        var svg = div.append("svg")
                     .attr("class", "treePanel")
                     .attr("id", "panel" + treestuff.counter)    //append a number to later identify this svg
                     .attr("width", treestuff.width)
                     .attr("height", treestuff.height)
                     .append("g")
                     .attr("transform", "translate(35, 0)");


        var zoom = d3.behavior.zoom()
                   //.x(xScale)
                     .y(yScale)
                     .on("zoom", treestuff.zoomed)
                     .scaleExtent([1, 10]);

        treestuff.panelData.push({x: xScale, y: yScale, brush: brush, zoom: zoom});

        svg.selectAll("path.link")
           .data(linkData, treestuff.getLinkKey)
           .enter().append("path")
           .attr("class", "link")
           .attr("d", treestuff.elbow);

        //assign node classification and position it
        svg.selectAll("g.node")
           .data(nodes, treestuff.getNodeKey)
           .enter().append("g")
           .attr("class", function(d) {
               if (d.children) {
                   if (d.depth === 0) {
                       return "root node";
                   }
                   return "inner node";
               }
               return "leaf node";
           })
           .attr("transform", function(d) { return "translate(" + (d.y) + "," + yScale(d.x) + ")"; });

        //draw root node line. It is placed inside the root nodes g so it transforms along with it.           
        svg.select(".root")
           .append("path")
           .attr("class", "rootLink")
           .attr("d", function() {return "M" + 0 + "," + 0 + "h" + -20; });

        var leaves = svg.selectAll(".leaf");
        
        /*
        var nameLengths = [];
        leaves.each(function (d) {nameLengths.push(d.name.length); });
        treestuff.marginForLabels = d3.max(nameLengths) * 7;
        */
        
        leaves.append("text")
              .attr("class", "leafText")
              .attr("dx", 8)
              .attr("dy", 3)
              .attr("text-anchor", "start")
              .text(function(d) { return d.name; });
        
        leaves.append("rect")
              .attr("identifier", treestuff.counter)
              .attr("class", "leafBack")
              .attr("y", -7)
              .attr("x", 5)
              .attr("width", treestuff.marginForLabels)
              .attr("height", 12)
              .on("click", function() {
                  treestuff.focusedPanel = this.attributes.identifier.nodeValue;
                  var node = d3.select(this.parentNode);
                  var addNodeToSelection = !node.classed("highlighted");
                  node.classed("highlighted", addNodeToSelection);
                  addNodeToSelection ? treestuff.focusedLeaves.push(node.datum()) : treestuff.removeElement(node.datum(), treestuff.focusedLeaves);
                  treestuff.updatePanels();
                  if (addNodeToSelection) {
                      treestuff.scrollToNode(node);
                  }
              });


        leaves.append("path")
           .attr("class", "dashedLink")
           .attr("d", treestuff.dashedElbow);

/*
         svg.append("rect")
            .attr("class", "scrollArea")
            .attr("x", treestuff.width - 60)
            .attr("y", 0)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("width", 20)
            .attr("height", treestuff.height);
            //.call(zoom);
*/

        var brushBox = svg.append("rect")
                          .attr("identifier", treestuff.counter)
                          .attr("width", treestuff.width - treestuff.marginForLabels)
                          .attr("height", treestuff.height)
                          .attr("class", "brushBox")
                          .call(brush);

        treestuff.panelData[treestuff.focusedPanel].brushBox = brushBox;
       
       /*    
        var zoomButtons = svg.append("g")
                             .attr("transform", "translate(-25, 10)");

        zoomButtons.append("rect")
                   .attr("identifier", treestuff.counter)
                   .attr("width", 30)
                   .attr("height", 30)
                   .style("fill", "green")
                   .on("click", function() {return treestuff.incrementZoom(1, this); });
                   
        zoomButtons.append("rect")
                   .attr("identifier", treestuff.counter)
                   .attr("y", 30)
                   .attr("width", 30)
                   .attr("height", 30)
                   .style("fill", "red")
                   .on("click", function() {return treestuff.incrementZoom(-1, this); });
         */          

        treestuff.counter += 1;
    });
};

treestuff.removeElement = function(obj, array) {
    var i;
    for (i = 0; i < array.length; i += 1) {
        if (array[i].name === obj.name) {
            array.splice(i, 1);
            return;
        }
    }
    console.log("removable element not found");
};

treestuff.scrollToNode = function(node) {
    var i,
        nodeInOtherPanel;
        
    for (i = 0; i < treestuff.panelData.length; i += 1) {
        //focusedPanel is retrieved as a string, must convert i to match
        if ("" + i !== treestuff.focusedPanel) {
            nodeInOtherPanel = d3.select("#panel" + i)
                                 .selectAll(".leaf")
                                 .filter(function(d) {return node.datum().name === d.name; });

            if (nodeInOtherPanel[0].length) {   //if the leaf exists in other panel
                document.getElementById("panel" + i).parentNode.scrollTop =
                treestuff.panelData[i].y(nodeInOtherPanel.datum().x) - treestuff.height / 2;
            }
        }
    }
};

treestuff.addPointlessCircles = function() {
    var div = d3.select("body").append("div")
                .attr("class", "circBox");

    div.append("svg")
       .attr("class", "circlePanel")
     //.attr("id", treestuff.counter)    //append a number to later identify this svg
       .attr("width", 2 * treestuff.width)
       .attr("height", 30);
                 
    treestuff.circScale = d3.scale.linear()
                                  .domain([0, 300])
                                  .range([15, 2 * treestuff.width - 15]);         
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
                   .on("click", function() {return treestuff.incrementZoom(1); });
                   
        zoomButton.append("rect")
                   .attr("y", 40)
                   .attr("width", 40)
                   .attr("height", 40)
                   .style("fill", "red")
                   .on("click", function() {return treestuff.incrementZoom(-1); });
};


treestuff.addSearchBox = function() {
    d3.select("body").append("div")
      .attr("class", "searchBox")
      .append("input")
      .attr("type", "text")
      .attr("id", "search")
      .attr("value", "search")
      .on("keyup", treestuff.search);       
};


treestuff.addColorPicker = function() {
    d3.select("body")
      .append("div")
      .attr("class", "colorBox")
      .append("input")
      .attr("id", "color")
      .attr("value", "color")
      .on("keyup", treestuff.applyColor);
};


treestuff.search = function(searchTerm) {
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
    treestuff.updatePanels();
    
    /*
    if (firstHit) {
        treestuff.scrollToNode(d3.select(firstHit));
    }
    */
};


treestuff.applyColor = function() {
    var color = document.getElementById("color").value;
    d3.selectAll("svg.treePanel")
      .selectAll(".leaf")
      .filter(function(d) {return treestuff.containsLeaf(treestuff.focusedLeaves, d); })
      .style("fill", color)
      .style("fill-opacity", 0.3);
};


treestuff.attachLinkReferences = function(nodes, linkData) {
    var i, j;
    for (i = 1; i < nodes.length; i += 1) {
        for (j = 0; j < linkData.length; j += 1) { //can this be done a bit faster?
            if (nodes[i] === linkData[j].target) {
                nodes[i].uplink = linkData[j];
                break;
            }
        }
    }
};


treestuff.getNodeLinks = function(nodes) {
    var links = [],
        i;
    for (i = 0; i < nodes.length; i += 1) {
        links.push(nodes[i].uplink);
    }
    return links;
};


treestuff.elbow = function(d) {
    var currentPanel = treestuff.panelData[treestuff.focusedPanel];
    return "M" + currentPanel.x(d.source.rootDist) + "," + currentPanel.y(d.source.x)
        + "V" + currentPanel.y(d.target.x) + "H" + currentPanel.x(d.target.rootDist);
};

treestuff.dashedElbow = function(d) {
    return "M" + 0 + "," + 0
        + "h" + (treestuff.panelData[treestuff.focusedPanel].x(d.rootDist) - d.y);
};

treestuff.scaleBranchLengths = function(nodes, w) {
    var visitPreOrder = function(root, callback) {
        var i;
        callback(root);
        if (root.children) {
            for (i = 0; i < root.children.length; i += 1) {
                visitPreOrder(root.children[i], callback);
            }
        }
    };

    visitPreOrder(nodes[0], function(node) {
        node.rootDist = (node.parent ? node.parent.rootDist : 0) + (node.length || 0);
    });

    var rootDists = nodes.map(function(n) { return n.rootDist; });
    var outScale = d3.scale.linear()
                     .domain([0, d3.max(rootDists)])
                     .range([0, w]);

    return outScale;
};


treestuff.incrementZoom = function incrementZoom(dir, context) {
    //var currScale = treestuff.panelData[treestuff.focusedPanel].zoom.scale();
    //treestuff.panelData[treestuff.focusedPanel].zoom.scale(currScale + (0.1 * dir));
    //console.log(d3.select(target));
    
    var targets = [],
        currRange,
        newScaleMax
        i;
    
    if (context) {
        targets.push(context.attributes.identifier.nodeValue);
    } else {
        for (i = 0; i < treestuff.panelData.length; i += 1) {
            targets.push(i);
        }
    }
    
    for (i = 0; i < targets.length; i += 1) {
        treestuff.focusedPanel = targets[i];

        currRange = treestuff.panelData[treestuff.focusedPanel].y.range();
        newScaleMax = currRange[1] + 300 * dir;
    
        if (newScaleMax >= treestuff.height) {
            treestuff.panelData[treestuff.focusedPanel]
                     .y.range([0, newScaleMax]);
            treestuff.zoomed(); 
        }
    } 
};
         
         

treestuff.zoomed = function() {
    
    //treestuff.focusedPanel = identifier || this.parentNode.parentNode.id;
    //console.log(treestuff.focusedPanel);

    var svg = d3.select("#panel" + treestuff.focusedPanel);
    
    svg.attr("height", treestuff.panelData[treestuff.focusedPanel].y(treestuff.height))
    treestuff.panelData[treestuff.focusedPanel]
             .brushBox.attr("height", treestuff.panelData[treestuff.focusedPanel].y(treestuff.height));
    
    svg.selectAll("path.link")
        .attr("d", treestuff.elbow);

    svg.selectAll("g.node")
        .attr("transform", function(d) { return "translate(" + (d.y) + "," + treestuff.panelData[treestuff.focusedPanel].y(d.x) + ")"; });
};


// Clear the previously-active brush, if any.
treestuff.brushstart = function() {
    var newFocusedPanel = this.attributes.identifier.nodeValue;

    if (newFocusedPanel !== treestuff.focusedPanel) {
        d3.selectAll(".highlighted").classed("highlighted", false);
        treestuff.panelData[treestuff.focusedPanel].brush.clear();
    }
    treestuff.focusedPanel = newFocusedPanel;
};

// Highlight the selected leaf links.
treestuff.brushmove = function() {
    var e = treestuff.panelData[treestuff.focusedPanel].brush.extent();
    var selectedNodes = [];
    var currentPanel = treestuff.panelData[treestuff.focusedPanel];

    d3.select(this.parentNode)
        .selectAll(".leaf")
        .each(function(d) {
            if (currentPanel.y(e[0]) < currentPanel.y(d.x) && currentPanel.y(d.x) < currentPanel.y(e[1])) {
                selectedNodes.push(d);
            }
        });

    treestuff.focusedLeaves = selectedNodes.slice(0);
    
    //highlight all matching leaf nodes
    treestuff.updatePanels();



    //treestuff.addConnectingNodes(selectedNodes);



    //could make this a bit faster by saving previous selection
    d3.select(this.parentNode).selectAll("path.link").classed("highlighted", false);

    //highlight full paths
    d3.select(this.parentNode)
      .selectAll("path.link")
      .data(treestuff.getNodeLinks(selectedNodes), treestuff.getLinkKey)
      .classed("highlighted", true);
};


// If the brush is empty, un-highlight all links.
treestuff.brushend = function() {
    if (treestuff.panelData[treestuff.focusedPanel].brush.empty()) {
        d3.select(this.parentNode)
          .selectAll(".highlighted").classed("highlighted", false);
    }
};


treestuff.addConnectingNodes = function(nodes) {
    var cont = true,
        i;
    while (cont) {
        cont = false;
        for (i = 0; i < nodes.length; i += 1) {
            if (nodes[i].parent.children[0] === nodes[i]) {
                if (treestuff.contains(nodes, nodes[i].parent.children[1]) && !treestuff.contains(nodes, nodes[i].parent)) {
                    nodes.push(nodes[i].parent);
                    cont = true;
                }
            } else {
                if (treestuff.contains(nodes, nodes[i].parent.children[0]) && !treestuff.contains(nodes, nodes[i].parent)) {
                    nodes.push(nodes[i].parent);
                    cont = true;
                }
            }
        }
    }
};


treestuff.getNodeKey = function(d, i) {
    return (d.name || i);
};


treestuff.getLinkKey = function(d, i) {
    return (d.target.name || i);
};

treestuff.contains = function(a, obj) {
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


treestuff.addUpdateBehaviour = function(name, targ, behaviour) {
    if (typeof behaviour === "function" && typeof name === "string" && typeof targ === "string") {
        treestuff.updateBehaviour.name = {
            target: targ,
            action: behaviour
        };
    }
};


treestuff.updatePanels = function(targetNames) {//TODO add support for single string
    var targ, 
        i,
        callUpdate = function(t) {
                        treestuff.updateBehaviour[t].action(
                        d3.selectAll(treestuff.updateBehaviour[t].target));
                     };

    if(!targetNames || targetNames.length === 0) {
        for (targ in treestuff.updateBehaviour) {
            if (treestuff.updateBehaviour.hasOwnProperty(targ)) {
                callUpdate(targ);
            }
        }
    } else {
        for (i = 0; i < targetNames.length; i += 1) {
            callUpdate(targetNames[i]);            
        }
    }
};