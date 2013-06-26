(function() {
    treestuff.TreePanel = function() {
        var panelID,
            cluster,
            div,
            svg,
            xScale,
            yScale,
            links, //the d3 selection
            nodes, //the d3 selection
            leaves,
            brush,
            brushBox,
            rootHeight,
            minLeafHeight,
            axisSelection,
            aimLine,
            placeAimLine,
            prevCoords, //previous coordinates of aim line, used when zooming
            width = 400, //width of tree display
            height = 500, //height of tree display
            verticalPadding = 20;
            marginForLabels = 300; //additional space for labels
            
            
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
        
        
        /*
            Converts a decimal year to a Date object by multiplying by number
            of milliseconds in 365.25 years.
            Zero point year corresponds to node height of 0.
            Javascript dates appear to start from 1970.
        */
        treestuff.nodeHeightToDate = function(nodeHeight, zeroPointYear) {
            return new Date((zeroPointYear - 1970 - nodeHeight) * 31557600000);
        };
        
        treestuff.dateToNodeHeight = function(date, zeroPointYear) {
            return zeroPointYear - 1970 - date / 31557600000;
        };
        
        /*
            Used in drawing the vertical line coming from the time axis.
        */
        function drawAimLine(coords) {
            prevCoords = coords || prevCoords;
            aimLine = svg.append("line")
                         .attr("x1", prevCoords[0] + 35)
                         .attr("y1", yScale(height))
                         .attr("x2", prevCoords[0] + 35)
                         .attr("y2", "0")
                         .style("stroke", "red");
        };


        function elbow(d) {
            return "M" + xScale(d.source.rootDist) + "," + yScale(d.source.x)
                + "V" + yScale(d.target.x) + "H" + xScale(d.target.rootDist);
        };


        function dashedElbow(d) {
            return "M" + 0 + "," + 0
                + "h" + (xScale(d.rootDist) - d.y);
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
            console.log(d3.max(rootDists));
            var outScale = d3.scale.linear()
                             .domain([0, d3.max(rootDists)])
                             .range([0, w]);

            return outScale;
        };
        
        
            // Clear the previously-active brush, if any.
        function brushstart() {
            if (panelID !== treestuff.focusedPanel) {
                d3.selectAll(".highlighted").classed("highlighted", false);
                treestuff.panels[treestuff.focusedPanel].clearBrush(); //clear Previous brush
            }
            treestuff.focusedPanel = panelID;
        };


        // Highlight the selected leaf links.
        function brushmove() {
            var e = brush.extent();
            var selectedNodes = [];

            leaves.each(function(d) {
                if (yScale(e[0]) < yScale(d.x) && yScale(d.x) < yScale(e[1])) {
                    selectedNodes.push(d);
                }
            });

            treestuff.focusedLeaves = selectedNodes.slice(0);
    
            //highlight all matching leaf nodes
            treestuff.callUpdate("selectionUpdate");
            //addConnectingNodes(selectedNodes);

            links.classed("highlighted", false);

            //highlight full paths
            links.data(getNodeLinks(selectedNodes), treestuff.getLinkKey)
                 .classed("highlighted", true);
        };


        // If the brush is empty, un-highlight all links.
        function brushend() {
            if (brush.empty()) {
                svg.selectAll(".highlighted").classed("highlighted", false);
            }
        };
    
        
        //return public methods
        return {
            panelType : "treePanel",
            
            rootHeight : function() {return rootHeight; },
            
            minLeafHeight : function() {return minLeafHeight; },
            
            clearBrush : function() {
                brush.clear();
            },
                    
            placePanel : function(filename) {
                d3.json(filename, function(json) { //json is the root node of the input tree
                    panelID = 0 + treestuff.counter; //get value, not reference
                    treestuff.focusedPanel = panelID;
                    
                    //initialize d3 cluster layout
                    cluster = d3.layout.cluster()
                                .size([height, width])
                                .separation(function() {return 1; });

                    //get an array of all nodes and where they should be placed 
                    //(ignoring branch lengths)
                    var nodeArray = cluster.nodes(json.root);
                    var linkArray = cluster.links(nodeArray);

                    //give nodes a reference to the link leading to it
                    attachLinkReferences(nodeArray, linkArray);

                    xScale = scaleBranchLengths(nodeArray, width);

                    yScale = d3.scale.linear()
                               .domain([0, height])
                               .range([0, height]);

                    brush = d3.svg.brush()
                            //.x(d3.scale.linear().domain([0, width]).range([0, width]))
                              .y(yScale)
                              .on("brushstart", brushstart)
                              .on("brush", brushmove)
                              .on("brushend", brushend);

                    div = d3.select("body").append("div")
                            .attr("class", "svgBox");

                    svg = div.append("svg")
                             .attr("class", "treePanel")
                             .attr("width", width)
                             .attr("height", height + verticalPadding);
                         
                    var g = svg.append("g")
                               .attr("transform", "translate(35, 0)");                

                    links = g.selectAll("path.link")
                             .data(linkArray, treestuff.getLinkKey)
                             .enter().append("path")
                             .attr("class", "link")
                             .attr("d", elbow);

                    //assign node classification and position it
                    nodes = g.selectAll("g.node")
                             .data(nodeArray, treestuff.getNodeKey)
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
                    g.select(".root")
                       .append("path")
                       .attr("class", "rootLink")
                       .attr("d", function() {return "M" + 0 + "," + 0 + "h" + -20; });
                       
                    rootHeight = g.select(".root").datum().height;

                    leaves = svg.selectAll(".leaf");
        
                    var nameLengths = [];
                    var leafHeights = [];
                    leaves.each(function (d) {
                        leafHeights.push(d.height);
                        nameLengths.push(d.name.length); 
                    });
                    marginForLabels = d3.max(nameLengths) * 6 + 8 + 35;
                    svg.attr("width", width + marginForLabels);
                    div.style("width", (width + marginForLabels + 15) + "px")
                       .style("height", (height + 15) + "px");
                       
                    minLeafHeight = d3.min(leafHeights);
                    
        
                    leaves.append("text")
                          .attr("class", "leafText")
                          .attr("dx", 8)
                          .attr("dy", 3)
                          .attr("text-anchor", "start")
                          .text(function(d) { return d.name; });
        
                    leaves.append("rect")
                          .attr("class", "leafBack")
                          .attr("y", -7)
                          .attr("x", 5)
                          .attr("width", marginForLabels)
                          .attr("height", 12)
                          .on("click", function() {
                              treestuff.focusedPanel = panelID;
                              var node = d3.select(this.parentNode);
                              var addNodeToSelection = !node.classed("highlighted");
                              node.classed("highlighted", addNodeToSelection);
                              addNodeToSelection ? treestuff.focusedLeaves.push(node.datum()) : removeElement(node.datum(), treestuff.focusedLeaves);
                              treestuff.callUpdate("selectionUpdate");
                              if (addNodeToSelection) {
                                  treestuff.callUpdate("focusUpdate", node);
                              }
                          });


                    leaves.append("path")
                       .attr("class", "dashedLink")
                       .attr("d", dashedElbow);


                    brushBox = g.append("rect")
                                  .attr("width", width)
                                  .attr("height", height)
                                  .attr("class", "brushBox")
                                  .call(brush);
                    
                    
                    //add time axis and aim line              
                    var timeScale = d3.time.scale()
                                        .domain([treestuff.nodeHeightToDate(rootHeight, 2014), treestuff.nodeHeightToDate(minLeafHeight, 2014)])
                                        .range([0, width]);
                    var timeAxis = d3.svg.axis()
                                        .scale(timeScale)
                                        .orient("bottom");

                    placeAimLine = false;
                    axisSelection = g.append("g")
                                     .attr("class", "axis")
                                     .attr("transform", "translate(0," + (height) + ")")
                                     .call(timeAxis);
                                     
                    axisSelection.append("rect")
                                 .attr("width", width)
                                 .attr("height", verticalPadding)
                                 .style("fill-opacity", 0)
                                 .on("click", function() {
                                     if (placeAimLine) {
                                         aimLine.remove();
                                     } else {
                                         drawAimLine(d3.mouse(this));
                                     }
                                     placeAimLine = !placeAimLine;
                                 })
                                 .on("mousemove", function() {
                                     if (placeAimLine) {
                                         var coords = d3.mouse(this);
                                         if (aimLine) {aimLine.remove(); };
                                         drawAimLine(coords);
                                     }
                                 });
     
                    treestuff.counter += 1;
                    treestuff.updateGlobalTimeAxis(rootHeight, minLeafHeight);
                }); 
            },
        
            selectionUpdate : function() {
                leaves.classed("highlighted", function(d) {
                    if (treestuff.containsLeaf(treestuff.focusedLeaves, d)) {
                          return true;
                    }
                    return false;
                });
            },
            
            timeSelectionUpdate : function() {
                var start = treestuff.dateToNodeHeight(treestuff.selectedPeriod[0], 2014);
                var end = treestuff.dateToNodeHeight(treestuff.selectedPeriod[1], 2014);
                leaves.each( function (d) {
                    if (start > d.height && d.height > end) {
                        treestuff.focusedLeaves.push(d);
                    }
                });
                this.selectionUpdate();
            },
        
            zoomUpdate : function() {
                yScale.range([0, height * treestuff.scale]);
    
                svg.attr("height", yScale(height) + verticalPadding);
                axisSelection.attr("transform", "translate(0," + yScale(height) + ")");
                if (placeAimLine) {
                    aimLine.remove(); 
                    drawAimLine();
                };
                brushBox.attr("height", yScale(height));
                links.attr("d", elbow);
                nodes.attr("transform", function(d) { return "translate(" + (d.y) + "," + yScale(d.x) + ")"; });
            },
        
            focusUpdate : function(node) {
                if (panelID !== treestuff.focusedPanel) {
                    var nodeSelection =  leaves.filter(function(d) {return node.datum().name === d.name; });

                    if (!nodeSelection.empty()) {
                        div[0][0].scrollTop = yScale(nodeSelection.datum().x) - height / 2;
                    }
                }
            }
        } //end returnable object
    }; //end object closure

})();