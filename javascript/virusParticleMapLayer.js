(function() {
    treestuff.map.virusParticleLayer = L.Class.extend({
        svg: undefined,

        g: undefined,

        bounds: undefined,

        tree: undefined,

        force: undefined,

        node: undefined,

        foci: undefined,

        centroids: undefined,

        currNodes: undefined,

        project: undefined,

        fill: d3.scale.category10(),

        color: undefined,

        radius: undefined,

        initialize: function (args) {
            var that = this;
            that.map = args.map;
            that.tree = args.tree;
            that.project = args.project;
            that.centroids = args.centroids;
            that.currNodes = [[that.tree, that.tree.location]];
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
                .charge(-1);

            that.force.on("tick", function(e) {
              // Push nodes toward their designated focus.
              var k = .1 * e.alpha;
              that.nodes.forEach(function(o, i) {
                o.y += (that.foci[o.id].y - o.y) * k;
                o.x += (that.foci[o.id].x - o.x) * k;
              });

              that.g.selectAll("circle.virusParticle")
                  .attr("cx", function(d) { return d.x; })
                  .attr("cy", function(d) { return d.y; });
            });

            setInterval(function() {
                var newNodes = [];
              for (var i = 0; i < that.currNodes.length; i += 1) {
                var nd = that.currNodes[i];
                if (nd[0].children) {
                    for (var a = 0; a < nd[0].children.length; a += 1) {
                        newNodes.push([nd[0].children[a], nd[0].location]);
                    }
                }
                for (var e = 0; e < that.foci.length; e += 1) {
                    if (that.foci[e].name === nd[0].location) {//find the location to where the particle needs to go
                        var initLoc = that.project(that.centroids[nd[1]]);
                        that.nodes.push({id: e, x: initLoc[0], y: initLoc[1]}); //id is which focus the node will go to        centroids(that.currNodes[i].parent)
                        break;
                    }
                }
                
              }
              console.log("number of virus particles added: " + newNodes.length);
              that.currNodes = newNodes;  

              that.force.start();

              that.g.selectAll("circle.virusParticle")
                  .data(that.nodes)
                .enter().append("svg:circle")
                  .attr("class", "virusParticle")
                  .attr("cx", function(d) { return d.x; })
                  .attr("cy", function(d) { return d.y; })
                  .attr("r", that.radius)
                  .style("fill", that.fill(that.color)) //fill(d.id);
                  .style("stroke", 1)//function(d) { return d3.rgb(fill(d.id)).darker(2); })
                  //.style("stroke-width", 1.5)
                  .call(that.force.drag);

            }, 3000);

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

            that.radius = that.map.getZoom();

            that.g.selectAll("circle.virusParticle").attr("r", that.radius);

            that.foci = [];
            for (c in that.centroids) {
                if (that.centroids.hasOwnProperty(c)) {
                    that.foci.push({name: c, x: that.project(that.centroids[c])[0], y: that.project(that.centroids[c])[1]});
                }
            }

            
            return [w, h];
        }

    });

})();





