(function() {
    /*
    When moving forward in time there are a couple of decisions to make 
    about how to deal with nodes as they are being passed.
    "removingInnerNodes" sets whether an inner node particle is removed
    once it splits into children nodes
    "removePassedLeaves" sets whether leaf nodes are removed when the 
    time scrobbler moves past their sampling date
    */
    var removeInnerNodes = true;
    var removePassedLeaves = true;

    var climbNodes = function(that) {
                /*
                Start with root at its initial location.
                When a branching point is reached, there will be new virus particles.
                These have been sequence somewhere. It could be the same location as the parent, or different.
                At any time the currently "active" viruses should be display. No past nodes.

                */

                var a,
                    noMoreChildren = true,
                    initLoc,
                    newNodes;
                if (that.nodes.length < 1) {
                    if (that.tree.children) {
                        noMoreChildren = false;
                    }
                    for (a = 0; a < that.foci.length; a += 1) {
                        if (that.foci[a].name === that.tree.location) {
                            initLoc = that.project(that.centroids[that.tree.location]);
                            that.nodes.push({virNum: that.virNum, id: a, x: initLoc[0], y:initLoc[1], r: that.radius, children: that.tree.children});
                            that.virNum += 1;
                            break;
                        }
                    }
                } else {
                    noMoreChildren = true;
                    newNodes = [];
                    that.nodes.forEach(function(o) {
                        if (o.children) {
                            noMoreChildren = false;
                            o.children.forEach(function(c) {
                                for (a = 0; a < that.foci.length; a += 1) {
                                    if (that.foci[a].name === c.location) {
                                        newNodes.push({virNum: that.virNum, id: a, x: o.x, y: o.y, r: that.radius, children: c.children});
                                        that.virNum += 1;
                                        break;
                                    }
                                }
                            });
                        }
                    });
                    that.nodes = newNodes;
                    that.force.nodes(newNodes);
                }
                console.log(that.nodes.length);


                that.force.start();


                var nodeSel = that.g.selectAll("circle.virusParticle")
                                    .data(that.nodes, function(d) {return d.virNum});

                nodeSel.exit().transition().attr("r", 0).remove();                                    

                nodeSel.enter()
                       .append("svg:circle")
                       .attr("class", "virusParticle")
                       .attr("cx", function(d) {return d.x; })
                       .attr("cy", function(d) {return d.y; })
                       .style("fill", that.fill(that.color)) 
                       .style("stroke", 1)
                       .attr("r", 0)
                       .transition()
                       .attr("r", function(d) {return d.r; });

                if (noMoreChildren) {
                    clearInterval(that.intervalID);
                }
    };

    pandemix.map.virusParticleLayer = L.Class.extend({
        svg: undefined,

        g: undefined,

        bounds: undefined,

        tree: undefined,

        force: undefined,

        nodes: undefined,

        foci: undefined,

        centroids: undefined,

        currNodes: undefined,

        project: undefined,

        fill: d3.scale.category10(),

        color: undefined,

        radius: undefined,

        virNum: 0,

        intervalID: undefined,

        initialize: function (args) {
            var that = this;
            that.map = args.map;
            that.tree = args.tree;
            that.project = args.project;
            that.centroids = args.centroids;
            that.currNodes = [that.tree]; //[[that.tree, that.tree.location]];
            that.color = args.color;
            that.foci = [];
            that.bounds = args.bounds; //[[-180, -90], [180, 90]];
            

            // create a DOM element and put it into one of the map panes
            that.el = L.DomUtil.create('div', 'virusParticleLayer leaflet-zoom-hide');

            that.svg = d3.select(that.el).append("svg");
            that.svg.on("mousedown", function() {event.preventDefault(); });
            that.g = that.svg.append("g");

            var sizing = that.reset(); //set svg's size and return the size
            that.nodes = [];

            that.force = d3.layout.force()
                .nodes(that.nodes)
                .links([])
                .gravity(0)
                .size(sizing)
                .charge(-0.5)
                .friction(0.85); 


            that.force.on("tick", function(e) {
              // Push nodes toward their designated focus.
              var k = 0.1 * e.alpha;
              that.nodes.forEach(function(o, i) {
                o.y += (that.foci[o.id].y - o.y) * k;
                o.x += (that.foci[o.id].x - o.x) * k;
              });

              that.g.selectAll("circle.virusParticle")
                  .attr("cx", function(d) { return d.x; })
                  .attr("cy", function(d) { return d.y; });
            });

            var day = (31557600000 / 365.25);

            var prd = [new Date(30 * 31557600000), new Date(30 * 31557600000 + day * 10) ]; //2000
            // var prd = [new Date(44 * 31557600000), new Date(44 * 31557600000 + day * 10) ]; //2014

            //pandemix.showPeriod = that.showPeriod;
            

            //place root node.. not great solution at the moment
            // for (a = 0; a < that.foci.length; a += 1) {
            //     if (that.foci[a].name === that.tree.location) {
            //         initLoc = that.project(that.centroids[that.tree.location]);
            //         that.nodes.push({virNum: that.virNum, id: a, x: initLoc[0], y:initLoc[1], r: that.radius, node: that.tree});
            //         that.virNum += 1;
            //         break;
            //     }
            // }

            //that.intervalID = setInterval(function() {that.showPeriod(prd); prd[0].setDate(prd[0].getDate() + 10); prd[1].setDate(prd[1].getDate() + 10);}, 100);

        },

        timeSelectionUpdate: function(period) {
            var period = period || pandemix.selectedPeriod;
            var that = this;
            var filteredNodes = pandemix.nodeDateDim.filterRange(period).top(Infinity);
            var selectedNodes = [];

            filteredNodes.forEach(function(d) {
                if (d.treeID === that.color) {
                    selectedNodes.push(d.node);
                }
            });

            var a,
                initLoc,
                newNodes;

            newNodes = [];

            selectedNodes.forEach(function(nd) {
                var parent = nd.parent;
                var parentFound = false;
                var initLoc = [];

                for (a = 0; a < that.nodes.length; a += 1) {   
                    var n = that.nodes[a];
                    if (n.node === parent) {
                        parentFound = true;
                        initLoc.push(n.x);
                        initLoc.push(n.y);
                        if (removeInnerNodes) {
                            that.nodes.splice(a, 1);
                        }
                        break;
                    }
                };


                if (nd.children) {
                    nd.children.forEach(function(child) {
                        for (a = 0; a < that.foci.length; a += 1) {
                            if (that.foci[a].name === child.location) {
                                if (!parentFound) {
                                    initLoc = that.project(that.centroids[child.location]);
                                }
                                that.nodes.push({virNum: that.virNum, id: a, x: initLoc[0], y:initLoc[1], r: that.radius, node: child});
                                that.virNum += 1;
                                break;
                            }
                        }
                    });
                } else {
                    if (removePassedLeaves) {
                        for (a = 0; a < that.nodes.length; a += 1) {   
                            var n = that.nodes[a];
                            if (n.node === nd) {
                                that.nodes.splice(a, 1);
                                break;
                            }
                        }
                    }
                }
            });

            that.force.start();


            var nodeSel = that.g.selectAll("circle.virusParticle")
                                .data(that.nodes, function(d) {return d.virNum});

            nodeSel.exit().remove(); //.transition().attr("r", 0)

            nodeSel.enter()
                   .append("svg:circle")
                   .attr("class", "virusParticle")
                   .attr("cx", function(d) {return d.x; })
                   .attr("cy", function(d) {return d.y; })
                   .style("fill", that.fill(that.color)) 
                   .style("stroke", 1)
                   // .attr("r", 0)
                   // .transition()
                   .attr("r", function(d) {return d.r; });


            //pandemix.selectedPeriod = period;
            //pandemix.callUpdate("timeSelectionUpdate");

        },

        onAdd: function (map) {
            var that = this;
            map.getPanes().overlayPane.appendChild(that.el);
            map.on('viewreset', that.reset, that);
            that.reset();
        },

        onRemove: function (map) {
            var that = this;
            // remove layer's DOM elements and listeners
            map.getPanes().overlayPane.removeChild(that.el);
            map.off('viewreset', that.reset, that);
        },

        reset: function () {
            var that = this,
                w,
                h;

            var bottomLeft = that.project(that.bounds[0]),
            topRight = that.project(that.bounds[1]);

            w = topRight[0] - bottomLeft[0];
            h = bottomLeft[1] - topRight[1];

            console.log(bottomLeft, topRight);

            that.svg .attr("width", w)
                .attr("height", h)
                .style("margin-left", bottomLeft[0] + "px")
                .style("margin-top", topRight[1] + "px");

            that.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

            that.radius = that.map.getZoom();

            that.g.selectAll("circle.virusParticle").attr("r", that.radius);

            that.foci = [];
            for (c in that.centroids) {
                if (that.centroids.hasOwnProperty(c)) {
                    that.foci.push({name: c, x: that.project(that.centroids[c])[0], y: that.project(that.centroids[c])[1], occupants: [], size: 0});
                }
            }
            if (that.force) {
               that.force.charge(- that.radius / 8).start();
            }

            
            return [w, h];
        }

    });

})();


