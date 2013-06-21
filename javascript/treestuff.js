treestuff = (function() {
    "use strict";

    var treestuff = {}; //object for holding all variables and functions

    var width = 700,
        height = 500,
        marginForLabels = 300,
        panelData = [],
        counter = 0,
        focusedPanel = 0,
        focusedLeaves = [],
        updateBehaviour = {};
        

    updateBehaviour.tree = {
        target: "svg.treePanel",    
        action: function(domSelection, selectedNodes) {
                    var nodes = selectedNodes || focusedLeaves;
                    domSelection.selectAll(".leaf").classed("highlighted", function(d) {
                           if (containsLeaf(nodes, d)) {
                               return true;
                           }
                           return false;
                       });
                }
        };
    
    updateBehaviour.circles = {
        target: "svg.circlePanel",    
        action: function(domSelection, selectedNodes) {
                    var nodes = selectedNodes || focusedLeaves;
                    var circles = domSelection.selectAll("circle")
                                .data(nodes, getNodeKey);

                    circles.enter()
                           .append("circle")
                           .attr("class", "pointlessCircle")
                           .attr("r", 12)
                           .attr("cx", function(d) {return circScale(parseInt(d.name, 10)); })
                           .attr("cy", 15);


                    circles.exit().remove();
                            
                }
        };



    treestuff.initializeTree = function(filename) {
        d3.json(filename, function(json) { //root is the root node of the input tree
            focusedPanel = counter;
            //initialize d3 cluster layout
            var cluster = d3.layout.cluster()
                            .size([height, width - marginForLabels])
                            .separation(function() {return 1; });

            //get an array of all nodes and where they should be placed 
            //(ignoring branch lengths)
            var nodes = cluster.nodes(json.root);
            var linkData = cluster.links(nodes);

            attachLinkReferences(nodes, linkData);

            var xScale = scaleBranchLengths(nodes, width - marginForLabels);

            var yScale = d3.scale.linear()
                           .domain([0, height])
                           .range([0, height]);

            var brush = d3.svg.brush()
                        //.x(d3.scale.linear().domain([0, width]).range([0, width]))
                          .y(yScale)
                          .on("brushstart", brushstart)
                          .on("brush", brushmove)
                          .on("brushend", brushend);

            var div = d3.select("body").append("div")
                        .attr("class", "svgBox");

            var svg = div.append("svg")
                         .attr("class", "treePanel")
                         .attr("id", "panel" + counter)    //append a number to later identify this svg
                         .attr("width", width)
                         .attr("height", height)
                         .append("g")
                         .attr("transform", "translate(35, 0)");


            var zoom = d3.behavior.zoom()
                       //.x(xScale)
                         .y(yScale)
                         .on("zoom", zoomed)
                         .scaleExtent([1, 10]);

            panelData.push({x: xScale, y: yScale, brush: brush, zoom: zoom});

            svg.selectAll("path.link")
               .data(linkData, getLinkKey)
               .enter().append("path")
               .attr("class", "link")
               .attr("d", elbow);

            //assign node classification and position it
            svg.selectAll("g.node")
               .data(nodes, getNodeKey)
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
            marginForLabels = d3.max(nameLengths) * 7;
            */
        
            leaves.append("text")
                  .attr("class", "leafText")
                  .attr("dx", 8)
                  .attr("dy", 3)
                  .attr("text-anchor", "start")
                  .text(function(d) { return d.name; });
        
            leaves.append("rect")
                  .attr("identifier", counter)
                  .attr("class", "leafBack")
                  .attr("y", -7)
                  .attr("x", 5)
                  .attr("width", marginForLabels)
                  .attr("height", 12)
                  .on("click", function() {
                      focusedPanel = this.attributes.identifier.nodeValue;
                      var node = d3.select(this.parentNode);
                      var addNodeToSelection = !node.classed("highlighted");
                      node.classed("highlighted", addNodeToSelection);
                      addNodeToSelection ? focusedLeaves.push(node.datum()) : removeElement(node.datum(), focusedLeaves);
                      updatePanels();
                      if (addNodeToSelection) {
                          scrollToNode(node);
                      }
                  });


            leaves.append("path")
               .attr("class", "dashedLink")
               .attr("d", dashedElbow);

    /*
             svg.append("rect")
                .attr("class", "scrollArea")
                .attr("x", width - 60)
                .attr("y", 0)
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("width", 20)
                .attr("height", height);
                //.call(zoom);
    */

            var brushBox = svg.append("rect")
                              .attr("identifier", counter)
                              .attr("width", width - marginForLabels)
                              .attr("height", height)
                              .attr("class", "brushBox")
                              .call(brush);

            panelData[focusedPanel].brushBox = brushBox;
       
           /*    
            var zoomButtons = svg.append("g")
                                 .attr("transform", "translate(-25, 10)");

            zoomButtons.append("rect")
                       .attr("identifier", counter)
                       .attr("width", 30)
                       .attr("height", 30)
                       .style("fill", "green")
                       .on("click", function() {return incrementZoom(1, this); });
                   
            zoomButtons.append("rect")
                       .attr("identifier", counter)
                       .attr("y", 30)
                       .attr("width", 30)
                       .attr("height", 30)
                       .style("fill", "red")
                       .on("click", function() {return incrementZoom(-1, this); });
             */          

            counter += 1;
        });
    };

    function removeElement(obj, array) {
        var i;
        for (i = 0; i < array.length; i += 1) {
            if (array[i].name === obj.name) {
                array.splice(i, 1);
                return;
            }
        }
        console.log("removable element not found");
    };

    function scrollToNode(node) {
        var i,
            nodeInOtherPanel;
        
        for (i = 0; i < panelData.length; i += 1) {
            //focusedPanel is retrieved as a string, must convert i to match
            if ("" + i !== focusedPanel) {
                nodeInOtherPanel = d3.select("#panel" + i)
                                     .selectAll(".leaf")
                                     .filter(function(d) {return node.datum().name === d.name; });

                if (nodeInOtherPanel[0].length) {   //if the leaf exists in other panel
                    document.getElementById("panel" + i).parentNode.scrollTop =
                    panelData[i].y(nodeInOtherPanel.datum().x) - height / 2;
                }
            }
        }
    };

    treestuff.addPointlessCircles = function() {
        var div = d3.select("body").append("div")
                    .attr("class", "circBox");

        div.append("svg")
           .attr("class", "circlePanel")
         //.attr("id", counter)    //append a number to later identify this svg
           .attr("width", 2 * width)
           .attr("height", 30);
                 
        circScale = d3.scale.linear()
                                      .domain([0, 300])
                                      .range([15, 2 * width - 15]);         
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
    
        focusedLeaves = selectedNodes;
        updatePanels();
    
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
          .filter(function(d) {return containsLeaf(focusedLeaves, d); })
          .style("fill", color)
          .style("fill-opacity", 0.3);
    };


    function attachLinkReferences(nodes, linkData) {
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


    function getNodeLinks(nodes) {
        var links = [],
            i;
        for (i = 0; i < nodes.length; i += 1) {
            links.push(nodes[i].uplink);
        }
        return links;
    };


    function elbow(d) {
        var currentPanel = panelData[focusedPanel];
        return "M" + currentPanel.x(d.source.rootDist) + "," + currentPanel.y(d.source.x)
            + "V" + currentPanel.y(d.target.x) + "H" + currentPanel.x(d.target.rootDist);
    };

    function dashedElbow(d) {
        return "M" + 0 + "," + 0
            + "h" + (panelData[focusedPanel].x(d.rootDist) - d.y);
    };

    function scaleBranchLengths(nodes, w) {
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


    function incrementZoom(dir, context) {
        //var currScale = panelData[focusedPanel].zoom.scale();
        //panelData[focusedPanel].zoom.scale(currScale + (0.1 * dir));
        //console.log(d3.select(target));
    
        var targets = [],
            currRange,
            newScaleMax
            i;
    
        if (context) {
            targets.push(context.attributes.identifier.nodeValue);
        } else {
            for (i = 0; i < panelData.length; i += 1) {
                targets.push(i);
            }
        }
    
        for (i = 0; i < targets.length; i += 1) {
            focusedPanel = targets[i];

            currRange = panelData[focusedPanel].y.range();
            newScaleMax = currRange[1] + 300 * dir;
    
            if (newScaleMax >= height) {
                panelData[focusedPanel]
                         .y.range([0, newScaleMax]);
                zoomed(); 
            }
        } 
    };
         
         

    function zoomed() {
    
        //focusedPanel = identifier || this.parentNode.parentNode.id;
        //console.log(focusedPanel);

        var svg = d3.select("#panel" + focusedPanel);
    
        svg.attr("height", panelData[focusedPanel].y(height))
        panelData[focusedPanel]
                 .brushBox.attr("height", panelData[focusedPanel].y(height));
    
        svg.selectAll("path.link")
            .attr("d", elbow);

        svg.selectAll("g.node")
            .attr("transform", function(d) { return "translate(" + (d.y) + "," + panelData[focusedPanel].y(d.x) + ")"; });
    };


    // Clear the previously-active brush, if any.
    function brushstart() {
        var newFocusedPanel = this.attributes.identifier.nodeValue;

        if (newFocusedPanel !== focusedPanel) {
            d3.selectAll(".highlighted").classed("highlighted", false);
            panelData[focusedPanel].brush.clear();
        }
        focusedPanel = newFocusedPanel;
    };

    // Highlight the selected leaf links.
    function brushmove() {
        var e = panelData[focusedPanel].brush.extent();
        var selectedNodes = [];
        var currentPanel = panelData[focusedPanel];

        d3.select(this.parentNode)
            .selectAll(".leaf")
            .each(function(d) {
                if (currentPanel.y(e[0]) < currentPanel.y(d.x) && currentPanel.y(d.x) < currentPanel.y(e[1])) {
                    selectedNodes.push(d);
                }
            });

        focusedLeaves = selectedNodes.slice(0);
    
        //highlight all matching leaf nodes
        updatePanels();



        //addConnectingNodes(selectedNodes);



        //could make this a bit faster by saving previous selection
        d3.select(this.parentNode).selectAll("path.link").classed("highlighted", false);

        //highlight full paths
        d3.select(this.parentNode)
          .selectAll("path.link")
          .data(getNodeLinks(selectedNodes), getLinkKey)
          .classed("highlighted", true);
    };


    // If the brush is empty, un-highlight all links.
    function brushend() {
        if (panelData[focusedPanel].brush.empty()) {
            d3.select(this.parentNode)
              .selectAll(".highlighted").classed("highlighted", false);
        }
    };


    function addConnectingNodes(nodes) {
        var cont = true,
            i;
        while (cont) {
            cont = false;
            for (i = 0; i < nodes.length; i += 1) {
                if (nodes[i].parent.children[0] === nodes[i]) {
                    if (contains(nodes, nodes[i].parent.children[1]) && !contains(nodes, nodes[i].parent)) {
                        nodes.push(nodes[i].parent);
                        cont = true;
                    }
                } else {
                    if (contains(nodes, nodes[i].parent.children[0]) && !contains(nodes, nodes[i].parent)) {
                        nodes.push(nodes[i].parent);
                        cont = true;
                    }
                }
            }
        }
    };


    function getNodeKey(d, i) {
        return (d.name || i);
    };


    function getLinkKey(d, i) {
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

    function containsLeaf(a, obj) {
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
            updateBehaviour.name = {
                target: targ,
                action: behaviour
            };
        }
    };


    function updatePanels(targetNames) {//TODO add support for single string
        var targ, 
            i,
            callUpdate = function(t) {
                            updateBehaviour[t].action(
                            d3.selectAll(updateBehaviour[t].target));
                         };

        if(!targetNames || targetNames.length === 0) {
            for (targ in updateBehaviour) {
                if (updateBehaviour.hasOwnProperty(targ)) {
                    callUpdate(targ);
                }
            }
        } else {
            for (i = 0; i < targetNames.length; i += 1) {
                callUpdate(targetNames[i]);            
            }
        }
    };


    return treestuff
}());