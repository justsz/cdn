(function() {

    pandemix.map.bubbleChartLayer = L.Class.extend({
        svg: undefined,

        g: undefined,

        bounds: undefined,

        tree: undefined,

        force: undefined,

        nodes: undefined,

        foci: undefined,

        centroids: undefined,

        project: undefined,

        fill: d3.scale.category10(),    //category 20

        color: undefined,

        sizeModifier: undefined,

        virNum: 0,

        intervalID: undefined,

        initialize: function (args) {
            var that = this;
            that.map = args.map;
            that.tree = args.tree;
            that.project = args.project;
            that.centroids = args.centroids;
            that.color = args.color;
            that.foci = [];
            that.bounds = args.bounds; //[[-180, -90], [180, 90]];

            that.prevData = {};
            

            // create a DOM element and put it into one of the map panes
            that.el = L.DomUtil.create('div', 'bubbleChartLayer leaflet-zoom-hide');

            that.svg = d3.select(that.el).append("svg");
            that.svg.on("mousedown", function() {event.preventDefault(); });
            that.g = that.svg.append("g");

            that.nodes = [];

            that.force = d3.layout.force()
                .nodes(that.nodes)
                .links([])
                .gravity(0)
                .charge(function(d) {return -1 * Math.floor(Math.sqrt(d.size * that.sizeModifier)); });
                //.friction(0.5); 


            that.force.on("tick", function(e) {
              // Push nodes toward their designated focus.
              var k = 0.1 * e.alpha;
              that.nodes.forEach(function(o, i) {
                //if ( Math.sqrt((that.foci[o.id].y - o.y) * (that.foci[o.id].y - o.y) + (that.foci[o.id].x - o.x) * (that.foci[o.id].x - o.x)) > o.r ) {
                    o.y += (that.foci[o.id].y - o.y) * k;
                    o.x += (that.foci[o.id].x - o.x) * k;
                //}
              });

              that.g.selectAll("circle.bubble")
                  .attr("cx", function(d) {return d.x; })
                  .attr("cy", function(d) {return d.y; });
            });

        },

        timeSlideUpdate: function(filteredLinks) {
            var that = this;
            var a;
            
            var newNodes = [];
            var data = {};


            //parse filtered links, count up virus particles at each site
            filteredLinks.forEach(function(link) {
                var l = link.link;
                var key = [l.target.location, link.treeID];


                if (data.hasOwnProperty(key)) {
                    data[key].size += 1;
                } else {
                    for (a = 0; a < that.foci.length; a += 1) {
                        if (that.foci[a].name === l.target.location) {
                            var initLoc = [];
                            var prevSize = 0;
                            if (that.prevData.hasOwnProperty(key)) {
                                initLoc[0] = that.prevData[key].x;
                                initLoc[1] = that.prevData[key].y;
                                prevSize = that.prevData[key].size;
                            } else {
                                initLoc = that.project(that.centroids[l.target.location]);
                            }
                            data[key] = {key: key, id: a, x: initLoc[0], y: initLoc[1], size: 1, prevSize: prevSize}; //size is number of virus nodes represented by this bubble
                            break;
                        }
                    }
                }
            });

            that.prevData = data;

            //convert data to an array
            for (k in data) {
                if (data.hasOwnProperty(k)) {
                    newNodes.push(data[k]);
                }
            }

            //restart force simulation when new nodes are added
            that.nodes = newNodes;
            that.force.nodes(newNodes);            
            that.force.start();

            //do standard D3 update on the data
            var nodeSel = that.g.selectAll("circle.bubble")
                                .data(that.nodes, function(d) {return d.key});

            nodeSel.exit().transition().attr("r", 0).remove(); //.transition().attr("r", 0)            

            nodeSel.enter()
                   .append("svg:circle")
                   .attr("class", "bubble")
                   .attr("cx", function(d) {return d.x; })
                   .attr("cy", function(d) {return d.y; })
                   .style("fill", function(d) {return that.fill(d.key[1]); }) 
                   .style("stroke", 1)
                   .attr("r", 0);

            nodeSel.transition()
                   .delay(function(d) {return d.prevSize > d.size ? 0 : 250; })
                   .attr("r", function(d) {return Math.sqrt(that.sizeModifier * d.size); });

            

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

            if (that.force) {
                that.force.stop();
            }

            var bottomLeft = that.project(that.bounds[0]),
            topRight = that.project(that.bounds[1]);

            w = topRight[0] - bottomLeft[0];
            h = bottomLeft[1] - topRight[1];

            that.svg .attr("width", w)
                .attr("height", h)
                .style("margin-left", bottomLeft[0] + "px")
                .style("margin-top", topRight[1] + "px");

            that.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

            var prevFoci = that.foci.slice(0);
            //var prevFoci = [];

            that.foci = [];
            for (c in that.centroids) {
                if (that.centroids.hasOwnProperty(c)) {
                    that.foci.push({name: c, x: that.project(that.centroids[c])[0], y: that.project(that.centroids[c])[1]});
                    //prevFoci.push({x: that.map.latLngToContainerPoint([that.centroids(c)[1],that.centroids(c)[0]])[0], y: that.map.latLngToContainerPoint([that.centroids(c)[1],that.centroids(c)[0]])[1]});

                }
            }

            if (that.nodes) {
                that.nodes.forEach(function(n) {
                    n.x += that.foci[n.id].x - prevFoci[n.id].x;
                    n.y += that.foci[n.id].y - prevFoci[n.id].y;
                });
            }

            that.sizeModifier = that.map.getZoom() * that.map.getZoom();

            var bubbles = that.g.selectAll("circle.bubble")
                                .attr("cx", function(d) {return d.x; })
                                .attr("cy", function(d) {return d.y; })
                                .attr("r", function(d) {return Math.sqrt(that.sizeModifier * d.size); });

            if (pandemix.selectedDate) {
                pandemix.callUpdate("timeSlideUpdate");
            }
            
            return [w, h];
        }

    });

})();