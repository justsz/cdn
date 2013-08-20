(function() {
    pandemix.map.centroidLayer = L.Class.extend({
            svg: undefined,

            g: undefined,

            bounds: undefined,

            circles: undefined,

            project: undefined,

            centroids: undefined,

            initialize: function (args) {
                var that = this;
                that.map = args.map;
                that.project = args.project;
                that.bounds = args.bounds;
                that.centroids = args.centroids;

                // create a DOM element and put it into one of the map panes
                that.el = L.DomUtil.create('div', 'centroidLayer leaflet-zoom-hide');  //<<could replace that (And similar) with a D3 method for consistency

                that.svg = d3.select(that.el).append("svg");
                that.svg.on("mousedown", function() {event.preventDefault(); });
                that.g = that.svg.append("g");                

                var circleCoords = [];
                for (c in that.centroids) {
                    if (that.centroids.hasOwnProperty(c)) {
                        circleCoords.push({center : [that.centroids[c][0], that.centroids[c][1]]});
                    }
                }

                that.circles = that.g
                                   .selectAll("circle")
                                   .data(circleCoords)
                                   .enter()
                                   .append("circle");
            },

            onAdd: function (map) {
                var that = this;
                map.getPanes().overlayPane.appendChild(that.el);
                // add a viewreset event listener for updating layer's position, do the latter
                map.on('viewreset', that.reset, that);
                that.reset();
            },

            onRemove: function (map) {
                // remove layer's DOM elements and listeners
                var that = this;
                map.getPanes().overlayPane.removeChild(that.el);
                map.off('viewreset', that.reset, that);
            },

            reset: function () {
                var that = this;

                var bottomLeft = that.project(that.bounds[0]),
                topRight = that.project(that.bounds[1]);

                that.svg .attr("width", Math.abs(topRight[0] - bottomLeft[0]))
                    .attr("height", Math.abs(bottomLeft[1] - topRight[1]))
                    .style("margin-left", bottomLeft[0] + "px")
                    .style("margin-top", topRight[1] + "px");

                var radius = 1 * that.map.getZoom();

                that.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");
                that.circles
                    .attr("cx", function(d) {return that.project(d.center)[0]; })
                    .attr("cy", function(d) {return that.project(d.center)[1]; })
                    .attr("r", radius);

            }
        });

})();






