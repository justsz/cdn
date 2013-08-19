(function() {
    "use strict";
    treestuff.TreePanel = function() {
        var panelID,
            cluster,
            div,
            controlPanel,
            minimize = true,
            svg,
            xScale,
            yScale,
            links, //the d3 selection
            innerNodes, //the d3 selection
            leaves,
			lastClickedLeaf,
			lastSelectionRoot,
            thisLeafSelection,
            maxHeight,
            minHeight,
            brushBox,
            timeOrigin,
            timeScale,
            axisSelection,
            aimLine,
            periodHighlight,
            extent,
            placeAimLine,
            prevCoords, //previous coordinates of aim line, used when zooming
            width = 400, //width of tree display
            height = 500, //height of tree display
            verticalPadding = 20,
            horizontalPadding = 35,
            marginForLabels = 300; //additional space for labels
            
            
        function attachLinkReferences(nodes, linkData) {
            var i, j;
            for (i = 0; i < nodes.length; i += 1) {
                for (j = 0; j < linkData[0].length; j += 1) {
                    if (nodes[i] === linkData[0][j].__data__.target) {
                        nodes[i].uplink = d3.select(linkData[0][j]);
                        break;
                    }
                }
                //nodes[i].uplink = linkData.filter(function(d) {return nodes[i] === d.target; });
            }
        };
        
        
        function getNodeLinks(nodes) {
            var links = [],
                i;
            for (i = 0; i < nodes.length; i += 1) {
                if (nodes[i].uplink) {
                    links.push(nodes[i].uplink);
                }
            }
            return links;
        };
        
        
        /*
        Modifies passed list of nodes. The parent node of two selected sibling nodes is added
        to the selection.
        */
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
        
        /*
        Reverse function of nodeHeightToDate.
        */
        treestuff.dateToNodeHeight = function(date, zeroPointYear) {
            return zeroPointYear - 1970 - date / 31557600000;
        };
        
        /*
        Used in drawing the vertical line coming from the time axis.
        */
        function drawAimLine(coords) {
            prevCoords = coords || prevCoords;
            aimLine = svg.append("line")
                         .attr("x1", prevCoords[0] + horizontalPadding)
                         .attr("y1", yScale(height) + verticalPadding)
                         .attr("x2", prevCoords[0] + horizontalPadding)
                         .attr("y2", "0")
                         .style("stroke", "red");
        };


        /*
        Draws node link.
        */
        function elbow(d) {
            return "M" + xScale(d.source.height) + "," + yScale(d.source.x)
                + "V" + yScale(d.target.x) + "H" + xScale(d.target.height);
        };


        /*
        Draws dashed link coming from leaves.
        */
        function dashedElbow(d) {
            return "M" + 0 + "," + 0
                + "h" + (xScale(d.height) - xScale(minHeight));
        };
        

        /*
        Removes the first occurance an element from an array if it is found in the array.
        */
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


        /*
        Calculates branch scaling based on branch length.
        */
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
            
            //development time check for consistency between heights and lengths
            console.log(panelID + " height span " + (maxHeight - minHeight));

            var rootDists = nodes.map(function(n) { return n.rootDist; });
            
            console.log(panelID + " length span " + d3.max(rootDists));
            
            var outScale = d3.scale.linear()
                             .domain([0, d3.max(rootDists)])
                             .range([0, w]);

            return outScale;
        };
        
        
        function isMac() {
            return navigator.appVersion.indexOf("Mac")!=-1;
        }
 
        
        /*
        Topological selection mouse events.
        */
        function mDown() {            
            extent = [d3.mouse(this), []];
            d3.select(this.parentNode)
              .append("rect")
              .attr("id", "extent")
              .attr("x", extent[0][0])
              .attr("y", extent[0][1])
              .attr("width", 0)
              .attr("height", 0);
            
            //clear active time and leaf selections
            if (treestuff.brushHighlight) {
                treestuff.selectedLeaves = [];
                treestuff.selectedPeriod = [0,0];
                d3.select(".axis").call(treestuff.globalTimeBrush.clear());
                treestuff.brushHighlight.remove();
                treestuff.brushHighlight = null;
                treestuff.callUpdate("leafSelectionUpdate");
                treestuff.callUpdate("timeSelectionUpdate");
            }

            if (!d3.event.shiftKey) {
                //clears previously highlighted links
                treestuff.selectedNodes = [];
                treestuff.callUpdate("nodeSelectionUpdate");

                //clears previously highlighted leaves
                treestuff.selectedLeaves = [];
                treestuff.callUpdate("leafSelectionUpdate");
            }

            //this line needed to make selection not move like a slug!
            event.preventDefault();
        };
        
        function mMove() {
            if (extent) {
                extent[1] = d3.mouse(brushBox[0][0]);
                
                d3.select("#extent")
                  .attr("x", d3.min([extent[0][0], extent[1][0]]))
                  .attr("y", d3.min([extent[0][1], extent[1][1]]))
                  .attr("width", Math.abs(extent[1][0] - extent[0][0]))
                  .attr("height", Math.abs(extent[1][1] - extent[0][1]));
            }
        };
        
        function mUp() {
            if (extent) {
                var temp,
                    selectionRoot;

                //remove visible extent first. It feels a bit snappier that way...
                d3.select("#extent").remove();

                //transpose the two points so that extent[0] is top left
                //and extent[1] is bottom right
                if (extent[1][0] < extent[0][0]) {
                    temp = extent[0][0];
                    extent[0][0] = extent[1][0];
                    extent[1][0] = temp;
            
                }
                if (extent[1][1] < extent[0][1]) {
                    temp = extent[0][1];
                    extent[0][1] = extent[1][1];
                    extent[1][1] = temp;
                }
                   
                selectionRoot = {"depth": Infinity};
                    /*links.each(function(d) {
                        if (extent[0][1] < yScale(d.target.x) && yScale(d.target.x) < extent[1][1] &&
                            extent[0][0] < xScale(d.target.height) && xScale(d.source.height) < extent[1][0] &&
                            d.target.depth < selectionRoot.depth) {
                            selectionRoot = d.target;
                        }
                    });*/
                    
                    innerNodes.each(function(d) {
                        if (extent[0][1] < yScale(d.x) && yScale(d.x) < extent[1][1] &&
                            extent[0][0] < xScale(d.height) && xScale(d.height) < extent[1][0] &&
                            d.depth < selectionRoot.depth) {
                            selectionRoot = d;
                        }
                    });
                    
                
                doNodeSelection(selectionRoot);
        
        
                extent = undefined;
                event.preventDefault();
            }
        };
		
		
		function doNodeSelection(node) {
			if (node !== lastSelectionRoot) {
				var selectedLeaves = getDescendingLeaves(node),
				    innerLinks,
                    i;

				//focus only on leaf nodes
                if (!d3.event.shiftKey) {
				    treestuff.selectedLeaves = selectedLeaves.slice(0);
                } else {
                    for (i = 0; i < selectedLeaves.length; i += 1) {
                        if (!treestuff.containsLeaf(treestuff.selectedLeaves, selectedLeaves[i])) {
                            treestuff.selectedLeaves.push(selectedLeaves[i]);
                        }
                    }
                }
				treestuff.callUpdate("leafSelectionUpdate");
				
				//continue this function with inner nodes as well
                innerLinks = getNodeLinks(selectedLeaves)
                            .concat(getNodeLinks(getDescendingInnerNodes(node)));
                
                if (!d3.event.shiftKey) {
                   links.classed("highlighted", false);
                }
                if (node.depth !== Infinity) {
                    for (i = 0; i < innerLinks.length; i += 1) {
                        innerLinks[i].classed("highlighted", true);
                    }
                }
			}
			lastSelectionRoot = node;
		};
		
		
		function getDescendingInnerNodes(node) {
			var nodeList = [];
			if (node.children) {
			    nodeList.push(node)
				for (var i = 0; i < node.children.length; i++) {
					nodeList = nodeList.concat(getDescendingInnerNodes(node.children[i]));
				}
			} 
		    return nodeList;
		}


        function attachParent(node, parent) {
            node.parent = parent;
            if (node.children) {
                for (var i = 0; i < node.children.length; i++) {
                    attachParent(node.children[i], node);
                }
            } 
        }
		
		function getDescendingLeaves(node) {
		    var nodeList = [];
			if (node.children) {
				for (var i = 0; i < node.children.length; i++) {
					nodeList = nodeList.concat(getDescendingLeaves(node.children[i]));
				}
			} else {
			    nodeList.push(node);			    
			}
		    return nodeList;
		}
    
        
        //return public methods and variables
        var panel = {
            panelType : "treePanel",


            finishedLoading : false,


            panelID : undefined,


            treeData : undefined,

            
            maxHeight : function() {return maxHeight; },

            
            minHeight : function() {return minHeight; },

            
            /*
            Create and place a container for the tree.
            */
            placePanel : function(targ) {
                panelID = 0 + treestuff.counter; //get value, not reference
                this.panelID = panelID;
                treestuff.focusedPanel = panelID;
                
                var outerDiv = targ
                                 .append("div")
                                 //.attr("class", "span1")
                                 .style("min-height", "20px")
                                 .style("min-width", "100px")
                                 .style("display", "inline-block");
                                 //.style("width", "100px")
                                 //.style("height", "20px");
                                // .attr("position", "relative");
                                 //.style("height", (height + 2 * verticalPadding + 3 + 15) + "px");
                                 //.attr("width", "900px");
                                 
                controlPanel = outerDiv.append("svg")
                                  .style("position", "absolute")
                                  //.attr("width", width + marginForLabels)
                                  .attr("height", 15);                
                                  
                div = outerDiv.append("div")
                        .attr("class", "svgBox")
                        //.style("position", "relative")
                        //.style("top", "15px")
                        //.style("width", width + "px")
                        .style("height", (height + 2 * verticalPadding + 3) + "px");
                
                controlPanel.append("rect")
                            .attr("x", 3)
                            .attr("y", 3)
                            .attr("width", 10)
                            .attr("height", 10)
                            .style("fill", "gray")
                            .on("click", function() {
                                if (minimize) {
                                    div.style("display", "none");
                                } else {
                                    div.style("display", "inline-block");
                                }
                                minimize = !minimize;
                            });

                svg = div.append("svg")
                         .attr("class", "treePanel")
                         .attr("width", width + marginForLabels)
                         .attr("height", height + 2 * verticalPadding);
                             
                treestuff.counter += 1;
            },

            
            /*
            Fill container with data.
            */
            initializePanelData : function(filename) {
                var that = this;
                d3.json(filename, function(json) { //json is the parsed input object
                    var nodeArray,
                        linkArray,
                        nameLengths,
                        leafHeights,
                        i,
                        g,
                        timeAxis,
                        prop,
                        propRegex = /(.+)\.fullSet/;

                    that.treeData = json;
                        
                    controlPanel.append("text")
                                .attr("x", 15)
                                .attr("y", 12)
                                .attr("text-anchor", "start")
                                .text(json.name);
                
                
                    timeOrigin = parseFloat(json.origin);
                    //initialize d3 cluster layout
                    cluster = d3.layout.cluster()
                                .size([height, width])
                                .separation(function() {return 1; });

                    attachParent(json.root, undefined);

                    //get an array of all nodes and where they should be placed 
                    //(ignoring branch lengths)
                    nodeArray = cluster.nodes(json.root);
                    linkArray = cluster.links(nodeArray);

                    //populate node crossfilter
                    treestuff.nodes.add(nodeArray.map(function(n) {
                       return {node: n, date: treestuff.nodeHeightToDate(n.height, timeOrigin), treeID: panelID}; 
                    }));
                    
                    //nameLengths = [];
                    leafHeights = [];
                    
                    for (i = 0; i < nodeArray.length; i += 1) {
                        if (!nodeArray[i].children) { //if leaf
                            leafHeights.push(nodeArray[i].height);
                            //nameLengths.push(nodeArray[i].getComputedTextLength());
                        }
                    };
                    //marginForLabels = d3.max(nameLengths) * 6 + 8 + 35;
                    svg.attr("width", width + marginForLabels);
                    div.style("width", (width + marginForLabels + 15) + "px")
                       .style("height", (height + 2 * verticalPadding) + "px");
                    
                    minHeight = d3.min(leafHeights);
                    maxHeight = json.root.height;
                    xScale = d3.scale.linear()
                               .domain([maxHeight, minHeight])
                               .range([0, width]);



                    yScale = d3.scale.linear()
                               .domain([0, height])
                               .range([0, height]);

                    g = svg.append("g")
                           .attr("transform", "translate(" + horizontalPadding + "," + verticalPadding + ")");                

                    links = g.selectAll("path.link")
                             .data(linkArray, treestuff.getLinkKey)
                             .enter().append("path")
                             .attr("class", "link")
                             .attr("d", elbow);
                             
                    //give nodes a reference to the link leading to it
                    attachLinkReferences(nodeArray, links);

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
							//ctrl/cmd pressed - select multiple, nonadjacent or adjacent nodes
							//shift pressed - select a range to clicked node from last clicked (ctrl or otherwise) node. deselect the rest
                              treestuff.focusedPanel = panelID;
                              var node = d3.select(this.parentNode);
                              links.classed("highlighted", false);
							  if (d3.event.metaKey || d3.event.ctrlKey) { //meta key is apple's command key
								  lastClickedLeaf = node;
							      var addNodeToSelection = !node.classed("highlighted");
                                  node.classed("highlighted", addNodeToSelection);
                                  addNodeToSelection ? treestuff.selectedLeaves.push(node.datum()) : removeElement(node.datum(), treestuff.selectedLeaves);
                                  if (addNodeToSelection) {
                                      treestuff.callUpdate("focusUpdate", node);
                                  }
							  } else if (d3.event.shiftKey) {
								  //var startNode = treestuff.selectedLeaves[treestuff.selectedLeaves.length - 1];
								  var startPos = lastClickedLeaf ? lastClickedLeaf.datum().x : 0;
								  var endPos = node.datum().x;
								  if (startPos > endPos) {
								      var temp = endPos;
									  endPos = startPos;
									  startPos = temp;
								  }
							      treestuff.selectedLeaves = [];
								  leaves.each(function(d) {
								      if (startPos <= d.x && d.x <= endPos) {
									      treestuff.selectedLeaves.push(d);
									  }
								  });
							  } else {
							      lastClickedLeaf = node;
							      treestuff.selectedLeaves = [node.datum()];
								  treestuff.callUpdate("focusUpdate", node);
							  }
							  treestuff.callUpdate("leafSelectionUpdate"); //possible to make this more incremental for better performance
                          });


                    leaves.append("path")
                       .attr("class", "dashedLink")
                       .attr("d", dashedElbow);
                       
                    //add data to crossfilter
                    leaves.each(function (d) {
                        //tips with the same name should contain the same data
                        if (!treestuff.globalData.hasOwnProperty(d.name)) {
                            treestuff.globalData[d.name] = {"height" : d.height};
                            treestuff.taxa.add([{"name": d.name,
                                                 "date": treestuff.nodeHeightToDate(d.height, timeOrigin),
                                                 "location": d.location || ""}]);
                        }
                    });

                    //add data to traitPanel
                    for (i = 0; i < treestuff.panels.length; i += 1) {
                        //lookup the trait panel
                        if (treestuff.panels[i].panelType === "traitPanel" || treestuff.panels[i].panelType === "legendPanel") {
                            for (prop in json) {
                                if (json.hasOwnProperty(prop)) {
                                    var match = propRegex.exec(prop);
                                    if (match) {
                                       var traitDict = {};
                                       traitDict[match[1]] = json[prop];
                                       treestuff.panels[i].addTraits(traitDict);
                                    }
                                }
                            }
                        }
                    }                    
                    

                    brushBox = g.append("rect")
                                .attr("width", width)
                                .attr("height", height)
                                .attr("class", "brushBox")
                                .on("mousedown", mDown);
                                //.on("mousemove", mMove)
                                //.on("mouseup", mUp);
                                                    
                    svg.on("mousemove", mMove)
                       .on("mouseup", mUp);                       
                    
                    
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

                    that.finishedLoading = true;
                }); 
            },

        
            /*
            Saves the leaf selection and highlights selected leaves.
            */
            leafSelectionUpdate : function() {
                thisLeafSelection = leaves.filter(function(d) {                    
                    return treestuff.containsLeaf(treestuff.selectedLeaves, d);
                });
                leaves.classed("highlighted", false);
                thisLeafSelection.classed("highlighted", true);
            },


            leafColorUpdate : function(args) {
                /*if (args[1]) {
                    leaves.select("text")
                          .style("fill", function(d) {
                              if (treestuff.containsLeaf(treestuff.selectedLeaves, d)) {
                                  return args[1]; //return the color
                              }
                              return null; //remove the style
                          });
                } else {
                    leaves.select("text").style("fill", null);
                }*/     

                thisLeafSelection.select("text").style("fill", args[1]);
            },

            
            timeSelectionUpdate : function() {
                // var start = treestuff.dateToNodeHeight(treestuff.selectedPeriod[0], timeOrigin);
                // var end = treestuff.dateToNodeHeight(treestuff.selectedPeriod[1], timeOrigin);
                if (periodHighlight) {
                    //console.log(start + " " + end);
                    periodHighlight.attr("x", timeScale(treestuff.selectedPeriod[0]) + horizontalPadding)
                                   .attr("width", timeScale(treestuff.selectedPeriod[1]) - timeScale(treestuff.selectedPeriod[0]));
                } else {
                    periodHighlight = svg.append("rect")
                                         .attr("class", "timeSelection")
                                         .attr("x", timeScale(treestuff.selectedPeriod[0]) + horizontalPadding) 
                                         .attr("y", verticalPadding)
                                         .attr("height", "100%")
                                         .attr("width", timeScale(treestuff.selectedPeriod[1]) - timeScale(treestuff.selectedPeriod[0]));
                }                
            },

            
            //highlights the link going up from the selected nodes
            nodeSelectionUpdate : function() {
                links.classed("highlighted", false);
                for (var i = 0; i < treestuff.selectedNodes.length; i += 1) {
                    treestuff.selectedNodes[i].uplink.classed("highlighted", true);
                }
            },


            traitSelectionUpdate : function() {
                if (treestuff.traitType && treestuff.traitValues) {
                   links.style("stroke", function(d) {
                       for (var i = 0; i < treestuff.traitValues.length; i += 1) {
                           if (d.target[treestuff.traitType] === treestuff.traitValues[i].name) {
                               return treestuff.traitValues[i].color;
                           }
                        }
                        return null;
                   });
                }
            },

        
            zoomUpdate : function() {
                yScale.range([0, height * treestuff.scale]);

                if (treestuff.scale === 1) {
                    div.style("overflow", "hidden");
                } else {
                    div.style("overflow", "auto");
                }
    
                svg.attr("height", yScale(height) + 2 * verticalPadding);
                axisSelection.attr("transform", "translate(0," + yScale(height) + ")");
                if (placeAimLine) {
                    aimLine.remove(); 
                    drawAimLine();
                };
                brushBox.attr("height", yScale(height));
                links.attr("d", elbow);
                innerNodes.attr("transform", function(d) { return "translate(" + xScale(d.height) + "," + yScale(d.x) + ")"; });
                leaves.attr("transform", function(d) { return "translate(" + xScale(minHeight) + "," + yScale(d.x) + ")"; });

            },
        

            /*
            Scrolls viewport to the selected node.
            */
            focusUpdate : function(args) {
                if (panelID !== treestuff.focusedPanel) {
                    var nodeSelection =  leaves.filter(function(d) {return args[1].datum().name === d.name; });

                    if (!nodeSelection.empty()) {
                        div[0][0].scrollTop = yScale(nodeSelection.datum().x) - height / 2;
                    }
                }
            },


        } //end returnable object

        return panel;
    }; //end object closure

})();







