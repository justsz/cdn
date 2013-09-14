(function() {
    var defaultColoringFunc = function(d) {
        return d.color;
    };
    var coloringFunc = defaultColoringFunc;

    pandemix.map.virusParticleLayer = L.Class.extend({
        needsCentroids: true,

        needsTrees: true,

        virNum: 0, //used as identification key for virus particles

        initialize: function() {
            //do nothing
        },

        initDraw: function (args) {
            var that = this;
            that.map = args.map;
            that.tree = args.treePanel.treeData.root;
            that.project = args.project;
            that.centroids = args.centroids;
            that.currNodes = [that.tree];
            that.treeID = args.treePanel.panelID;
            that.foci = [];
            that.bounds = args.bounds;
            that.radius = args.radius || 1;
            

            // create a DOM element and put it into one of the map panes
            that.el = L.DomUtil.create('div', 'virusParticleLayer leaflet-zoom-hide');
            d3.select(that.el).style("position", "absolute").style("z-index", args.zIndex);

            that.svg = d3.select(that.el).append("svg");
            that.svg.on("mousedown", function() {d3.event.preventDefault(); });
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

            that.map.getPanes().overlayPane.appendChild(that.el);
            that.svg.style("display", "none");

        },

        timeSlideUpdate: function(filteredLinks, movingForward) {
            var that = this;
            var treeColor = undefined;
            
            var selectedLinks = [];
            var a;

            filteredLinks.forEach(function(d) {
                if (d.treeID === that.treeID) {
                    selectedLinks.push(d.link);
                    treeColor = d.color;
                }
            });

            
            var newNodes = [];

            selectedLinks.forEach(function(l) {
                // var l = l.link;
                var nodeFound = false;
                var initLoc = undefined;
                var srcNode = undefined;
                for (a = 0; a < that.nodes.length; a += 1) {
                    if (that.nodes[a].node === l.target) {
                        nodeFound = true;
                        newNodes.push(that.nodes[a]);
                        break;
                    }
                    if (movingForward && that.nodes[a].node === l.source) {
                        initLoc = [that.nodes[a].x, that.nodes[a].y];
                        srcNode = a;
                    }
                    
                }

                if (!nodeFound) {
                    for (a = 0; a < that.foci.length; a += 1) {
                        if (that.foci[a].name === l.target.location) {
                            if (movingForward && !initLoc) {
                                initLoc = that.project(that.centroids[l.source.location]);
                            } else if (!movingForward) {
                                initLoc = that.project(that.centroids[l.target.location]);
                            }
                            newNodes.push({virNum: that.virNum, id: a, x: initLoc[0], y: initLoc[1], r: that.radius, node: l.target, color: treeColor});
                            that.virNum += 1;
                            break;
                        }
                    }
                }
            });

            that.nodes = newNodes;
            that.force.nodes(newNodes);

            that.force.start();

            var nodeSel = that.g.selectAll("circle.virusParticle")
                                .data(that.nodes, function(d) {return d.virNum});

            nodeSel.exit().remove();

            nodeSel.enter()
                   .append("svg:circle")
                   .attr("class", "virusParticle")
                   .attr("cx", function(d) {return d.x; })
                   .attr("cy", function(d) {return d.y; })
                   .style("fill", coloringFunc) 
                   .style("stroke", 1)
                   .attr("r", function(d) {return d.r; });
        },

        onAdd: function (map) {
            var that = this;
            that.svg.style("display", null)
            map.on('viewreset', that.reset, that);
            that.reset();
        },

        onRemove: function (map) {
            var that = this;
            that.svg.style("display", "none");
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

            that.svg .attr("width", w)
                .attr("height", h)
                .style("margin-left", bottomLeft[0] + "px")
                .style("margin-top", topRight[1] + "px");

            that.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

            if (that.prevZoom) {
                if (that.prevZoom > that.map.getZoom()) {
                    that.radius *= 0.5;
                } else if (that.prevZoom < that.map.getZoom()) {
                    that.radius *= 2;
                }
            } 
            that.prevZoom = that.map.getZoom();

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
        }, 

        traitSelectionUpdate : function() {
            var that = this
                i = 0;
            pandemix.panels.forEach(function(p) {
                if (p.panelType === "treePanel") {
                    i += 1;
                }
            });

            if (i === 1 && pandemix.traitType.toLowerCase() === "location" && pandemix.traitValues) {
                coloringFunc = function(d) {
                    for (i = 0; i < pandemix.traitValues.length; i += 1) {
                        if (d.node.location === pandemix.traitValues[i].name) {
                            return pandemix.traitValues[i].color; 
                        }
                    }
                    return null;
                };
            } else {
                coloringFunc = defaultColoringFunc;
            }
            that.g.selectAll("circle.virusParticle").style("fill", coloringFunc);
        }


    });

})();