//some misc clumping code...

// that.foci.forEach(function(o) {
                //     var occs = o.occupants;
                //     var clump = occs;
                //     /*for (var i = 0; i < occs.length - 1; i += 1) {
                //         for (var j = i + 1; j < occs.length; j += 1) {
                //             //console.log(((occs[i].x - occs[j].x) * (occs[i].x - occs[j].x) + (occs[i].y - occs[j].y) * (occs[i].y - occs[j].y)));
                //             if (((occs[i].x - occs[j].x) * (occs[i].x - occs[j].x) + (occs[i].y - occs[j].y) * (occs[i].y - occs[j].y)) < 4) {
                //                 clump.push(occs[i]);
                //                 clump.push(occs[j]);
                //             }
                //         }
                //     }*/
                //     if (clump.length > 0) {

                //       var newNode = {virNum: that.virNum, id: clump[0].id, x: clump[0].x, y: clump[0].y, r: o.size};
                //       that.virnum += 1;
                        

                //         clump.forEach(function(c) {
                //             //remove from that.nodes; remove from focus.occupants
                //             var ind = pandemix.indexOf(that.nodes, c, function(x) {return x.virNum; }, function(x) {return x.virNum; });
                //             if (ind > -1) {
                //                 that.nodes.splice(ind);
                //             }
                //             /*ind = pandemix.indexOf(occs, c, function(x) {return x.virNum; }, function(x) {return x.virNum; });
                //             if (ind > -1) {
                //                 occs.splice(ind);
                //             }*/
                //         });

                //         that.nodes.push(newNode);
                        
                //         o.occupants = [];
                //         o.occupants.push(that.nodes[that.nodes.length - 1]);
                //     }
                      
                // });




                // var newNodes = [];
                // that.nodes = [];
                // for (var i = 0; i < that.currNodes.length; i += 1) {
                //     var nd = that.currNodes[i];
                //     if (nd[0].children) {
                //         for (var a = 0; a < nd[0].children.length; a += 1) {
                //             newNodes.push([nd[0].children[a], nd[0].location]);
                //         }
                //     }
                //     for (var e = 0; e < that.foci.length; e += 1) {
                //         if (that.foci[e].name === nd[0].location) {//find the location to where the particle needs to go
                //             var initLoc = that.project(that.centroids[nd[1]]);

                //             that.nodes.push({virNum: that.virNum, id: e, x: initLoc[0], y: initLoc[1], r: that.radius}); //id is which focus the node will go to        centroids(that.currNodes[i].parent)
                //             that.virNum += 1;
                //             that.foci[e].occupants.push(that.nodes[that.nodes.length - 1]);
                //             that.foci[e].size += 1;
                //             break;
                //         }
                //     }
                // }



            // for (var i = 0; i < that.currNodes.length; i += 1) {
                //     var nd = that.currNodes[i];
                //     for (a = 0; a < that.foci.length; a += 1) {
                //         if (that.foci[a].name === nd[0].location) {//find the location to where the particle needs to go
                //             var initLoc = that.project(that.centroids[nd[1]]);

                //             if (nd.children) {
                //                 for (var a = 0; a < nd.children.length; a += 1) {
                //                     newNodes.push(nd.children[a]);
                //                 }
                //             }

                //             that.nodes.push({virNum: that.virNum, id: a, x: initLoc[0], y: initLoc[1], r: that.radius}); //id is which focus the node will go to        centroids(that.currNodes[i].parent)
                //             that.virNum += 1;
                //             that.foci[a].occupants.push(that.nodes[that.nodes.length - 1]);
                //             that.foci[a].size += 1;
                //             break;
                //         }
                //     }
                // }

                // console.log(newNodes.length);
                // if (newNodes.length === 0) {
                //     clearInterval(that.intervalID);
                // }
                // that.currNodes = newNodes;  


