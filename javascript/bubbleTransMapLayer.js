(function() {

    pandemix.map.bubbleTransLayer = L.Class.extend({
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
            that.el = L.DomUtil.create('div', 'bubbleTransLayer leaflet-zoom-hide');

            that.svg = d3.select(that.el).append("svg");
            that.svg.on("mousedown", function() {event.preventDefault(); });
            that.g = that.svg.append("g");

           // var sizing = that.reset(); //set svg's size and return the size
            that.nodes = [];

            // that.force = d3.layout.force()
            //     .nodes(that.nodes)
            //     .links([])
            //     .gravity(0)
            //     .size(sizing)
            //     .charge(0)
            //     .friction(0.85); 


            // that.force.on("tick", function(e) {
            //   // Push nodes toward their designated focus.
            //   var k = 0.1 * e.alpha;
            //   that.nodes.forEach(function(o, i) {
            //     o.y += (that.foci[o.id].y - o.y) * k;
            //     o.x += (that.foci[o.id].x - o.x) * k;
            //   });

            //   that.g.selectAll("circle.bubbleTrans")
            //       .attr("cx", function(d) { return d.x; })
            //       .attr("cy", function(d) { return d.y; });
            // });
        },


        timeSlideUpdate: function(filteredLinks, movingForward) {
            var that = this;
            var a;            

            var newNodes = [];
            var currNodes = []

            filteredLinks.forEach(function(link) {
                var l = link.link;
                currNodes.push(l.target);
                var nodeFound = false;
                for (a = 0; a < that.nodes.length; a += 1) {
                    if (that.nodes[a] === l.target) {
                        nodeFound = true;
                        break;
                    }
                }

                if (!nodeFound) {
                    var initLoc,
                        targLoc;
                    if (movingForward) {
                        //don't need an animation if target and source are the same
                        if (l.source.location !== l.target.location) {

                                initLoc = that.project(that.centroids[l.source.location]);
                                targLoc = that.project(that.centroids[l.target.location]);
                                newNodes.push({targX: targLoc[0], targY: targLoc[1], initX: initLoc[0], initY: initLoc[1], r: that.radius, treeID: link.treeID});
                        }
                    } else {
                        if (l.target.children) {
                            l.target.children.forEach(function (ch) {
                                if (ch.location !== l.target.location) {
                                    initLoc = that.project(that.centroids[ch.location]);
                                    targLoc = that.project(that.centroids[l.target.location]);
                                    newNodes.push({targX: targLoc[0], targY: targLoc[1], initX: initLoc[0], initY: initLoc[1], r: that.radius, treeID: link.treeID});
                                }
                            });
                        }
                    }

                }
            });

            that.nodes = currNodes;
            //that.force.nodes(newNodes);

            //that.force.start();

            var nodeSel = that.g.selectAll("circle.bubbleTrans")
                                .data(newNodes);

            //create the new particles.. and immediately remove them when finished transitioning
            nodeSel.enter()
                   .append("svg:circle")
                   .attr("class", "bubbleTrans")
                   .attr("cx", function(d) {return d.initX; })
                   .attr("cy", function(d) {return d.initY; })
                   .style("fill", function(d) {return that.fill(d.treeID); }) 
                   .style("stroke", 1)
                   .attr("r", function(d) {return d.r; })
                   .transition().ease("linear").duration(500)
                   .attr("cx", function(d) {return d.targX; })
                   .attr("cy", function(d) {return d.targY; })
                   .remove();
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

            that.svg .attr("width", w)
                .attr("height", h)
                .style("margin-left", bottomLeft[0] + "px")
                .style("margin-top", topRight[1] + "px");

            that.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

            that.radius = 3;

            that.g.selectAll("circle.bubbleTrans").attr("r", that.radius);

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

