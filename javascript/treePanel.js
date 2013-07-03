(function() {
    treestuff.TreePanel = function() {
        var panelID,
            cluster,
            div,
            svg,
            xScale,
            yScale,
            links, //the d3 selection
            innerNodes, //the d3 selection
            leaves,
			lastClickedLeaf,
			lastSelectionRoot,
            maxHeight,
            minHeight,
            brush,
            brushBox,
            timeOrigin,
            timeScale,
            axisSelection,
            aimLine,
            periodHighlight,
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
            return "M" + xScale(d.source.height) + "," + yScale(d.source.x)
                + "V" + yScale(d.target.x) + "H" + xScale(d.target.height);
        };


        function dashedElbow(d) {
            return "M" + 0 + "," + 0
                + "h" + (xScale(d.height) - xScale(minHeight));
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
                node.rootDist = (node.parent ? node.parent.rootDist : 0) + (node.length);
                var myHeight = node.height;
                var parentHeight = node.parent ? node.parent.height : 0;
                var diff = myHeight - parentHeight;
                if (diff > 0) {
                    console.log(panelID + " " + diff);
                }
                //removed 0 as the default node length. all branches should have length specified
            });
            
            console.log(panelID + " height span " + (maxHeight - minHeight));

            var rootDists = nodes.map(function(n) { return n.rootDist; });
            
            console.log(panelID + " length span " + d3.max(rootDists));
            
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
/*
            var e = brush.extent();
			console.log(e);
            var selectedNodes = [];

            leaves.each(function(d) {
                if (e[0] < d.x && d.x < e[1]) {
                    selectedNodes.push(d);
                }
            });
            
            
            treestuff.focusedLeaves = selectedNodes.slice(0);
            
    
            //highlight all matching leaf nodes
            treestuff.callUpdate("selectionUpdate");
            //addConnectingNodes(selectedNodes);
*/
/*
            links.classed("highlighted", false);

            //highlight full paths
            links.data(getNodeLinks(selectedNodes), treestuff.getLinkKey)
                 .classed("highlighted", true);
*/
        };


        // If the brush is empty, un-highlight all links.
        function brushend() {
            if (brush.empty()) {
				lastSelectionRoot = null;
                svg.selectAll(".highlighted").classed("highlighted", false);
            } else {
				var e = brush.extent();
				console.log(e);
				var selectionRoot = {"depth": Infinity};
				links.each(function(d) {
					if (e[0][1] < d.target.x && d.target.x < e[1][1] &&
						e[0][0] < xScale(d.target.height) && xScale(d.source.height) < e[1][0] &&
						d.target.depth < selectionRoot.depth) {
						selectionRoot = d.target;
					}
				});
				doNodeSelection(selectionRoot);
			}
        };
		
		
		function doNodeSelection(node) {
			if (node !== lastSelectionRoot) {
				var selectedNodes = [];
				//selectedNodes = cluster.nodes(selectionRoot);
				selectedNodes = getNodeDescendents(node);
				treestuff.focusedLeaves = selectedNodes.slice(0);
				//addConnectingNodes(selectedNodes);
				/*links.classed("highlighted", false);

				//highlight full paths
				links.data(getNodeLinks(selectedNodes), treestuff.getLinkKey)
					 .classed("highlighted", true);*/
					 
				links.classed("highlighted", function(d) {
				    if (treestuff.contains(getNodeLinks(selectedNodes), d)) {
				  	    return true;
					}
					return false;
					});
					treestuff.callUpdate("selectionUpdate");
				}
			lastSelectionRoot = node;
		};
		
		
		function getNodeDescendents(node) {
			var nodeList = [node];
			if (node.children) {
				for (var i = 0; i < node.children.length; i++) {
					nodeList = nodeList.concat(getNodeDescendents(node.children[i]));
				}
			}
			return nodeList;
		}
    
        
        //return public methods
        return {
            panelType : "treePanel",
            
            maxHeight : function() {return maxHeight; },
            
            minHeight : function() {return minHeight; },
            
            clearBrush : function() {
                brush.clear();
            },
            
            placePanel : function() {
                panelID = 0 + treestuff.counter; //get value, not reference
                treestuff.focusedPanel = panelID;
                
                div = d3.select("body").append("div")
                        .attr("class", "svgBox")
                        .style("height", (height + verticalPadding) + "px");

                svg = div.append("svg")
                         .attr("class", "treePanel")
                         .attr("width", width + marginForLabels)
                         .attr("height", height + verticalPadding);
                             
                treestuff.counter += 1;
            },
                    
            initializePanelData : function(filename) {
                d3.json(filename, function(json) { //json is the root node of the input tree
                    var nodeArray,
                        linkArray,
                        nameLengths,
                        leafHeights,
                        i,
                        g,
                        timeAxis;
                
                
                    timeOrigin = parseInt(json.origin, 10);
                    //initialize d3 cluster layout
                    cluster = d3.layout.cluster()
                                .size([height, width])
                                .separation(function() {return 1; });

                    //get an array of all nodes and where they should be placed 
                    //(ignoring branch lengths)
                    nodeArray = cluster.nodes(json.root);
                    linkArray = cluster.links(nodeArray);
                    
                    //nameLengths = [];
                    leafHeights = [];
                    
                    for (i = 0; i < nodeArray.length; i += 1) {
                        if (!nodeArray[i].children) { //if leaf
                            leafHeights.push(nodeArray[i].height);
                            //nameLengths.push(nodeArray[i].length);
                        }
                    };
                    /*marginForLabels = d3.max(nameLengths) * 6 + 8 + 35;
                    svg.attr("width", width + marginForLabels);
                    div.style("width", (width + marginForLabels + 15) + "px")
                       .style("height", (height + 15) + "px");
                     */
                    minHeight = d3.min(leafHeights);
                    maxHeight = json.root.height;
                    xScale = d3.scale.linear()
                               .domain([maxHeight, minHeight])
                               .range([0, width]);

                    //give nodes a reference to the link leading to it
                    attachLinkReferences(nodeArray, linkArray);

                    yScale = d3.scale.linear()
                               .domain([0, height])
                               .range([0, height]);

                    brush = d3.svg.brush()
                              .x(d3.scale.linear().domain([0, width]).range([0, width]))
                              .y(yScale)
                              .on("brushstart", brushstart)
                              .on("brush", brushmove)
                              .on("brushend", brushend);


                         
                    g = svg.append("g")
                           .attr("transform", "translate(35, 0)");                

                    links = g.selectAll("path.link")
                             .data(linkArray, treestuff.getLinkKey)
                             .enter().append("path")
                             .attr("class", "link")
                             .attr("d", elbow);

                    //assign node classification and position it
                    g.selectAll(".node")
                     .data(nodeArray, treestuff.getNodeKey)
                     .enter().append("g")
                     .attr("class", function(d) {
                         if (d.children) {
                             if (d.depth === 0) {
                                 return "root inner node";
                             }
                             return "inner node";
                         }
                         return "leaf node";
                     });
                     
                    innerNodes = g.selectAll(".inner")
                                  .attr("transform", function(d) { return "translate(" + xScale(d.height) + "," + yScale(d.x) + ")"; });
					/*innerNodes.append("circle")
							  .attr("r", 3)
							  .on("click", function() {
							      doNodeSelection(this.__data__);
							  });
*/
                    //draw root node line. It is placed inside the root nodes g so it transforms along with it.           
                    g.select(".root")
                       .append("path")
                       .attr("class", "rootLink")
                       .attr("d", function() {return "M" + 0 + "," + 0 + "h" + -20; });
                    
                    leaves = svg.selectAll(".leaf")
                                .attr("transform", function(d) { return "translate(" + xScale(minHeight) + "," + yScale(d.x) + ")"; });

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
							//three modes of click-selection:
							//no keys pressed - select clicked node, deselect everything else
							//ctrl (cmd?) pressed - select multiple, nonadjacent or adjacent nodes
							//shift pressed - select a range to clicked node from last clicked (ctrl or otherwise) node. deselect the rest
                              treestuff.focusedPanel = panelID;
                              var node = d3.select(this.parentNode);
							  if (d3.event.ctrlKey) {
								  lastClickedLeaf = node;
							      var addNodeToSelection = !node.classed("highlighted");
                                  node.classed("highlighted", addNodeToSelection);
                                  addNodeToSelection ? treestuff.focusedLeaves.push(node.datum()) : removeElement(node.datum(), treestuff.focusedLeaves);
                                  if (addNodeToSelection) {
                                      treestuff.callUpdate("focusUpdate", node);
                                  }
							  } else if (d3.event.shiftKey) {
								  //var startNode = treestuff.focusedLeaves[treestuff.focusedLeaves.length - 1];
								  var startPos = lastClickedLeaf ? lastClickedLeaf.datum().x : 0;
								  var endPos = node.datum().x;
								  if (startPos > endPos) {
								      var temp = endPos;
									  endPos = startPos;
									  startPos = temp;
								  }
							      treestuff.focusedLeaves = [];
								  leaves.each(function(d) {
								      if (startPos <= d.x && d.x <= endPos) {
									      treestuff.focusedLeaves.push(d);
									  }
								  });
							  } else {
							      lastClickedLeaf = node;
							      treestuff.focusedLeaves = [node.datum()];
								  treestuff.callUpdate("focusUpdate", node);
							  }
							  treestuff.callUpdate("selectionUpdate");
                          });


                    leaves.append("path")
                       .attr("class", "dashedLink")
                       .attr("d", dashedElbow);
                       
                    //add data to crossfilter
                    leaves.each(function (d) {
                        //tips with the same name should contain the same data
                        if (!treestuff.globalData.hasOwnProperty(d.name)) {
                            treestuff.globalData[d.name] = {"height" : d.height};
                            treestuff.taxa.add([{"name": d.name, "date": treestuff.nodeHeightToDate(d.height, timeOrigin)}]);
                        }
                    });


                    /*brushBox = g.append("rect")
                                .attr("width", width)
                                .attr("height", height)
                                .attr("class", "brushBox")*/
								g.call(brush);
                    
                    
                    //add time axis and aim line              
                    timeScale = d3.time.scale()
                                       .domain([treestuff.nodeHeightToDate(maxHeight, timeOrigin), treestuff.nodeHeightToDate(minHeight, timeOrigin)])
                                       .range([0, width])
                                       .clamp(true);

                    timeAxis = d3.svg.axis()
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

                    treestuff.updateGlobalTimeAxis(maxHeight, minHeight);
                }); 
            },
        
            selectionUpdate : function() {
                leaves.classed("highlighted", function(d) {                    
                    if (treestuff.containsLeaf(treestuff.focusedLeaves, d)) {
                          return true;
                    }
                    return false;
                });
                /*leaves.classed("highlighted", false);
                leaves.data(treestuff.focusedLeaves, treestuff.getNodeKey)
                      .classed("highlighted", true);*/
                
            },
            
            timeSelectionUpdate : function() {
                var start = treestuff.dateToNodeHeight(treestuff.selectedPeriod[0], timeOrigin);
                var end = treestuff.dateToNodeHeight(treestuff.selectedPeriod[1], timeOrigin);
                if (periodHighlight) {
                    periodHighlight.attr("x", timeScale(treestuff.selectedPeriod[0]) + 35)
                                   .attr("width", timeScale(treestuff.selectedPeriod[1]) - timeScale(treestuff.selectedPeriod[0]));
                } else {
                    periodHighlight = svg.append("rect")
                                         .attr("x", timeScale(treestuff.selectedPeriod[0]) + 35) 
                                         .attr("y", 0)
                                         .attr("height", yScale(height))
                                         .attr("width", timeScale(treestuff.selectedPeriod[1]) - timeScale(treestuff.selectedPeriod[0]))
                                         .style("fill", "green")
                                         .style("fill-opacity", 0.2);
                }                
            },
        
            zoomUpdate : function() {
                yScale.range([0, height * treestuff.scale]);
    
                svg.attr("height", yScale(height) + verticalPadding);
                axisSelection.attr("transform", "translate(0," + yScale(height) + ")");
                if (placeAimLine) {
                    aimLine.remove(); 
                    drawAimLine();
                };
                //brushBox.attr("height", yScale(height));
                links.attr("d", elbow);
                innerNodes.attr("transform", function(d) { return "translate(" + xScale(d.height) + "," + yScale(d.x) + ")"; });
                leaves.attr("transform", function(d) { return "translate(" + xScale(minHeight) + "," + yScale(d.x) + ")"; });
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